import type { Actions, PageServerLoad } from "./$types";
import type { Settings } from "@invoice-harness/shared";
import { fail } from "@sveltejs/kit";
import { createTaxRate, deleteTaxRate, getDB, getSettings, listTaxRates, updateSettings } from "$lib/server/db";

export const load: PageServerLoad = async ({ platform }) => {
  const db = getDB(platform);
  return { settings: await getSettings(db), taxRates: await listTaxRates(db) };
};

export const actions: Actions = {
  default: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    const cur = await getSettings(db);
    const next: Settings = {
      ...cur,
      date_format: (fd.get("date_format") as Settings["date_format"]) ?? "jp",
      tax_display: (fd.get("tax_display") as Settings["tax_display"]) ?? "exclusive",
      tax_rounding: (fd.get("tax_rounding") as Settings["tax_rounding"]) ?? "floor",
      amount_rounding: (fd.get("amount_rounding") as Settings["amount_rounding"]) ?? "floor",
      withholding: (fd.get("withholding") as Settings["withholding"]) ?? "none",
      withholding_basis: (fd.get("withholding_basis") as Settings["withholding_basis"]) ?? "exclusive",
      invoice_show_transaction_date: fd.get("invoice_show_transaction_date") === "on",
      require_project: fd.get("require_project") === "on",
      fiscal_month: Math.min(12, Math.max(1, Number(fd.get("fiscal_month")) || 3)),
    };
    await updateSettings(db, next);
    return { ok: true };
  },

  // 税率マスタに1行追加（label必須・rate 0-100・valid_from必須）。
  addTaxRate: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    const label = String(fd.get("label") ?? "").trim();
    const rate = Number(fd.get("rate"));
    const valid_from = String(fd.get("valid_from") ?? "").trim();
    if (!label) return fail(400, { taxError: "ラベルを入力してください。" });
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) return fail(400, { taxError: "税率は0〜100の数値で入力してください。" });
    if (!valid_from) return fail(400, { taxError: "適用開始日を入力してください。" });
    await createTaxRate(db, { label, rate, valid_from, sort: Number(fd.get("sort")) || 0 });
    return { taxOk: true };
  },

  deleteTaxRate: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    const id = String(fd.get("id") ?? "");
    if (id) await deleteTaxRate(db, id);
    return { taxOk: true };
  },
};
