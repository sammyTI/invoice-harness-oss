import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { getDB, listEmailTemplates } from "$lib/server/db";

// メール文面テンプレートの一覧（key/subject/body）。
export const GET: RequestHandler = async ({ platform }) => {
  const db = getDB(platform);
  return json({ templates: await listEmailTemplates(db) });
};
