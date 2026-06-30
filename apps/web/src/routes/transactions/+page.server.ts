import type { Actions, PageServerLoad } from "./$types";
import { fail } from "@sveltejs/kit";
import {
  getDB,
  ignoreTransaction,
  importTransactions,
  listTransactions,
  matchCandidates,
  reconcile,
  unmatchTransaction,
} from "$lib/server/db";
import { csvToTransactions } from "$lib/server/csv";
import { getActor } from "$lib/server/audit";
import { allowedIssuerIds, assertDocAccess } from "$lib/server/access";

export const load: PageServerLoad = async ({ platform, url, locals }) => {
  const db = getDB(platform);
  const view = url.searchParams.get("view") ?? "unmatched";
  const txns = await listTransactions(db, view === "all" ? undefined : view);
  const allowed = await allowedIssuerIds(db, locals.user);

  // 未消込の入金明細にマッチ候補を付ける（閲覧可能な会社の請求書のみ・取消除外）
  const withCands = await Promise.all(
    txns.map(async (t) => ({
      txn: t,
      candidates: t.status === "unmatched" && t.amount > 0 ? await matchCandidates(db, t, allowed) : [],
    }))
  );

  const counts = {
    unmatched: (await listTransactions(db, "unmatched")).length,
    matched: (await listTransactions(db, "matched")).length,
    ignored: (await listTransactions(db, "ignored")).length,
  };
  return { view, rows: withCands, counts };
};

export const actions: Actions = {
  import: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    const account = String(fd.get("account") ?? "").trim() || "口座";
    let text = String(fd.get("paste") ?? "");
    const file = fd.get("file");
    if (file instanceof File && file.size > 0) text = await file.text();
    if (!text.trim()) return fail(400, { error: "CSVファイルを選択するか、明細を貼り付けてください。" });

    const res = csvToTransactions(text, account);
    if (res.error) return fail(400, { error: res.error });
    if (!res.txns.length) return fail(400, { error: "取り込める明細がありませんでした。" });
    const n = await importTransactions(db, res.txns);
    return { imported: n, total: res.txns.length };
  },

  reconcile: async ({ request, platform, locals }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    const documentId = String(fd.get("document_id") ?? "");
    await assertDocAccess(db, locals.user, documentId);
    await reconcile(db, String(fd.get("txn_id") ?? ""), documentId, getActor({ request, locals }));
    return { ok: true };
  },

  ignore: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    await ignoreTransaction(db, String(fd.get("txn_id") ?? ""));
    return { ok: true };
  },

  unmatch: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    await unmatchTransaction(db, String(fd.get("txn_id") ?? ""));
    return { ok: true };
  },
};
