import type { Actions, PageServerLoad } from "./$types";
import { error, fail } from "@sveltejs/kit";
import { DOCUMENT_LABELS, type DocumentType } from "@invoice-harness/shared";
import { deleteDocument, DocumentLockedError, effectiveDivision, getDB, listDivisions, listDocuments, listProjects, markSent } from "$lib/server/db";
import { getActor } from "$lib/server/audit";
import { allowedIssuerIds, assertDocAccess, canAccessIssuer } from "$lib/server/access";

const VALID: DocumentType[] = ["estimate", "delivery_note", "order", "invoice", "receipt", "payment_notice"];
const PAGE_SIZE = 20;

export const load: PageServerLoad = async ({ params, platform, url, locals }) => {
  const type = params.type as DocumentType;
  if (!VALID.includes(type)) throw error(404, "不明な帳票種別です");
  const db = getDB(platform);
  const allowed = await allowedIssuerIds(db, locals.user);
  const loaded = await listDocuments(db, type, allowed);
  const today = new Date().toISOString().slice(0, 10);

  // フィルター: キーワード（取引先名・番号・件名は無いので番号）＋部門＋プロジェクト＋発行日の期間
  const q = (url.searchParams.get("q") ?? "").trim();
  const div = url.searchParams.get("div") ?? "";
  const prj = url.searchParams.get("prj") ?? "";
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";

  let all = q
    ? loaded.filter(
        (d) =>
          d.client_name.toLowerCase().includes(q.toLowerCase()) ||
          d.number.toLowerCase().includes(q.toLowerCase())
      )
    : loaded;
  if (div) all = all.filter((d) => effectiveDivision(d).id === div);
  if (prj) all = all.filter((d) => d.project_id === prj);
  if (from) all = all.filter((d) => d.issue_date >= from);
  if (to) all = all.filter((d) => d.issue_date <= to);

  const isSent = (d: (typeof all)[number]) => d.status === "sent" || d.status === "paid";
  const isPaid = (d: (typeof all)[number]) => d.status === "paid";
  const isOverdue = (d: (typeof all)[number]) => !isPaid(d) && !!d.due_date && d.due_date < today;

  const counts = {
    all: all.length,
    unsent: all.filter((d) => !isSent(d)).length,
    undraft: all.filter((d) => !d.locked).length,
    unpaid: all.filter((d) => !isPaid(d)).length,
    overdue: all.filter(isOverdue).length,
  };

  const view = url.searchParams.get("view") ?? "all";
  let rows = all.filter((d) => {
    if (view === "unsent") return !isSent(d);
    if (view === "undraft") return !d.locked;
    if (view === "unpaid") return !isPaid(d);
    if (view === "overdue") return isOverdue(d);
    return true;
  });

  const sort = url.searchParams.get("sort") ?? "issue_date";
  const dir = url.searchParams.get("dir") === "asc" ? "asc" : "desc";
  const cmp = (a: (typeof rows)[number], b: (typeof rows)[number]) => {
    let r = 0;
    if (sort === "total") r = a.total - b.total;
    else if (sort === "number") r = a.number.localeCompare(b.number);
    else if (sort === "client") r = a.client_name.localeCompare(b.client_name);
    else r = a.issue_date.localeCompare(b.issue_date);
    return dir === "asc" ? r : -r;
  };
  rows = [...rows].sort(cmp);

  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(pageCount, Math.max(1, Number(url.searchParams.get("page")) || 1));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // フィルター用の選択肢（閲覧可能な範囲のみ）
  const divisions = (await listDivisions(db)).filter((d) => !d.issuer_id || canAccessIssuer(allowed, d.issuer_id));
  const projects = (await listProjects(db)).map((p) => ({ id: p.id, name: p.name, client_name: p.client_name }));

  return {
    type, label: DOCUMENT_LABELS[type], view, counts, today,
    documents: pageRows, total, page, pageCount, sort, dir,
    q, div, prj, from, to,
    divisions: divisions.map((d) => ({ id: d.id, name: d.name })),
    projects,
  };
};

export const actions: Actions = {
  bulkDelete: async ({ request, platform, locals }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    const ids = fd.getAll("ids").map(String);
    let deleted = 0;
    let skipped = 0;
    for (const id of ids) {
      try {
        await assertDocAccess(db, locals.user, id);
        if (await deleteDocument(db, id, getActor({ request, locals }))) deleted++;
      } catch (e) {
        if (e instanceof DocumentLockedError) skipped++;
        else throw e;
      }
    }
    return { bulk: `${deleted}件を削除${skipped ? `（確定済${skipped}件はスキップ）` : ""}` };
  },

  bulkSend: async ({ request, platform, locals }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    const ids = fd.getAll("ids").map(String);
    if (!ids.length) return fail(400, { error: "対象を選択してください。" });
    const now = new Date().toISOString();
    for (const id of ids) {
      await assertDocAccess(db, locals.user, id);
      await markSent(db, id, now, getActor({ request, locals }));
    }
    return { bulk: `${ids.length}件を送付済みにしました` };
  },
};
