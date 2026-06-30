import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { deleteDivision, getDB } from "$lib/server/db";

// 計上区分（部門）を削除。割り当て済みの帳票は区分なしに戻る。
export const DELETE: RequestHandler = async ({ platform, params }) => {
  const db = getDB(platform);
  await deleteDivision(db, params.id);
  return json({ ok: true });
};
