import type { D1Database } from "@cloudflare/workers-types";
import { error } from "@sveltejs/kit";

/**
 * このユーザーが閲覧できる会社（発行元）のIDリストを返す。
 * - null = 全社閲覧可（オーナー / デモ / 割当ゼロのメンバー）
 * - string[] = その会社のみ
 */
export async function allowedIssuerIds(
  db: D1Database,
  user: { id: string; role: string } | undefined | null
): Promise<string[] | null> {
  if (!user) return null;
  if (user.role === "owner" || user.role === "demo") return null;
  const { results } = await db
    .prepare("SELECT issuer_id FROM member_issuers WHERE member_id = ?1")
    .bind(user.id)
    .all<{ issuer_id: string }>();
  const ids = (results ?? []).map((r) => r.issuer_id);
  return ids.length ? ids : null; // 割当ゼロ＝全社（後方互換）
}

/** allowed が指定されていて、その会社に含まれなければ false。null は常に true。 */
export function canAccessIssuer(allowed: string[] | null, issuerId: string | null | undefined): boolean {
  if (allowed === null) return true;
  return !!issuerId && allowed.includes(issuerId);
}

/** SQL の `IN (?n, ?n+1, ...)` 断片とバインド値を生成（プレースホルダ開始番号 start）。 */
export function issuerInClause(allowed: string[], col: string, start: number): { sql: string; binds: string[] } {
  const ph = allowed.map((_, i) => `?${start + i}`).join(",");
  return { sql: `${col} IN (${ph})`, binds: allowed };
}

/**
 * 帳票への操作権限を検証。アクセス不可なら 404 を投げる（存在を隠す）。
 * 帳票詳細の各POSTアクション（入金・発行・送付・削除等）の冒頭で呼ぶ。
 */
export async function assertDocAccess(
  db: D1Database,
  user: { id: string; role: string } | undefined | null,
  docId: string
): Promise<void> {
  const allowed = await allowedIssuerIds(db, user);
  if (allowed === null) return;
  const row = await db.prepare("SELECT issuer_id FROM documents WHERE id = ?1").bind(docId).first<{ issuer_id: string }>();
  if (!row || !allowed.includes(row.issuer_id)) throw error(404, "帳票が見つかりません");
}

/** メンバーに割り当てられた会社IDを取得。 */
export async function getMemberIssuers(db: D1Database, memberId: string): Promise<string[]> {
  const { results } = await db
    .prepare("SELECT issuer_id FROM member_issuers WHERE member_id = ?1")
    .bind(memberId)
    .all<{ issuer_id: string }>();
  return (results ?? []).map((r) => r.issuer_id);
}

/** メンバーの会社割当を置き換える。 */
export async function setMemberIssuers(db: D1Database, memberId: string, issuerIds: string[]): Promise<void> {
  await db.prepare("DELETE FROM member_issuers WHERE member_id = ?1").bind(memberId).run();
  for (const iid of issuerIds) {
    await db
      .prepare("INSERT OR IGNORE INTO member_issuers (member_id, issuer_id) VALUES (?1, ?2)")
      .bind(memberId, iid)
      .run();
  }
}

/** メンバーを会社に追加（閲覧権限を1件付与）。 */
export async function addMemberIssuer(db: D1Database, memberId: string, issuerId: string): Promise<void> {
  await db
    .prepare("INSERT OR IGNORE INTO member_issuers (member_id, issuer_id) VALUES (?1, ?2)")
    .bind(memberId, issuerId)
    .run();
}

/** メンバーを会社から外す（閲覧権限を1件解除）。 */
export async function removeMemberIssuer(db: D1Database, memberId: string, issuerId: string): Promise<void> {
  await db
    .prepare("DELETE FROM member_issuers WHERE member_id = ?1 AND issuer_id = ?2")
    .bind(memberId, issuerId)
    .run();
}
