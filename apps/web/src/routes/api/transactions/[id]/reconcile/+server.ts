import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { getDB, reconcile } from "$lib/server/db";

// 銀行明細(txn)を帳票に消し込む（入金記録＋ステータス更新）。
export const POST: RequestHandler = async ({ platform, params, request }) => {
  const db = getDB(platform);
  const b = (await request.json().catch(() => ({}))) as { document_id?: string };
  if (!b.document_id) return json({ error: "document_id is required" }, { status: 400 });
  await reconcile(db, params.id, b.document_id, "api");
  return json({ ok: true });
};
