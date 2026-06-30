import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { createCorrection, getDB } from "$lib/server/db";

// 発行済みの訂正版（内容コピーの新しい下書き）を作成。元帳票に紐づく。
export const POST: RequestHandler = async ({ platform, params }) => {
  const db = getDB(platform);
  const newId = await createCorrection(db, params.id, "api");
  if (!newId) return json({ error: "not found" }, { status: 404 });
  return json({ ok: true, id: newId });
};
