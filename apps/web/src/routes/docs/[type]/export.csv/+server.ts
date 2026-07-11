import type { RequestHandler } from "./$types";
import { error } from "@sveltejs/kit";
import { DOCUMENT_LABELS, lifecycle, type DocumentType } from "@invoice-harness/shared";
import { effectiveDivision, getDB, listDocuments } from "$lib/server/db";
import { allowedIssuerIds, canAccessIssuer } from "$lib/server/access";
import { csvResponse } from "$lib/server/csv";

const VALID: DocumentType[] = ["estimate", "delivery_note", "order", "invoice", "receipt", "payment_notice"];

// 一覧（docs/[type]/+page.server.ts）と同じフィルタ条件を適用してCSVを返す。
// ページングは無視し、絞り込み後の全件を出力する。
export const GET: RequestHandler = async ({ params, platform, url, locals }) => {
  const type = params.type as DocumentType;
  if (!VALID.includes(type)) throw error(404, "不明な帳票種別です");
  const db = getDB(platform);
  const allowed = await allowedIssuerIds(db, locals.user);
  const loaded = await listDocuments(db, type, allowed);
  const today = new Date().toISOString().slice(0, 10);

  // 一覧と同じ絞り込み: 会社（発行元）＋q（取引先名・件名・番号）＋部門＋プロジェクト＋発行日の期間
  const iss = url.searchParams.get("iss") ?? "";
  const q = (url.searchParams.get("q") ?? "").trim();
  const div = url.searchParams.get("div") ?? "";
  const prj = url.searchParams.get("prj") ?? "";
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";

  let all = q
    ? loaded.filter(
        (d) =>
          d.client_name.toLowerCase().includes(q.toLowerCase()) ||
          d.number.toLowerCase().includes(q.toLowerCase()) ||
          (d.subject?.toLowerCase().includes(q.toLowerCase()) ?? false)
      )
    : loaded;
  if (iss && canAccessIssuer(allowed, iss)) all = all.filter((d) => d.issuer_id === iss);
  if (div) all = all.filter((d) => effectiveDivision(d).id === div);
  if (prj) all = all.filter((d) => d.project_id === prj);
  if (from) all = all.filter((d) => d.issue_date >= from);
  if (to) all = all.filter((d) => d.issue_date <= to);

  const isSent = (d: (typeof all)[number]) => d.status === "sent" || d.status === "paid";
  const isPaid = (d: (typeof all)[number]) => d.status === "paid";
  const isOverdue = (d: (typeof all)[number]) => !isPaid(d) && !!d.due_date && d.due_date < today;

  // 一覧と同じ view（送付待ち・確定待ち・入金待ち・期日超過）を適用
  const view = url.searchParams.get("view") ?? "all";
  const rows = all.filter((d) => {
    if (view === "unsent") return !isSent(d);
    if (view === "undraft") return !d.locked;
    if (view === "unpaid") return !isPaid(d);
    if (view === "overdue") return isOverdue(d);
    return true;
  });

  // 税抜・消費税は listDocuments に含まれないため、対象IDの subtotal/tax_total を別途取得
  const taxMap = new Map<string, { subtotal: number; tax_total: number }>();
  if (rows.length) {
    const ph = rows.map((_, i) => `?${i + 1}`).join(",");
    const { results } = await db
      .prepare(`SELECT id, subtotal, tax_total FROM documents WHERE id IN (${ph})`)
      .bind(...rows.map((d) => d.id))
      .all<{ id: string; subtotal: number; tax_total: number }>();
    for (const r of results ?? []) taxMap.set(r.id, { subtotal: r.subtotal, tax_total: r.tax_total });
  }

  const header = ["番号", "種別", "取引先", "件名", "発行日", "期日", "状態", "部門", "プロジェクト", "税抜", "消費税", "税込", "入金日"];
  const body = rows.map((d) => {
    const t = taxMap.get(d.id);
    return [
      d.number,
      DOCUMENT_LABELS[d.type],
      d.client_name,
      d.subject,
      d.issue_date,
      d.due_date,
      lifecycle(d).label,
      effectiveDivision(d).name,
      d.project_name,
      t?.subtotal ?? null,
      t?.tax_total ?? null,
      d.total,
      d.paid_at,
    ];
  });

  const filename = `${DOCUMENT_LABELS[type]}_${today}.csv`;
  return csvResponse(filename, header, body);
};
