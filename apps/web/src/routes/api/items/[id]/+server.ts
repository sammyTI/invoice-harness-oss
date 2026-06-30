import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { deleteItem, getDB, listItems, updateItem } from "$lib/server/db";

// 品目を更新（部分更新）。
export const PUT: RequestHandler = async ({ platform, params, request }) => {
  const db = getDB(platform);
  const cur = (await listItems(db)).find((i) => i.id === params.id);
  if (!cur) return json({ error: "not found" }, { status: 404 });
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  await updateItem(db, params.id, {
    name: (b.name as string)?.trim() || cur.name,
    unit_price: b.unit_price === undefined ? cur.unit_price : Number(b.unit_price),
    tax_rate: b.tax_rate === undefined ? cur.tax_rate : Number(b.tax_rate),
    unit: (b.unit as string)?.trim() || cur.unit,
  });
  return json({ ok: true });
};

// 品目を削除。
export const DELETE: RequestHandler = async ({ platform, params }) => {
  const db = getDB(platform);
  await deleteItem(db, params.id);
  return json({ ok: true });
};
