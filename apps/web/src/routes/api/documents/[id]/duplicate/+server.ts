import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { duplicateDocument, getDB } from "$lib/server/db";

// 帳票を複製（同種別・新番号・下書きで作成）。新IDを返す。
export const POST: RequestHandler = async ({ platform, params }) => {
  const db = getDB(platform);
  const id = await duplicateDocument(db, params.id, "api");
  if (!id) return json({ error: "not found" }, { status: 404 });
  return json({ id, ok: true });
};
