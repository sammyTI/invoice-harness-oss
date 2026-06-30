import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { deleteClientCategory, getDB } from "$lib/server/db";

// 顧客区分を削除（各取引先からも外れる）。
export const DELETE: RequestHandler = async ({ platform, params }) => {
  const db = getDB(platform);
  await deleteClientCategory(db, params.id);
  return json({ ok: true });
};
