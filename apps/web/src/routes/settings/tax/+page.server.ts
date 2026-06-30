import type { Actions, PageServerLoad } from "./$types";
import type { Settings } from "@invoice-harness/shared";
import { getDB, getSettings, updateSettings } from "$lib/server/db";

export const load: PageServerLoad = async ({ platform }) => {
  const db = getDB(platform);
  return { settings: await getSettings(db) };
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
      fiscal_month: Math.min(12, Math.max(1, Number(fd.get("fiscal_month")) || 3)),
    };
    await updateSettings(db, next);
    return { ok: true };
  },
};
