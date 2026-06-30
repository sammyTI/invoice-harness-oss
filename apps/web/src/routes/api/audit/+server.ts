import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { getDB } from "$lib/server/db";
import { listAudit } from "$lib/server/audit";

// 監査ログ（電帳法の操作履歴・改ざん検知チェーン）の閲覧。読み取り専用。
export const GET: RequestHandler = async ({ platform, url }) => {
  const db = getDB(platform);
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit")) || 100));
  return json({ audit: await listAudit(db, limit) });
};
