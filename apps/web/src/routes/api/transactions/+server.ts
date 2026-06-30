import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { getDB, importTransactions, listTransactions, type TxnInput } from "$lib/server/db";

export const GET: RequestHandler = async ({ platform, url }) => {
  const db = getDB(platform);
  const status = url.searchParams.get("status") ?? undefined;
  return json({ transactions: await listTransactions(db, status) });
};

/**
 * 取引明細の取込API（銀行/カードのコネクタから叩く想定）。
 * body: { account?, transactions: [{ date, description, amount, external_id }] }
 * amount は入金=正・出金=負。external_id で重複防止。
 */
export const POST: RequestHandler = async ({ platform, request }) => {
  const db = getDB(platform);
  const body = (await request.json().catch(() => ({}))) as {
    account?: string;
    transactions?: { date?: string; txn_date?: string; description?: string; amount?: number; external_id?: string }[];
  };
  const list = body.transactions ?? [];
  if (!Array.isArray(list) || !list.length) return json({ error: "transactions required" }, { status: 400 });

  const rows: TxnInput[] = list.map((t) => ({
    txn_date: String(t.txn_date ?? t.date ?? "").slice(0, 10),
    description: t.description ?? null,
    amount: Number(t.amount ?? 0),
    account: body.account ?? null,
    source: "api",
    external_id: t.external_id ?? null,
  }));
  const imported = await importTransactions(db, rows);
  return json({ ok: true, imported, received: rows.length });
};
