import type { Actions, PageServerLoad } from "./$types";
import { fiscalYearByEndYear, fiscalYearForDate, fiscalMonths } from "@invoice-harness/shared";
import { getDB, getSettings, listDivisions, listIssuers, listTargets, setTargetsBatch } from "$lib/server/db";
import { todayJst } from "$lib/server/today";

export const load: PageServerLoad = async ({ platform, url }) => {
  const db = getDB(platform);
  const settings = await getSettings(db);
  const today = todayJst();
  const fmParam = Number(url.searchParams.get("fm"));
  // 月の並びを決める基準月。既定は全体設定の決算月。fm=1 で暦年（1〜12月）にも切替可。
  const fiscalMonth = fmParam >= 1 && fmParam <= 12 ? fmParam : settings.fiscal_month;
  const current = fiscalYearForDate(today, fiscalMonth).endYear;
  const fy = Number(url.searchParams.get("fy")) || current;
  const period = fiscalYearByEndYear(fy, fiscalMonth);
  const months = fiscalMonths(period); // { ym, label }[] × 12（決算翌月始まり）
  const yms = months.map((m) => m.ym);

  return {
    fy,
    current,
    fiscalMonth,
    calendar: fiscalMonth === 12,
    periodLabel: fiscalMonth === 12 ? `${fy}年（暦年）` : period.label,
    months,
    issuers: await listIssuers(db),
    divisions: await listDivisions(db),
    targets: await listTargets(db, yms),
  };
};

export const actions: Actions = {
  save: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    // 入力名: t_<company|division>_<scopeId>_<YYYY-MM>
    // 逐次 await せず、全入力を集めて1回の db.batch で保存する。
    const entries: { ym: string; scopeType: "company" | "division"; scopeId: string; amount: number }[] = [];
    for (const [key, value] of fd.entries()) {
      if (!key.startsWith("t_")) continue;
      const m = /^t_(company|division)_(.+)_(\d{4}-\d{2})$/.exec(key);
      if (!m) continue;
      const [, scopeType, scopeId, ym] = m;
      const v = Number(String(value).replace(/[^0-9]/g, "")) || 0;
      entries.push({ ym, scopeType: scopeType as "company" | "division", scopeId, amount: v });
    }
    await setTargetsBatch(db, entries);
    return { ok: true };
  },
};
