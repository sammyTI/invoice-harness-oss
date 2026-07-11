import type { D1Database } from "@cloudflare/workers-types";

const ITER = 100_000;

function bytesToHex(b: Uint8Array): string {
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
}
function hexToBytes(h: string): Uint8Array {
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function randomToken(len = 32): string {
  const b = new Uint8Array(len);
  crypto.getRandomValues(b);
  return bytesToHex(b);
}

/** 読みやすい初期パスワード（紛らわしい文字を除外）。 */
export function randomPassword(len = 12): string {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const b = new Uint8Array(len);
  crypto.getRandomValues(b);
  let out = "";
  for (let i = 0; i < len; i++) out += chars[b[i] % chars.length];
  return out;
}

export async function hashPassword(password: string, saltHex?: string): Promise<{ hash: string; salt: string }> {
  const salt = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" }, key, 256);
  return { hash: bytesToHex(new Uint8Array(bits)), salt: bytesToHex(salt) };
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function verifyPassword(password: string, saltHex: string, hashHex: string): Promise<boolean> {
  const { hash } = await hashPassword(password, saltHex);
  return timingSafeEqual(hash, hashHex);
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  must_change_password: number;
}

export async function createSession(db: D1Database, memberId: string): Promise<string> {
  const id = randomToken(24);
  const now = new Date();
  const created = now.toISOString();
  const expires = new Date(now.getTime() + 30 * 24 * 3600 * 1000).toISOString();
  await db
    .prepare("INSERT INTO sessions (id, member_id, created_at, expires_at) VALUES (?1,?2,?3,?4)")
    .bind(id, memberId, created, expires)
    .run();
  return id;
}

/**
 * メンバーの全セッションを破棄し、現在のブラウザ用に新しいセッションを1件だけ発行する。
 * パスワード変更後に他端末のセッションを無効化する用途（旧セッションの乗っ取り対策）。
 * 戻り値は新セッションのトークン（呼び出し側で cookie を差し替える）。
 */
export async function rotateSessions(db: D1Database, memberId: string): Promise<string> {
  // 既存セッションを全削除してから新規発行する
  await db.prepare("DELETE FROM sessions WHERE member_id = ?1").bind(memberId).run();
  return createSession(db, memberId);
}

export async function getSessionUser(db: D1Database, token: string): Promise<SessionUser | null> {
  const row = await db
    .prepare(
      `SELECT m.id, m.email, m.name, m.role, m.must_change_password, s.expires_at
       FROM sessions s JOIN members m ON m.id = s.member_id
       WHERE s.id = ?1`
    )
    .bind(token)
    .first<SessionUser & { expires_at: string }>();
  if (!row) return null;
  if (row.expires_at < new Date().toISOString()) {
    await deleteSession(db, token);
    return null;
  }
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    must_change_password: row.must_change_password ?? 0,
  };
}

export async function deleteSession(db: D1Database, token: string): Promise<void> {
  await db.prepare("DELETE FROM sessions WHERE id = ?1").bind(token).run();
}

export const SESSION_COOKIE = "ih_session";

// --- 試行制限（総当たり対策） ---
// login_attempts テーブルを流用し、email 単位と ip 単位の二段で判定する。
// login 以外（setup/accept/share）は email カラムに "__setup__" のような識別子キーを入れて分離する。

const ATTEMPT_WINDOW_MIN = 10; // 判定に使う時間窓（分）
const ATTEMPT_LIMIT = 5; // email 単位のロック閾値（回数/10分）
const IP_ATTEMPT_LIMIT = 20; // ip 単位のロック閾値（回数/10分・分散スプレー対策）

/** email を照合・記録・判定で使う正規形（小文字trim）に揃える。大小文字の使い分けによる制限回避を封じる。 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * ログイン試行が多すぎるか判定する。
 * email 単位（5回/10分）に加えて ip 単位（20回/10分）の二段で見る。
 * どちらかの閾値を超えていれば true。email は正規化済み前提。
 */
export async function tooManyAttempts(db: D1Database, email: string, ip: string): Promise<boolean> {
  const byEmail = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM login_attempts
       WHERE email = ?1 AND attempted_at >= datetime('now', ?2)`
    )
    .bind(email, `-${ATTEMPT_WINDOW_MIN} minutes`)
    .first<{ n: number }>();
  if ((byEmail?.n ?? 0) >= ATTEMPT_LIMIT) return true;

  const byIp = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM login_attempts
       WHERE ip = ?1 AND attempted_at >= datetime('now', ?2)`
    )
    .bind(ip, `-${ATTEMPT_WINDOW_MIN} minutes`)
    .first<{ n: number }>();
  return (byIp?.n ?? 0) >= IP_ATTEMPT_LIMIT;
}

/** ログイン失敗を1件記録する。ついでに1日より古い行を掃除する。email は正規化済み前提。 */
export async function recordLoginFailure(db: D1Database, email: string, ip: string): Promise<void> {
  await db
    .prepare("INSERT INTO login_attempts (email, ip, attempted_at) VALUES (?1, ?2, datetime('now'))")
    .bind(email, ip)
    .run();
  // 古い記録は不要なので削除（テーブルの肥大化防止）
  await db.prepare("DELETE FROM login_attempts WHERE attempted_at < datetime('now','-1 day')").run();
}

/** ログイン成功時に、その email の失敗記録をすべて消す。email は正規化済み前提。 */
export async function clearLoginFailures(db: D1Database, email: string): Promise<void> {
  await db.prepare("DELETE FROM login_attempts WHERE email = ?1").bind(email).run();
}

/**
 * 汎用の ip 単位試行制限判定。login_attempts の email カラムに識別子 key を入れて用途を分離する。
 * setup/accept/share など、email を持たないエンドポイントの ip レート制限に使う。
 * 直近10分の (key, ip) 試行が limit 回以上なら true。
 */
export async function tooManyByKey(db: D1Database, key: string, ip: string, limit: number): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM login_attempts
       WHERE email = ?1 AND ip = ?2 AND attempted_at >= datetime('now', ?3)`
    )
    .bind(key, ip, `-${ATTEMPT_WINDOW_MIN} minutes`)
    .first<{ n: number }>();
  return (row?.n ?? 0) >= limit;
}

/** 汎用の試行記録。email カラムに識別子 key を入れて1件記録し、1日より古い行を掃除する。 */
export async function recordAttempt(db: D1Database, key: string, ip: string): Promise<void> {
  await db
    .prepare("INSERT INTO login_attempts (email, ip, attempted_at) VALUES (?1, ?2, datetime('now'))")
    .bind(key, ip)
    .run();
  await db.prepare("DELETE FROM login_attempts WHERE attempted_at < datetime('now','-1 day')").run();
}

/** 汎用の試行記録クリア。成功時に (key, ip) の記録を消す。 */
export async function clearAttempts(db: D1Database, key: string, ip: string): Promise<void> {
  await db.prepare("DELETE FROM login_attempts WHERE email = ?1 AND ip = ?2").bind(key, ip).run();
}
