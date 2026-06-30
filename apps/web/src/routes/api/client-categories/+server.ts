import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { createClientCategory, getDB, listClientCategories } from "$lib/server/db";

// 顧客区分マスタの一覧。
export const GET: RequestHandler = async ({ platform }) => {
  const db = getDB(platform);
  return json({ categories: await listClientCategories(db) });
};

// 顧客区分を新規登録（AI/MCP から区分ラベルを追加）。
export const POST: RequestHandler = async ({ platform, request }) => {
  const db = getDB(platform);
  const b = (await request.json().catch(() => ({}))) as { name?: string };
  const name = (b.name ?? "").trim();
  if (!name) return json({ error: "name is required" }, { status: 400 });
  const id = await createClientCategory(db, name);
  return json({ id, ok: true });
};
