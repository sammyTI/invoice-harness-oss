import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { getDB, listDocTemplates } from "$lib/server/db";

// 帳票種別ごとの既定備考の一覧（type -> notes）。
export const GET: RequestHandler = async ({ platform }) => {
  const db = getDB(platform);
  return json({ templates: await listDocTemplates(db) });
};
