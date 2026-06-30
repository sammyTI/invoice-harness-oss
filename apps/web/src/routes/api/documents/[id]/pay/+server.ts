import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { getDB, getDocument, markPaid } from "$lib/server/db";

export const POST: RequestHandler = async ({ platform, params, request }) => {
  const db = getDB(platform);
  const full = await getDocument(db, params.id);
  if (!full) return json({ error: "not found" }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as { amount?: number; paid_date?: string; method?: string; reference?: string };
  const amount = Number(body.amount) || full.balance || full.totals.total;
  if (amount <= 0) return json({ error: "invalid amount" }, { status: 400 });
  await markPaid(db, params.id, body.paid_date || new Date().toISOString().slice(0, 10), amount, body.method ?? null, "api", body.reference ?? null);
  return json({ ok: true });
};
