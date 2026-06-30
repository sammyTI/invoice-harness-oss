import type { Actions, PageServerLoad } from "./$types";
import { error, fail } from "@sveltejs/kit";
import { DOCUMENT_LABELS, type DocumentType } from "@invoice-harness/shared";
import { deleteDocument, DocumentLockedError, getDB, listDocuments, markSent } from "$lib/server/db";
import { getActor } from "$lib/server/audit";
import { allowedIssuerIds, assertDocAccess } from "$lib/server/access";

const VALID: DocumentType[] = ["estimate", "delivery_note", "order", "invoice", "receipt", "payment_notice"];
const PAGE_SIZE = 20;

export const load: PageServerLoad = async ({ params, platform, url, locals }) => {
  const type = params.type as DocumentType;
  if (!VALID.includes(type)) throw error(404, "不明な帳票種別です");
  const db = getDB(platform);
  const allowed = await allowedIssuerIds(db, locals.user);
  const loaded = await listDocuments(db, type, allowed);
  const today = new Date().toISOString().slice(0, 10);

  // キーワード検索（取引先名・番号）
  const q = (url.searchParams.get("q") ?? "").trim();
  const all = q
    ? loaded.filter(
        (d) =>
          d.client_name.toLowerCase().includes(q.toLowerCase()) ||
          d.number.toLowerCase().includes(q.toLowerCase())
      )
    : loaded;

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

  return { type, label: DOCUMENT_LABELS[type], view, counts, today, documents: pageRows, total, page, pageCount, sort, dir, q };
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
