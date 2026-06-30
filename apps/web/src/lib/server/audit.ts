import type { D1Database } from "@cloudflare/workers-types";

export async function sha256hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** 操作者を取得：ログインユーザー > Cloudflare Access ヘッダ > 'local'。 */
export function getActor(e: {
  locals?: { user?: { email?: string } };
  request?: Request;
}): string {
  return (
    e?.locals?.user?.email ??
    e?.request?.headers?.get("cf-access-authenticated-user-email") ??
    "local"
  );
}

export interface AuditEntryInput {
  actor: string;
  action: string;
  document_id?: string | null;
  summary?: string;
}

/** 監査ログに1件追加（ハッシュチェーン連結）。 */
export async function appendAudit(db: D1Database, e: AuditEntryInput): Promise<void> {
  const created_at = new Date().toISOString();
  const last = await db
    .prepare("SELECT chain_hash FROM audit_log ORDER BY rowid DESC LIMIT 1")
    .first<{ chain_hash: string }>();
  const prev = last?.chain_hash ?? "";
  const payload = JSON.stringify({
    action: e.action,
    document_id: e.document_id ?? null,
    summary: e.summary ?? "",
    actor: e.actor,
    created_at,
  });
  const payload_hash = await sha256hex(payload);
  const chain_hash = await sha256hex(prev + payload_hash);
  await db
    .prepare(
      `INSERT INTO audit_log (id, created_at, actor, action, document_id, summary, payload_hash, prev_hash, chain_hash)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)`
    )
    .bind(
      crypto.randomUUID(),
      created_at,
      e.actor,
      e.action,
      e.document_id ?? null,
      e.summary ?? "",
      payload_hash,
      prev,
      chain_hash
    )
    .run();
}

export interface AuditRow {
  id: string;
  created_at: string;
  actor: string | null;
  action: string;
  document_id: string | null;
  summary: string | null;
  payload_hash: string;
  prev_hash: string | null;
  chain_hash: string;
}

export async function listAudit(db: D1Database, limit = 200): Promise<AuditRow[]> {
  const { results } = await db
    .prepare("SELECT * FROM audit_log ORDER BY rowid DESC LIMIT ?1")
    .bind(limit)
    .all<AuditRow>();
  return results ?? [];
}

export interface VerifyResult {
  ok: boolean;
  count: number;
  brokenAt?: string; // created_at of first broken entry
}

/** ハッシュチェーンを再計算して改ざんを検知する。 */
export async function verifyChain(db: D1Database): Promise<VerifyResult> {
  const { results } = await db
    .prepare("SELECT * FROM audit_log ORDER BY rowid ASC")
    .all<AuditRow>();
  const rows = results ?? [];
  let prev = "";
  for (const r of rows) {
    const payload = JSON.stringify({
      action: r.action,
      document_id: r.document_id ?? null,
      summary: r.summary ?? "",
      actor: r.actor,
      created_at: r.created_at,
    });
    const payload_hash = await sha256hex(payload);
    const chain_hash = await sha256hex(prev + payload_hash);
    if (payload_hash !== r.payload_hash || chain_hash !== r.chain_hash || (r.prev_hash ?? "") !== prev) {
      return { ok: false, count: rows.length, brokenAt: r.created_at };
    }
    prev = r.chain_hash;
  }
  return { ok: true, count: rows.length };
}
