import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { createItem, getDB, listItems } from "$lib/server/db";

export const GET: RequestHandler = async ({ platform }) => {
  const db = getDB(platform);
  return json({ items: await listItems(db) });
};

// 品目マスタを新規登録。AIから追加できるように。
export const POST: RequestHandler = async ({ platform, request }) => {
  const db = getDB(platform);
  const b = (await request.json().catch(() => ({}))) as {
    name?: string; unit_price?: number; tax_rate?: number; unit?: string;
  };
  const name = (b.name ?? "").trim();
  if (!name) return json({ error: "name is required" }, { status: 400 });
  await createItem(db, {
    name,
    unit_price: Number(b.unit_price ?? 0),
    tax_rate: Number(b.tax_rate ?? 10),
    unit: (b.unit ?? "式").trim() || "式",
  });
  return json({ ok: true });
};
