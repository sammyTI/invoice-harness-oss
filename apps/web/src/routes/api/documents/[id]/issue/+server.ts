import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { getDB, getDocument, lockDocument } from "$lib/server/db";

// 帳票を発行（確定・ロック）。以後は訂正不可。
export const POST: RequestHandler = async ({ platform, params }) => {
  const db = getDB(platform);
  const full = await getDocument(db, params.id);
  if (!full) return json({ error: "not found" }, { status: 404 });
  if (full.doc.locked) return json({ ok: true, already: true, number: full.doc.number });
  await lockDocument(db, params.id, "api");
  return json({ ok: true });
};
