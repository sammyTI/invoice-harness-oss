import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { fiscalYearByEndYear, fiscalYearForDate, fiscalMonths } from "@invoice-harness/shared";
import { getDB, getSettings, listDivisions, listIssuers, listTargets, setTarget } from "$lib/server/db";

// 売上目標の一覧。?month=YYYY-MM で単月、?fy=決算年 でその年度の12ヶ月分。省略時は今年度。
export const GET: RequestHandler = async ({ platform, url }) => {
  const db = getDB(platform);
  const settings = await getSettings(db);
  const issuers = await listIssuers(db);
  const divisions = await listDivisions(db);

  const monthParam = url.searchParams.get("month");
  let yms: string[];
  let scope: { fy?: number; month?: string };
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    yms = [monthParam];
    scope = { month: monthParam };
  } else {
    const current = fiscalYearForDate(new Date().toISOString().slice(0, 10), settings.fiscal_month).endYear;
    const fy = Number(url.searchParams.get("fy")) || current;
    yms = fiscalMonths(fiscalYearByEndYear(fy, settings.fiscal_month)).map((m) => m.ym);
    scope = { fy };
  }
  const targets = (await listTargets(db, yms)).map((t) => ({
    ...t,
    scope_name:
      t.scope_type === "company"
        ? issuers.find((i) => i.id === t.scope_id)?.name ?? null
        : divisions.find((d) => d.id === t.scope_id)?.name ?? null,
  }));
  return json({ ...scope, targets });
};

// 売上目標を月次で設定（会社名/部門名 × month=YYYY-MM で指定。amount=0 で削除）。
export const PUT: RequestHandler = async ({ platform, request }) => {
  const db = getDB(platform);
  const b = (await request.json().catch(() => ({}))) as {
    month?: string; company_name?: string; division_name?: string; amount?: number;
  };
  const ym = String(b.month ?? "");
  if (!/^\d{4}-\d{2}$/.test(ym)) return json({ error: "month (YYYY-MM) is required" }, { status: 400 });
  const amount = Math.max(0, Number(b.amount) || 0);
  if (b.company_name) {
    const iss = (await listIssuers(db)).find((i) => i.name === b.company_name);
    if (!iss) return json({ error: `company not found: ${b.company_name}` }, { status: 400 });
    await setTarget(db, ym, "company", iss.id, amount);
    return json({ ok: true, month: ym, scope: "company", name: iss.name, amount });
  }
  if (b.division_name) {
    const dv = (await listDivisions(db)).find((d) => d.name === b.division_name);
    if (!dv) return json({ error: `division not found: ${b.division_name}` }, { status: 400 });
    await setTarget(db, ym, "division", dv.id, amount);
    return json({ ok: true, month: ym, scope: "division", name: dv.name, amount });
  }
  return json({ error: "company_name or division_name is required" }, { status: 400 });
};
