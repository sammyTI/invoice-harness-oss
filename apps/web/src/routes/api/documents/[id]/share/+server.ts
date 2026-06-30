import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { clearShareToken, ensureShareToken, getDB } from "$lib/server/db";

// 公開共有リンクを発行（取引先がログイン無しで開けるURL）。
export const POST: RequestHandler = async ({ platform, params, url }) => {
  const db = getDB(platform);
  const token = await ensureShareToken(db, params.id);
  if (!token) return json({ error: "not found" }, { status: 404 });
  return json({ ok: true, url: `${url.origin}/share/${token}` });
};

// 共有リンクを失効。
export const DELETE: RequestHandler = async ({ platform, params }) => {
  const db = getDB(platform);
  await clearShareToken(db, params.id);
  return json({ ok: true });
};
