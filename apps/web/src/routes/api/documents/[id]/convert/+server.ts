import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { DOCUMENT_FLOW, type DocumentType } from "@invoice-harness/shared";
import { convertDocument, getDB, getDocument } from "$lib/server/db";

// 取引フロー変換（見積→請求 等）。内容コピーで新帳票を作成し親子リンク。body: { target: DocumentType }
export const POST: RequestHandler = async ({ platform, params, request }) => {
  const db = getDB(platform);
  const body = (await request.json().catch(() => ({}))) as { target?: string };
  const target = body.target as DocumentType;
  const src = await getDocument(db, params.id);
  if (!src) return json({ error: "not found" }, { status: 404 });
  if (!target || !DOCUMENT_FLOW[src.doc.type]?.includes(target)) {
    return json({ error: `この変換はできません。${src.doc.type} から変換可能: ${(DOCUMENT_FLOW[src.doc.type] ?? []).join(", ")}` }, { status: 400 });
  }
  const newId = await convertDocument(db, params.id, target, "api");
  if (!newId) return json({ error: "convert failed" }, { status: 400 });
  return json({ ok: true, id: newId });
};
