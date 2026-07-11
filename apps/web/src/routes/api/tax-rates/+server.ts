import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { createTaxRate, deleteTaxRate, getDB, listTaxRates } from "$lib/server/db";

// 税率マスタ（適用開始日つき）。消費税率の変更に備える時限マスタ。
export const GET: RequestHandler = async ({ platform }) => {
  const db = getDB(platform);
  return json({ tax_rates: await listTaxRates(db) });
};

export const POST: RequestHandler = async ({ platform, request }) => {
  const db = getDB(platform);
  const b = (await request.json().catch(() => ({}))) as {
    label?: string; rate?: number; valid_from?: string; sort?: number;
  };
  const label = (b.label ?? "").trim();
  const rate = Number(b.rate);
  const valid_from = (b.valid_from ?? "").trim();
  if (!label) return json({ error: "label is required" }, { status: 400 });
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) return json({ error: "rate must be 0-100" }, { status: 400 });
  if (!valid_from) return json({ error: "valid_from is required (YYYY-MM-DD)" }, { status: 400 });
  await createTaxRate(db, { label, rate, valid_from, sort: Number(b.sort) || 0 });
  return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ platform, url }) => {
  const db = getDB(platform);
  const id = url.searchParams.get("id") ?? "";
  if (!id) return json({ error: "id is required" }, { status: 400 });
  await deleteTaxRate(db, id);
  return json({ ok: true });
};
