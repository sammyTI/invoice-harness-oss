import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { getClient, getDB, resolveClientCategoryNames, setClientCategories } from "$lib/server/db";

// 取引先の顧客区分を設定（丸ごと置き換え）。区分は名前で指定でき、無ければ自動作成。
export const PUT: RequestHandler = async ({ platform, params, request }) => {
  const db = getDB(platform);
  const client = await getClient(db, params.id);
  if (!client) return json({ error: "client not found" }, { status: 404 });
  const b = (await request.json().catch(() => ({}))) as { category_names?: string[] };
  const ids = await resolveClientCategoryNames(db, b.category_names ?? []);
  await setClientCategories(db, params.id, ids);
  return json({ ok: true, categories: b.category_names ?? [] });
};
