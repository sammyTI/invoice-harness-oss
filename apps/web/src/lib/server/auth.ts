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
