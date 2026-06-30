import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { getDB, getSettings, updateSettings } from "$lib/server/db";

// 課税・表示・決算月などの設定。AIで初期設定できるようにする。
export const GET: RequestHandler = async ({ platform }) => {
  const db = getDB(platform);
  return json(await getSettings(db));
};

// 部分更新（指定したフィールドだけ上書き）。
export const PUT: RequestHandler = async ({ platform, request }) => {
  const db = getDB(platform);
  const cur = await getSettings(db);
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const merged = {
    ...cur,
    date_format: (b.date_format as typeof cur.date_format) ?? cur.date_format,
    tax_display: (b.tax_display as typeof cur.tax_display) ?? cur.tax_display,
    tax_rounding: (b.tax_rounding as typeof cur.tax_rounding) ?? cur.tax_rounding,
    amount_rounding: (b.amount_rounding as typeof cur.amount_rounding) ?? cur.amount_rounding,
    withholding: (b.withholding as typeof cur.withholding) ?? cur.withholding,
    withholding_basis: (b.withholding_basis as typeof cur.withholding_basis) ?? cur.withholding_basis,
    invoice_show_transaction_date:
      b.invoice_show_transaction_date === undefined ? cur.invoice_show_transaction_date : !!b.invoice_show_transaction_date,
    fiscal_month: b.fiscal_month === undefined ? cur.fiscal_month : Number(b.fiscal_month) || cur.fiscal_month,
    accent_color: (b.accent_color as string) ?? cur.accent_color,
  };
  await updateSettings(db, merged);
  return json({ ok: true, settings: merged });
};
