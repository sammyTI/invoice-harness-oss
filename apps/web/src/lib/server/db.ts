import type { D1Database } from "@cloudflare/workers-types";
import {
  computeTotals,
  DEFAULT_SETTINGS,
  DOCUMENT_LABELS,
  formatNumber,
  lineAmount,
  type Client,
  type DocumentLine,
  type DocumentRecord,
  type DocumentType,
  type Issuer,
  type Settings,
  type Totals,
} from "@invoice-harness/shared";
import { appendAudit, sha256hex } from "./audit";
import { randomToken } from "./auth";

export function getDB(platform: App.Platform | undefined): D1Database {
  const db = platform?.env?.DB;
  if (!db) {
    throw new Error(
      "D1 binding 'DB' not found. Run `pnpm db:migrate:local` first, then start the dev server."
    );
  }
  return db;
}

// ---------- settings ----------

interface SettingsRow {
  date_format: string;
  tax_display: string;
  tax_rounding: string;
  amount_rounding: string;
  withholding: string;
  withholding_basis: string;
  invoice_show_transaction_date: number;
  fiscal_month: number;
  accent_color: string;
}

export async function getSettings(db: D1Database): Promise<Settings> {
  const row = await db.prepare("SELECT * FROM settings WHERE id = 'default'").first<SettingsRow>();
  if (!row) return { ...DEFAULT_SETTINGS };
  return {
    date_format: row.date_format as Settings["date_format"],
    tax_display: row.tax_display as Settings["tax_display"],
    tax_rounding: row.tax_rounding as Settings["tax_rounding"],
    amount_rounding: row.amount_rounding as Settings["amount_rounding"],
    withholding: row.withholding as Settings["withholding"],
    withholding_basis: row.withholding_basis as Settings["withholding_basis"],
    invoice_show_transaction_date: row.invoice_show_transaction_date === 1,
    fiscal_month: row.fiscal_month ?? 3,
    accent_color: row.accent_color ?? "#1b59b0",
  };
}

export async function updateSettings(db: D1Database, s: Settings): Promise<void> {
  await db
    .prepare(
      `UPDATE settings SET
        date_format = ?1, tax_display = ?2, tax_rounding = ?3, amount_rounding = ?4,
        withholding = ?5, withholding_basis = ?6, invoice_show_transaction_date = ?7, fiscal_month = ?8,
        accent_color = ?9
       WHERE id = 'default'`
    )
    .bind(
      s.date_format,
      s.tax_display,
      s.tax_rounding,
      s.amount_rounding,
      s.withholding,
      s.withholding_basis,
      s.invoice_show_transaction_date ? 1 : 0,
      s.fiscal_month,
      s.accent_color
    )
    .run();
}

// ---------- 備考テンプレート ----------

export interface NoteTemplate {
  id: string;
  name: string;
  body: string;
  is_default?: number;
}

export async function listNoteTemplates(db: D1Database): Promise<NoteTemplate[]> {
  const { results } = await db.prepare("SELECT id,name,body,is_default FROM note_templates ORDER BY is_default DESC, created_at").all<NoteTemplate>();
  return results ?? [];
}

export async function createNoteTemplate(db: D1Database, name: string, body: string): Promise<void> {
  await db.prepare("INSERT INTO note_templates (id,name,body) VALUES (?1,?2,?3)").bind(crypto.randomUUID(), name, body).run();
}

export async function deleteNoteTemplate(db: D1Database, id: string): Promise<void> {
  await db.prepare("DELETE FROM note_templates WHERE id = ?1").bind(id).run();
}

/** 既定の備考テンプレートを1件だけ指定する（他は解除）。id 未指定/空なら全解除。 */
export async function setDefaultNoteTemplate(db: D1Database, id: string): Promise<void> {
  await db.prepare("UPDATE note_templates SET is_default = 0").run();
  if (id) await db.prepare("UPDATE note_templates SET is_default = 1 WHERE id = ?1").bind(id).run();
}

/** 既定の備考テンプレート本文（なければ空文字）。 */
export async function getDefaultNoteBody(db: D1Database): Promise<string> {
  const r = await db.prepare("SELECT body FROM note_templates WHERE is_default = 1 LIMIT 1").first<{ body: string }>();
  return r?.body ?? "";
}

// ---------- 計上区分（部門・事業部） ----------

export interface Division {
  id: string;
  name: string;
  sort: number;
  issuer_id: string | null;
}

export async function listDivisions(db: D1Database): Promise<Division[]> {
  const { results } = await db.prepare("SELECT id,name,sort,issuer_id FROM divisions ORDER BY sort, created_at").all<Division>();
  return results ?? [];
}

export async function createDivision(db: D1Database, name: string, issuerId: string | null): Promise<void> {
  await db.prepare("INSERT INTO divisions (id,name,sort,issuer_id) VALUES (?1,?2,?3,?4)").bind(crypto.randomUUID(), name, Date.now() % 100000, issuerId).run();
}

export async function deleteDivision(db: D1Database, id: string): Promise<void> {
  // 区分を削除しても帳票は残す（割当を外す）
  await db.prepare("UPDATE documents SET division_id = NULL WHERE division_id = ?1").bind(id).run();
  await db.prepare("DELETE FROM divisions WHERE id = ?1").bind(id).run();
}

// ---------- メールテンプレート ----------

export interface EmailTemplate {
  key: string;
  subject: string;
  body: string;
}

export async function listEmailTemplates(db: D1Database): Promise<EmailTemplate[]> {
  const { results } = await db.prepare("SELECT key,subject,body FROM email_templates ORDER BY key").all<EmailTemplate>();
  return results ?? [];
}

export async function getEmailTemplate(db: D1Database, key: string): Promise<EmailTemplate | null> {
  return (await db.prepare("SELECT key,subject,body FROM email_templates WHERE key = ?1").bind(key).first<EmailTemplate>()) ?? null;
}

export async function updateEmailTemplate(db: D1Database, key: string, subject: string, body: string): Promise<void> {
  await db
    .prepare("INSERT INTO email_templates (key,subject,body) VALUES (?1,?2,?3) ON CONFLICT(key) DO UPDATE SET subject=?2, body=?3")
    .bind(key, subject, body)
    .run();
}

// ---------- 帳票テンプレート（種別ごと既定備考） ----------

export async function listDocTemplates(db: D1Database): Promise<Record<string, string>> {
  const { results } = await db.prepare("SELECT type, default_notes FROM doc_templates").all<{ type: string; default_notes: string | null }>();
  const map: Record<string, string> = {};
  for (const r of results ?? []) map[r.type] = r.default_notes ?? "";
  return map;
}

export async function getDocDefaultNotes(db: D1Database, type: DocumentType): Promise<string> {
  const r = await db.prepare("SELECT default_notes FROM doc_templates WHERE type = ?1").bind(type).first<{ default_notes: string | null }>();
  return r?.default_notes ?? "";
}

export async function setDocTemplate(db: D1Database, type: DocumentType, notes: string): Promise<void> {
  await db
    .prepare("INSERT INTO doc_templates (type, default_notes) VALUES (?1,?2) ON CONFLICT(type) DO UPDATE SET default_notes=?2")
    .bind(type, notes)
    .run();
}

/** 送付済みにする（送付日時を記録）。 */
export async function markSent(db: D1Database, id: string, when: string, actor = "local"): Promise<void> {
  await db
    .prepare("UPDATE documents SET status = 'sent', sent_at = ?2 WHERE id = ?1 AND status != 'paid'")
    .bind(id, when)
    .run();
  await appendAudit(db, { actor, action: "send", document_id: id, summary: "送付済みに更新" });
}

/** 入金状況を再計算（合計到達で入金済、未達なら送付済/発行済へ戻す）。 */
async function recomputePaid(db: D1Database, id: string): Promise<void> {
  const d = await db
    .prepare("SELECT total, sent_at, locked FROM documents WHERE id = ?1")
    .bind(id)
    .first<{ total: number; sent_at: string | null; locked: number }>();
  if (!d) return;
  const p = await db
    .prepare("SELECT COALESCE(SUM(amount),0) AS s, MAX(paid_date) AS last FROM payments WHERE document_id = ?1")
    .bind(id)
    .first<{ s: number; last: string | null }>();
  const sum = p?.s ?? 0;
  const fullyPaid = d.total > 0 && sum >= d.total;
  const status = fullyPaid ? "paid" : d.sent_at ? "sent" : d.locked ? "issued" : "draft";
  await db
    .prepare("UPDATE documents SET status = ?2, paid_at = ?3 WHERE id = ?1")
    .bind(id, status, fullyPaid ? p?.last ?? null : null)
    .run();
}

/** 入金を1件記録（部分・複数回に対応）。 */
export async function markPaid(
  db: D1Database,
  id: string,
  paidDate: string,
  amount: number,
  method: string | null,
  actor = "local",
  reference: string | null = null
): Promise<void> {
  await db
    .prepare("INSERT INTO payments (id, document_id, paid_date, amount, method, reference) VALUES (?1,?2,?3,?4,?5,?6)")
    .bind(crypto.randomUUID(), id, paidDate, amount, method, reference)
    .run();
  await recomputePaid(db, id);
  await appendAudit(db, { actor, action: "pay", document_id: id, summary: `入金 ${amount} を記録` });
}

export async function deletePayment(db: D1Database, paymentId: string, actor = "local"): Promise<void> {
  const row = await db
    .prepare("SELECT document_id, amount FROM payments WHERE id = ?1")
    .bind(paymentId)
    .first<{ document_id: string; amount: number }>();
  if (!row) return;
  await db.prepare("DELETE FROM payments WHERE id = ?1").bind(paymentId).run();
  await recomputePaid(db, row.document_id);
  await appendAudit(db, { actor, action: "pay", document_id: row.document_id, summary: `入金 ${row.amount} を取消` });
}

// ---------- 品目マスタ ----------

export interface Item {
  id: string;
  name: string;
  unit_price: number;
  tax_rate: number;
  unit: string;
}

export async function listItems(db: D1Database): Promise<Item[]> {
  const { results } = await db.prepare("SELECT * FROM items ORDER BY created_at DESC").all<Item>();
  return results ?? [];
}

export async function createItem(db: D1Database, it: Omit<Item, "id">): Promise<void> {
  await db
    .prepare("INSERT INTO items (id, name, unit_price, tax_rate, unit) VALUES (?1,?2,?3,?4,?5)")
    .bind(crypto.randomUUID(), it.name, it.unit_price, it.tax_rate, it.unit)
    .run();
}

export async function updateItem(db: D1Database, id: string, it: Omit<Item, "id">): Promise<void> {
  await db
    .prepare("UPDATE items SET name=?2, unit_price=?3, tax_rate=?4, unit=?5 WHERE id=?1")
    .bind(id, it.name, it.unit_price, it.tax_rate, it.unit)
    .run();
}

export async function deleteItem(db: D1Database, id: string): Promise<void> {
  await db.prepare("DELETE FROM items WHERE id = ?1").bind(id).run();
}

// ---------- メンバー（権限） ----------

export async function addMember(db: D1Database, name: string, email: string | null, role: string): Promise<void> {
  await db
    .prepare("INSERT INTO members (id, name, email, role) VALUES (?1,?2,?3,?4)")
    .bind(crypto.randomUUID(), name, email, role)
    .run();
}

export async function deleteMember(db: D1Database, id: string): Promise<void> {
  await db.prepare("DELETE FROM members WHERE id = ?1").bind(id).run();
}

/** 有効なオーナー数。最後のオーナーの降格/削除を防ぐ判定に使う。 */
export async function countOwners(db: D1Database): Promise<number> {
  const r = await db.prepare("SELECT COUNT(*) AS n FROM members WHERE role='owner' AND status='active'").first<{ n: number }>();
  return r?.n ?? 0;
}

/** メンバーの名前・メール・権限を更新。 */
export async function updateMember(
  db: D1Database,
  id: string,
  f: { name: string; email: string | null; role: string }
): Promise<void> {
  await db
    .prepare("UPDATE members SET name=?2, email=?3, role=?4 WHERE id=?1")
    .bind(id, f.name, f.email, f.role)
    .run();
}

// ---------- API トークン（MCP / 外部AI連携） ----------

export interface ApiTokenRow {
  id: string;
  name: string | null;
  created_at: string;
  last_used_at: string | null;
}

export async function listApiTokens(db: D1Database): Promise<ApiTokenRow[]> {
  const { results } = await db
    .prepare("SELECT id, name, created_at, last_used_at FROM api_tokens ORDER BY created_at DESC")
    .all<ApiTokenRow>();
  return results ?? [];
}

/** 新規トークンを発行し、平文を返す（保存はハッシュのみ）。 */
export async function createApiToken(db: D1Database, name: string): Promise<string> {
  const raw = "iht_" + randomToken(24);
  const hash = await sha256hex(raw);
  await db
    .prepare("INSERT INTO api_tokens (id, name, token_hash, created_at) VALUES (?1,?2,?3,?4)")
    .bind(crypto.randomUUID(), name, hash, new Date().toISOString())
    .run();
  return raw;
}

export async function deleteApiToken(db: D1Database, id: string): Promise<void> {
  await db.prepare("DELETE FROM api_tokens WHERE id = ?1").bind(id).run();
}

export async function verifyApiToken(db: D1Database, raw: string): Promise<boolean> {
  if (!raw) return false;
  const hash = await sha256hex(raw);
  const row = await db.prepare("SELECT id FROM api_tokens WHERE token_hash = ?1").bind(hash).first<{ id: string }>();
  if (!row) return false;
  await db.prepare("UPDATE api_tokens SET last_used_at = ?2 WHERE id = ?1").bind(row.id, new Date().toISOString()).run();
  return true;
}

// ---------- 送信履歴 ----------

export interface EmailLogRow {
  id: string;
  created_at: string;
  document_id: string | null;
  recipient: string | null;
  subject: string | null;
  kind: string | null;
  ok: number;
  detail: string | null;
}

export async function logEmail(
  db: D1Database,
  e: { document_id?: string | null; recipient: string; subject: string; kind: string; ok: boolean; detail?: string }
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO email_log (id, created_at, document_id, recipient, subject, kind, ok, detail) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)"
    )
    .bind(crypto.randomUUID(), new Date().toISOString(), e.document_id ?? null, e.recipient, e.subject, e.kind, e.ok ? 1 : 0, e.detail ?? null)
    .run();
}

export async function listEmailLog(db: D1Database, limit = 200): Promise<EmailLogRow[]> {
  const { results } = await db
    .prepare("SELECT * FROM email_log ORDER BY rowid DESC LIMIT ?1")
    .bind(limit)
    .all<EmailLogRow>();
  return results ?? [];
}

// ---------- バックアップ（JSON 入出力） ----------

const BACKUP_TABLES = [
  "issuers",
  "clients",
  "items",
  "divisions",
  "documents",
  "document_lines",
  "payments",
  "settings",
  "note_templates",
  "email_templates",
  "doc_templates",
  "sequences",
] as const;

export async function dumpAll(db: D1Database): Promise<Record<string, unknown[]>> {
  const out: Record<string, unknown[]> = {};
  for (const t of BACKUP_TABLES) {
    const { results } = await db.prepare(`SELECT * FROM ${t}`).all();
    out[t] = results ?? [];
  }
  return out;
}

export async function restoreAll(db: D1Database, data: Record<string, Record<string, unknown>[]>): Promise<void> {
  for (const t of BACKUP_TABLES) {
    const rows = data[t];
    if (!Array.isArray(rows)) continue;
    await db.prepare(`DELETE FROM ${t}`).run();
    for (const row of rows) {
      const cols = Object.keys(row);
      if (!cols.length) continue;
      const placeholders = cols.map((_, i) => `?${i + 1}`).join(",");
      await db
        .prepare(`INSERT OR REPLACE INTO ${t} (${cols.join(",")}) VALUES (${placeholders})`)
        .bind(...cols.map((c) => row[c] as never))
        .run();
    }
  }
}

// ---------- 取引明細（銀行・カード）と消込 ----------

export interface BankTxn {
  id: string;
  txn_date: string;
  description: string | null;
  amount: number;
  account: string | null;
  source: string;
  external_id: string | null;
  status: string;
  matched_document_id: string | null;
}

export interface TxnInput {
  txn_date: string;
  description?: string | null;
  amount: number;
  account?: string | null;
  source?: string;
  external_id?: string | null;
}

/** 明細を取り込み（external_id があれば重複スキップ）。取り込んだ件数を返す。 */
export async function importTransactions(db: D1Database, rows: TxnInput[]): Promise<number> {
  let n = 0;
  for (const r of rows) {
    if (!r.txn_date || !Number.isFinite(r.amount)) continue;
    if (r.external_id) {
      const dup = await db
        .prepare("SELECT id FROM bank_transactions WHERE external_id = ?1")
        .bind(r.external_id)
        .first<{ id: string }>();
      if (dup) continue;
    }
    await db
      .prepare(
        "INSERT INTO bank_transactions (id,txn_date,description,amount,account,source,external_id) VALUES (?1,?2,?3,?4,?5,?6,?7)"
      )
      .bind(
        crypto.randomUUID(),
        r.txn_date,
        r.description ?? null,
        Math.round(r.amount),
        r.account ?? null,
        r.source ?? "csv",
        r.external_id ?? null
      )
      .run();
    n++;
  }
  return n;
}

export async function listTransactions(db: D1Database, status?: string): Promise<BankTxn[]> {
  const stmt = status
    ? db.prepare("SELECT * FROM bank_transactions WHERE status = ?1 ORDER BY txn_date DESC, created_at DESC").bind(status)
    : db.prepare("SELECT * FROM bank_transactions ORDER BY txn_date DESC, created_at DESC");
  const { results } = await stmt.all<BankTxn>();
  return results ?? [];
}

export interface MatchCandidate {
  id: string;
  number: string;
  client_name: string;
  total: number;
  balance: number;
  issue_date: string;
  score: number;
}

/** 入金明細に対する未入金請求書のマッチ候補（金額・取引先名・日付でスコア）。 */
export async function matchCandidates(db: D1Database, txn: BankTxn, allowed?: string[] | null): Promise<MatchCandidate[]> {
  if (txn.amount <= 0) return []; // 入金のみ対象
  let issuerCond = "";
  const binds: string[] = [];
  if (allowed && allowed.length) {
    issuerCond = ` AND d.issuer_id IN (${allowed.map((_, idx) => `?${1 + idx}`).join(",")})`;
    binds.push(...allowed);
  }
  const { results } = await db
    .prepare(
      `SELECT d.id, d.number, d.total, d.issue_date, c.name AS client_name,
              COALESCE((SELECT SUM(amount) FROM payments p WHERE p.document_id=d.id),0) AS paid
       FROM documents d JOIN clients c ON c.id=d.client_id
       WHERE d.type='invoice' AND d.status != 'paid' AND d.status != 'canceled'${issuerCond}`
    )
    .bind(...binds)
    .all<{ id: string; number: string; total: number; issue_date: string; client_name: string; paid: number }>();
  const desc = (txn.description ?? "").replace(/\s|　/g, "");
  const cands = (results ?? []).map((r) => {
    const balance = r.total - r.paid;
    let score = 0;
    if (balance === txn.amount) score += 60; // 残額完全一致
    else if (Math.abs(balance - txn.amount) <= Math.max(50, balance * 0.01)) score += 35;
    // 取引先名が摘要に含まれる（記号/法人格を除いて部分照合）
    const cn = r.client_name.replace(/(株式会社|合同会社|有限会社|\(|\)|（|）|\s|　)/g, "");
    if (cn && desc.includes(cn.slice(0, Math.min(cn.length, 6)))) score += 30;
    // 発行日が明細日より前
    if (r.issue_date <= txn.txn_date) score += 10;
    return { id: r.id, number: r.number, client_name: r.client_name, total: r.total, balance, issue_date: r.issue_date, score };
  });
  return cands.filter((c) => c.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
}

/** 明細を請求書に紐づけて消込（入金記録＋明細を matched に）。 */
export async function reconcile(db: D1Database, txnId: string, documentId: string, actor = "local"): Promise<void> {
  const txn = await db.prepare("SELECT * FROM bank_transactions WHERE id = ?1").bind(txnId).first<BankTxn>();
  if (!txn) return;
  await markPaid(db, documentId, txn.txn_date, Math.abs(txn.amount), txn.description ?? "口座明細", actor, txn.external_id ?? null);
  await db
    .prepare("UPDATE bank_transactions SET status='matched', matched_document_id=?2 WHERE id=?1")
    .bind(txnId, documentId)
    .run();
}

export async function ignoreTransaction(db: D1Database, txnId: string): Promise<void> {
  await db.prepare("UPDATE bank_transactions SET status='ignored' WHERE id=?1").bind(txnId).run();
}

export async function unmatchTransaction(db: D1Database, txnId: string): Promise<void> {
  await db.prepare("UPDATE bank_transactions SET status='unmatched', matched_document_id=NULL WHERE id=?1").bind(txnId).run();
}

// ---------- 検索（電帳法 検索要件: 取引先・日付・金額） ----------

export interface SearchFilters {
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number | null;
  amountMax?: number | null;
}

export async function searchDocuments(db: D1Database, f: SearchFilters, allowed?: string[] | null): Promise<DocumentListRow[]> {
  const where: string[] = [];
  const binds: (string | number)[] = [];
  let i = 1;
  if (allowed && allowed.length) {
    const ph = allowed.map((iid) => {
      binds.push(iid);
      return `?${i++}`;
    });
    where.push(`d.issuer_id IN (${ph.join(",")})`);
  }
  if (f.q) {
    where.push(`(c.name LIKE ?${i} OR d.number LIKE ?${i} OR d.subject LIKE ?${i})`);
    binds.push(`%${f.q}%`);
    i++;
  }
  if (f.dateFrom) {
    where.push(`d.issue_date >= ?${i}`);
    binds.push(f.dateFrom);
    i++;
  }
  if (f.dateTo) {
    where.push(`d.issue_date <= ?${i}`);
    binds.push(f.dateTo);
    i++;
  }
  if (f.amountMin != null) {
    where.push(`d.total >= ?${i}`);
    binds.push(f.amountMin);
    i++;
  }
  if (f.amountMax != null) {
    where.push(`d.total <= ?${i}`);
    binds.push(f.amountMax);
    i++;
  }
  const sql = `SELECT d.id,d.type,d.number,d.status,d.issue_date,d.total,c.name AS client_name
       FROM documents d JOIN clients c ON c.id=d.client_id
       ${where.length ? "WHERE " + where.join(" AND ") : ""}
       ORDER BY d.issue_date DESC, d.created_at DESC LIMIT 500`;
  const { results } = await db.prepare(sql).bind(...binds).all<DocumentListRow>();
  return results ?? [];
}

// ---------- masters ----------

export async function listIssuers(db: D1Database): Promise<Issuer[]> {
  const { results } = await db.prepare("SELECT * FROM issuers ORDER BY created_at").all<Issuer>();
  return results ?? [];
}

export interface IssuerInput {
  name: string;
  registration_number: string | null;
  person_name: string | null;
  postal_code: string | null;
  address: string | null;
  tel: string | null;
  email: string | null;
  bank_info: string | null;
}

export async function updateIssuer(db: D1Database, id: string, f: IssuerInput): Promise<void> {
  await db
    .prepare(
      `UPDATE issuers SET name=?2, registration_number=?3, postal_code=?4, address=?5, tel=?6, email=?7, bank_info=?8, person_name=?9 WHERE id=?1`
    )
    .bind(id, f.name, f.registration_number, f.postal_code, f.address, f.tel, f.email, f.bank_info, f.person_name)
    .run();
}

export async function createIssuer(db: D1Database, f: IssuerInput): Promise<string> {
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO issuers (id,name,registration_number,postal_code,address,tel,email,bank_info,person_name)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)`
    )
    .bind(id, f.name, f.registration_number, f.postal_code, f.address, f.tel, f.email, f.bank_info, f.person_name)
    .run();
  return id;
}

export async function setIssuerAsset(
  db: D1Database,
  id: string,
  field: "logo_key" | "seal_key",
  value: string
): Promise<void> {
  const col = field === "logo_key" ? "logo_key" : "seal_key";
  await db.prepare(`UPDATE issuers SET ${col} = ?2 WHERE id = ?1`).bind(id, value).run();
}

export async function listClients(db: D1Database): Promise<Client[]> {
  const { results } = await db.prepare("SELECT * FROM clients ORDER BY created_at").all<Client>();
  return results ?? [];
}

export async function getClient(db: D1Database, id: string): Promise<Client | null> {
  return (await db.prepare("SELECT * FROM clients WHERE id = ?1").bind(id).first<Client>()) ?? null;
}

export interface ClientInput {
  name: string;
  honorific: string;
  contact: string | null;
  postal_code: string | null;
  address: string | null;
  email: string | null;
}

export async function updateClient(db: D1Database, id: string, c: ClientInput): Promise<void> {
  await db
    .prepare("UPDATE clients SET name=?2, honorific=?3, contact=?4, postal_code=?5, address=?6, email=?7 WHERE id=?1")
    .bind(id, c.name, c.honorific, c.contact, c.postal_code, c.address, c.email)
    .run();
}

export interface Member {
  id: string;
  name: string;
  email: string | null;
  role: string;
  status: string;
  invite_token: string | null;
  must_change_password?: number;
  password_hash?: string | null;
  salt?: string | null;
}

export async function listMembers(db: D1Database): Promise<Member[]> {
  const { results } = await db
    .prepare("SELECT id,name,email,role,status,invite_token,must_change_password FROM members ORDER BY created_at")
    .all<Member>();
  return results ?? [];
}

/** 初期パスワード付きメンバーを作成（active・初回ログインでパスワード変更を強制）。 */
export async function createMemberWithPassword(
  db: D1Database,
  name: string,
  email: string,
  role: string,
  hash: string,
  salt: string
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO members (id,name,email,role,status,password_hash,salt,must_change_password) VALUES (?1,?2,?3,?4,'active',?5,?6,1)"
    )
    .bind(crypto.randomUUID(), name, email, role, hash, salt)
    .run();
}

/** 本人がパスワードを設定（must_change_password を解除）。 */
export async function setMemberPassword(db: D1Database, id: string, hash: string, salt: string): Promise<void> {
  await db
    .prepare("UPDATE members SET password_hash=?2, salt=?3, must_change_password=0 WHERE id=?1")
    .bind(id, hash, salt)
    .run();
}

export async function countActiveMembers(db: D1Database): Promise<number> {
  const r = await db
    .prepare("SELECT COUNT(*) AS n FROM members WHERE status = 'active' AND password_hash IS NOT NULL")
    .first<{ n: number }>();
  return r?.n ?? 0;
}

export async function getMemberByEmail(db: D1Database, email: string): Promise<Member | null> {
  // パスワード設定済み（ログイン可能）の行を優先
  return (
    (await db
      .prepare(
        "SELECT * FROM members WHERE email = ?1 ORDER BY (CASE WHEN password_hash IS NOT NULL THEN 0 ELSE 1 END) LIMIT 1"
      )
      .bind(email)
      .first<Member>()) ?? null
  );
}

export async function getMemberByToken(db: D1Database, token: string): Promise<Member | null> {
  return (await db.prepare("SELECT * FROM members WHERE invite_token = ?1").bind(token).first<Member>()) ?? null;
}

/** 初回オーナー作成（パスワード付き・active）。 */
export async function createOwner(
  db: D1Database,
  name: string,
  email: string,
  hash: string,
  salt: string
): Promise<string> {
  const id = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO members (id,name,email,role,status,password_hash,salt) VALUES (?1,?2,?3,'owner','active',?4,?5)"
    )
    .bind(id, name, email, hash, salt)
    .run();
  return id;
}

/** 招待メンバー作成（status=invited, トークン付き）。 */
export async function createInvitedMember(
  db: D1Database,
  name: string,
  email: string,
  role: string,
  token: string
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO members (id,name,email,role,status,invite_token,invited_at) VALUES (?1,?2,?3,?4,'invited',?5,?6)"
    )
    .bind(crypto.randomUUID(), name, email, role, token, new Date().toISOString())
    .run();
}

/** 招待受諾：パスワードを設定して active 化。 */
export async function activateMember(db: D1Database, id: string, hash: string, salt: string): Promise<void> {
  await db
    .prepare("UPDATE members SET password_hash=?2, salt=?3, status='active', invite_token=NULL WHERE id=?1")
    .bind(id, hash, salt)
    .run();
}

// ---------- documents ----------

export interface DocumentListRow {
  id: string;
  type: DocumentType;
  number: string;
  status: string;
  issue_date: string;
  due_date: string | null;
  locked: number;
  total: number;
  client_name: string;
  issuer_id: string;
  division_id: string | null;
  division_name: string | null;
}

export async function listDocuments(
  db: D1Database,
  type?: DocumentType,
  allowed?: string[] | null
): Promise<DocumentListRow[]> {
  const base = `SELECT d.id, d.type, d.number, d.status, d.issue_date, d.due_date, d.locked, d.total, c.name AS client_name,
       d.issuer_id, d.division_id, dv.name AS division_name
       FROM documents d JOIN clients c ON c.id = d.client_id
       LEFT JOIN divisions dv ON dv.id = d.division_id`;
  const conds: string[] = [];
  const binds: string[] = [];
  if (type) {
    binds.push(type);
    conds.push(`d.type = ?${binds.length}`);
  }
  if (allowed && allowed.length) {
    const ph = allowed.map((iid) => {
      binds.push(iid);
      return `?${binds.length}`;
    });
    conds.push(`d.issuer_id IN (${ph.join(",")})`);
  }
  const where = conds.length ? ` WHERE ${conds.join(" AND ")}` : "";
  const { results } = await db.prepare(`${base}${where} ORDER BY d.created_at DESC`).bind(...binds).all<DocumentListRow>();
  return results ?? [];
}

export interface Payment {
  id: string;
  document_id: string;
  paid_date: string | null;
  amount: number;
  method: string | null;
  reference: string | null;
}

export interface FullDocument {
  doc: DocumentRecord;
  issuer: Issuer;
  client: Client;
  lines: DocumentLine[];
  totals: Totals;
  settings: Settings;
  payments: Payment[];
  paid_total: number;
  balance: number;
}

export async function listPayments(db: D1Database, docId: string): Promise<Payment[]> {
  const { results } = await db
    .prepare("SELECT id,document_id,paid_date,amount,method,reference FROM payments WHERE document_id = ?1 ORDER BY paid_date, created_at")
    .bind(docId)
    .all<Payment>();
  return results ?? [];
}

export async function getDocument(db: D1Database, id: string): Promise<FullDocument | null> {
  const doc = await db.prepare("SELECT * FROM documents WHERE id = ?1").bind(id).first<DocumentRecord>();
  if (!doc) return null;
  const issuer = await db.prepare("SELECT * FROM issuers WHERE id = ?1").bind(doc.issuer_id).first<Issuer>();
  const client = await db.prepare("SELECT * FROM clients WHERE id = ?1").bind(doc.client_id).first<Client>();
  const { results } = await db
    .prepare("SELECT * FROM document_lines WHERE document_id = ?1 ORDER BY position")
    .bind(id)
    .all<DocumentLine>();
  const lines = results ?? [];
  const settings = await getSettings(db);
  const totals = computeTotals(
    lines.map((l) => ({ quantity: l.quantity, unit_price: l.unit_price, tax_rate: l.tax_rate })),
    settings
  );
  if (!issuer || !client) return null;
  const payments = await listPayments(db, id);
  const paid_total = payments.reduce((a, p) => a + p.amount, 0);
  const target = settings.withholding === "standard" ? totals.payable : totals.total;
  return { doc, issuer, client, lines, totals, settings, payments, paid_total, balance: target - paid_total };
}

/** 公開共有トークンを発行（既にあればそれを返す）。 */
export async function ensureShareToken(db: D1Database, id: string): Promise<string | null> {
  const row = await db.prepare("SELECT share_token FROM documents WHERE id = ?1").bind(id).first<{ share_token: string | null }>();
  if (!row) return null;
  if (row.share_token) return row.share_token;
  const token = randomToken(24);
  await db.prepare("UPDATE documents SET share_token = ?2 WHERE id = ?1").bind(id, token).run();
  return token;
}

/** 公開共有トークンを失効（リンク無効化）。 */
export async function clearShareToken(db: D1Database, id: string): Promise<void> {
  await db.prepare("UPDATE documents SET share_token = NULL WHERE id = ?1").bind(id).run();
}

/** 共有トークンから帳票を取得（公開閲覧用・ログイン不要）。 */
export async function getDocumentByShareToken(db: D1Database, token: string): Promise<FullDocument | null> {
  const row = await db.prepare("SELECT id FROM documents WHERE share_token = ?1").bind(token).first<{ id: string }>();
  if (!row) return null;
  return getDocument(db, row.id);
}

export interface CreateLineInput {
  name: string;
  description?: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  tax_rate: number;
}

export interface CreateDocumentInput {
  type: DocumentType;
  issuer_id: string;
  client_id: string;
  issue_date: string;
  due_date?: string | null;
  subject?: string | null;
  notes?: string | null;
  parent_id?: string | null;
  division_id?: string | null;
  lines: CreateLineInput[];
}

async function nextSequence(db: D1Database, type: DocumentType, year: number, issuerId: string): Promise<number> {
  // 会社（発行元）ごとに採番。複数社を1インスタンスで運用しても番号が混ざらない。
  const key = `${issuerId}-${type}-${year}`;
  await db
    .prepare("INSERT INTO sequences (key, value) VALUES (?1, 0) ON CONFLICT(key) DO NOTHING")
    .bind(key)
    .run();
  await db.prepare("UPDATE sequences SET value = value + 1 WHERE key = ?1").bind(key).run();
  const row = await db.prepare("SELECT value FROM sequences WHERE key = ?1").bind(key).first<{ value: number }>();
  return row?.value ?? 1;
}

export async function createDocument(
  db: D1Database,
  input: CreateDocumentInput,
  actor = "local"
): Promise<string> {
  const id = crypto.randomUUID();
  const year = Number(input.issue_date.slice(0, 4)) || new Date().getFullYear();
  const seq = await nextSequence(db, input.type, year, input.issuer_id);
  const number = formatNumber(input.type, year, seq);
  const settings = await getSettings(db);

  const totals = computeTotals(
    input.lines.map((l) => ({ quantity: l.quantity, unit_price: l.unit_price, tax_rate: l.tax_rate })),
    settings
  );

  const statements = [
    db
      .prepare(
        `INSERT INTO documents
         (id, type, number, status, issuer_id, client_id, issue_date, due_date, subject, notes, rounding, parent_id, subtotal, tax_total, total, division_id)
         VALUES (?1,?2,?3,'draft',?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15)`
      )
      .bind(
        id,
        input.type,
        number,
        input.issuer_id,
        input.client_id,
        input.issue_date,
        input.due_date ?? null,
        input.subject ?? null,
        input.notes ?? null,
        settings.tax_rounding,
        input.parent_id ?? null,
        totals.subtotal,
        totals.tax_total,
        totals.total,
        input.division_id ?? null
      ),
  ];

  input.lines.forEach((l, i) => {
    statements.push(
      db
        .prepare(
          `INSERT INTO document_lines
           (id, document_id, position, name, description, quantity, unit, unit_price, tax_rate, amount)
           VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)`
        )
        .bind(
          crypto.randomUUID(),
          id,
          i,
          l.name,
          l.description ?? null,
          l.quantity,
          l.unit,
          l.unit_price,
          l.tax_rate,
          lineAmount(l.quantity, l.unit_price, settings.amount_rounding)
        )
    );
  });

  await db.batch(statements);
  await appendAudit(db, { actor, action: "create", document_id: id, summary: `${DOCUMENT_LABELS[input.type]} ${number} を作成` });
  return id;
}

export interface UpdateDocumentInput {
  issuer_id: string;
  client_id: string;
  issue_date: string;
  due_date?: string | null;
  subject?: string | null;
  notes?: string | null;
  division_id?: string | null;
  lines: CreateLineInput[];
}

export class DocumentLockedError extends Error {
  constructor() {
    super("この帳票は確定済みのため編集できません。");
    this.name = "DocumentLockedError";
  }
}

/** 既存帳票を更新（種別・番号・ステータスは保持、明細は入れ替え）。確定済みは不可。 */
export async function updateDocument(
  db: D1Database,
  id: string,
  input: UpdateDocumentInput,
  actor = "local"
): Promise<void> {
  const lock = await db.prepare("SELECT locked FROM documents WHERE id = ?1").bind(id).first<{ locked: number }>();
  if (lock?.locked) throw new DocumentLockedError();
  const settings = await getSettings(db);
  const totals = computeTotals(
    input.lines.map((l) => ({ quantity: l.quantity, unit_price: l.unit_price, tax_rate: l.tax_rate })),
    settings
  );

  const statements = [
    db
      .prepare(
        `UPDATE documents SET
          issuer_id = ?2, client_id = ?3, issue_date = ?4, due_date = ?5, subject = ?6,
          notes = ?7, rounding = ?8, subtotal = ?9, tax_total = ?10, total = ?11, division_id = ?12
         WHERE id = ?1`
      )
      .bind(
        id,
        input.issuer_id,
        input.client_id,
        input.issue_date,
        input.due_date ?? null,
        input.subject ?? null,
        input.notes ?? null,
        settings.tax_rounding,
        totals.subtotal,
        totals.tax_total,
        totals.total,
        input.division_id ?? null
      ),
    db.prepare("DELETE FROM document_lines WHERE document_id = ?1").bind(id),
  ];

  input.lines.forEach((l, i) => {
    statements.push(
      db
        .prepare(
          `INSERT INTO document_lines
           (id, document_id, position, name, description, quantity, unit, unit_price, tax_rate, amount)
           VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)`
        )
        .bind(
          crypto.randomUUID(),
          id,
          i,
          l.name,
          l.description ?? null,
          l.quantity,
          l.unit,
          l.unit_price,
          l.tax_rate,
          lineAmount(l.quantity, l.unit_price, settings.amount_rounding)
        )
    );
  });

  await db.batch(statements);
  await appendAudit(db, { actor, action: "update", document_id: id, summary: "内容を更新" });
}

function linesOf(full: FullDocument): CreateLineInput[] {
  return full.lines.map((l) => ({
    name: l.name,
    description: l.description,
    quantity: l.quantity,
    unit: l.unit,
    unit_price: l.unit_price,
    tax_rate: l.tax_rate,
  }));
}

/** 帳票を複製（同種別・新番号・下書きで作成）。新IDを返す。 */
export async function duplicateDocument(db: D1Database, id: string, actor = "local"): Promise<string | null> {
  const full = await getDocument(db, id);
  if (!full) return null;
  return createDocument(
    db,
    {
      type: full.doc.type,
      issuer_id: full.doc.issuer_id,
      client_id: full.doc.client_id,
      issue_date: full.doc.issue_date,
      due_date: full.doc.due_date,
      subject: full.doc.subject,
      notes: full.doc.notes,
      division_id: full.doc.division_id ?? null,
      lines: linesOf(full),
    },
    actor
  );
}

/** 発行済みを取消（無効化）。原本はロックのまま保持し、ステータスのみ取消にする（電帳法：原本保持）。 */
export async function cancelDocument(db: D1Database, id: string, actor = "local"): Promise<boolean> {
  const d = await db.prepare("SELECT status FROM documents WHERE id = ?1").bind(id).first<{ status: string }>();
  if (!d) return false;
  if (d.status === "canceled") return true;
  // 取消＝公開共有リンクも無効化（取引先が古いリンクで取消済み帳票を開けないように）
  await db.prepare("UPDATE documents SET status = 'canceled', share_token = NULL WHERE id = ?1").bind(id).run();
  await appendAudit(db, { actor, action: "cancel", document_id: id, summary: "取消（無効化）" });
  return true;
}

/** 訂正版を作成。元帳票の内容をコピーした新しい下書きを作り、parent_id で元に紐づける。 */
export async function createCorrection(db: D1Database, id: string, actor = "local"): Promise<string | null> {
  const full = await getDocument(db, id);
  if (!full) return null;
  return createDocument(
    db,
    {
      type: full.doc.type,
      issuer_id: full.doc.issuer_id,
      client_id: full.doc.client_id,
      issue_date: full.doc.issue_date,
      due_date: full.doc.due_date,
      subject: full.doc.subject ? `${full.doc.subject}（訂正版）` : "（訂正版）",
      notes: full.doc.notes,
      division_id: full.doc.division_id ?? null,
      parent_id: id,
      lines: linesOf(full),
    },
    actor
  );
}

/** 取引フロー変換（見積→請求 等）。元帳票を親として新帳票を作成。 */
export async function convertDocument(
  db: D1Database,
  id: string,
  targetType: DocumentType,
  actor = "local"
): Promise<string | null> {
  const full = await getDocument(db, id);
  if (!full) return null;
  const today = new Date().toISOString().slice(0, 10);
  const newId = await createDocument(
    db,
    {
      type: targetType,
      issuer_id: full.doc.issuer_id,
      client_id: full.doc.client_id,
      issue_date: today,
      due_date: full.doc.due_date,
      subject: full.doc.subject,
      notes: full.doc.notes,
      parent_id: full.doc.id,
      lines: linesOf(full),
    },
    actor
  );
  await appendAudit(db, {
    actor,
    action: "convert",
    document_id: newId,
    summary: `${DOCUMENT_LABELS[full.doc.type]} ${full.doc.number} から ${DOCUMENT_LABELS[targetType]} を作成`,
  });
  return newId;
}

/** 確定（ロック）。内容ハッシュを記録し、以後は訂正不可にする。 */
export async function lockDocument(db: D1Database, id: string, actor = "local"): Promise<void> {
  const full = await getDocument(db, id);
  if (!full) return;
  const canonical = JSON.stringify({
    type: full.doc.type,
    number: full.doc.number,
    issuer_id: full.doc.issuer_id,
    client_id: full.doc.client_id,
    issue_date: full.doc.issue_date,
    due_date: full.doc.due_date,
    subject: full.doc.subject,
    notes: full.doc.notes,
    total: full.doc.total,
    lines: full.lines.map((l) => [l.name, l.quantity, l.unit, l.unit_price, l.tax_rate, l.amount]),
  });
  const hash = await sha256hex(canonical);
  await db
    .prepare(
      "UPDATE documents SET locked = 1, content_hash = ?2, status = CASE WHEN status = 'draft' THEN 'issued' ELSE status END WHERE id = ?1"
    )
    .bind(id, hash)
    .run();
  await appendAudit(db, { actor, action: "lock", document_id: id, summary: `確定（hash ${hash.slice(0, 12)}…）` });
}

/** 帳票を削除（確定済みは不可）。 */
export async function deleteDocument(db: D1Database, id: string, actor = "local"): Promise<boolean> {
  const doc = await db
    .prepare("SELECT type, number, locked FROM documents WHERE id = ?1")
    .bind(id)
    .first<{ type: DocumentType; number: string; locked: number }>();
  if (!doc) return false;
  if (doc.locked) throw new DocumentLockedError();
  await db.batch([
    db.prepare("DELETE FROM document_lines WHERE document_id = ?1").bind(id),
    db.prepare("DELETE FROM payments WHERE document_id = ?1").bind(id),
    db.prepare("UPDATE documents SET parent_id = NULL WHERE parent_id = ?1").bind(id),
    db.prepare("DELETE FROM documents WHERE id = ?1").bind(id),
  ]);
  await appendAudit(db, { actor, action: "delete", document_id: id, summary: `${DOCUMENT_LABELS[doc.type]} ${doc.number} を削除` });
  return true;
}

export async function getRelated(
  db: D1Database,
  doc: DocumentRecord
): Promise<{ parent: DocumentListRow | null; children: DocumentListRow[] }> {
  const sel = `SELECT d.id,d.type,d.number,d.status,d.issue_date,d.total,c.name AS client_name
       FROM documents d JOIN clients c ON c.id=d.client_id`;
  let parent: DocumentListRow | null = null;
  if (doc.parent_id) {
    parent = (await db.prepare(`${sel} WHERE d.id=?1`).bind(doc.parent_id).first<DocumentListRow>()) ?? null;
  }
  const { results } = await db.prepare(`${sel} WHERE d.parent_id=?1 ORDER BY d.created_at`).bind(doc.id).all<DocumentListRow>();
  return { parent, children: results ?? [] };
}
