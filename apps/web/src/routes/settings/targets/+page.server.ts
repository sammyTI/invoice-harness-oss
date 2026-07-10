import type { Actions, PageServerLoad } from "./$types";
import { fiscalYearForDate } from "@invoice-harness/shared";
import { getDB, getSettings, listDivisions, listIssuers, listTargets, setTarget } from "$lib/server/db";

export const load: PageServerLoad = async ({ platform, url }) => {
  const db = getDB(platform);
  const settings = await getSettings(db);
  const today = new Date().toISOString().slice(0, 10);
  const current = fiscalYearForDate(today, settings.fiscal_month).endYear;
  const fy = Number(url.searchParams.get("fy")) || current;
  return {
    fy,
    current,
    issuers: await listIssuers(db),
    divisions: await listDivisions(db),
    targets: await listTargets(db, fy),
  };
};

export const actions: Actions = {
  save: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    const fy = Number(fd.get("fy")) || new Date().getFullYear();
    // target_company_<id> / target_division_<id> 形式の入力を全部保存（0や空は削除）
    for (const [key, value] of fd.entries()) {
      const v = Number(String(value).replace(/[^0-9]/g, "")) || 0;
      if (key.startsWith("target_company_")) await setTarget(db, fy, "company", key.slice("target_company_".length), v);
      else if (key.startsWith("target_division_")) await setTarget(db, fy, "division", key.slice("target_division_".length), v);
    }
    return { ok: true };
  },
};
