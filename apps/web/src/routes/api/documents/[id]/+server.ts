import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { deleteDocument, DocumentLockedError, getDB, getDocument } from "$lib/server/db";

export const GET: RequestHandler = async ({ platform, params }) => {
  const db = getDB(platform);
  const full = await getDocument(db, params.id);
  if (!full) return json({ error: "not found" }, { status: 404 });
  return json(full);
};

// 帳票を削除（下書きのみ。発行済みは取消/訂正を使う）。
export const DELETE: RequestHandler = async ({ platform, params }) => {
  const db = getDB(platform);
  try {
    const okDel = await deleteDocument(db, params.id, "api");
    if (!okDel) return json({ error: "not found" }, { status: 404 });
    return json({ ok: true });
  } catch (e) {
    if (e instanceof DocumentLockedError) return json({ error: e.message }, { status: 400 });
    throw e;
  }
};
