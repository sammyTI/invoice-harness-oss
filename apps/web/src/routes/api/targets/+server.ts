import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { fiscalYearForDate } from "@invoice-harness/shared";
import { getDB, getSettings, listDivisions, listIssuers, listTargets, setTarget } from "$lib/server/db";

// 売上目標の一覧（?fy=決算年。省略時は今年度）。会社名・部門名つきで返す。
export const GET: RequestHandler = async ({ platform, url }) => {
  const db = getDB(platform);
  const settings = await getSettings(db);
  const current = fiscalYearForDate(new Date().toISOString().slice(0, 10), settings.fiscal_month).endYear;
  const fy = Number(url.searchParams.get("fy")) || current;
  const issuers = await listIssuers(db);
  const divisions = await listDivisions(db);
  const targets = (await listTargets(db, fy)).map((t) => ({
    ...t,
    scope_name:
      t.scope_type === "company"
        ? issuers.find((i) => i.id === t.scope_id)?.name ?? null
        : divisions.find((d) => d.id === t.scope_id)?.name ?? null,
  }));
  return json({ fiscal_year: fy, targets });
};

// 売上目標を設定（会社名/部門名で指定。amount=0 で削除）。
export const PUT: RequestHandler = async ({ platform, request }) => {
  const db = getDB(platform);
  const b = (await request.json().catch(() => ({}))) as {
    fiscal_year?: number; company_name?: string; division_name?: string; amount?: number;
  };
  const settings = await getSettings(db);
  const current = fiscalYearForDate(new Date().toISOString().slice(0, 10), settings.fiscal_month).endYear;
  const fy = Number(b.fiscal_year) || current;
  const amount = Math.max(0, Number(b.amount) || 0);
  if (b.company_name) {
    const iss = (await listIssuers(db)).find((i) => i.name === b.company_name);
    if (!iss) return json({ error: `company not found: ${b.company_name}` }, { status: 400 });
    await setTarget(db, fy, "company", iss.id, amount);
    return json({ ok: true, fiscal_year: fy, scope: "company", name: iss.name, amount });
  }
  if (b.division_name) {
    const dv = (await listDivisions(db)).find((d) => d.name === b.division_name);
    if (!dv) return json({ error: `division not found: ${b.division_name}` }, { status: 400 });
    await setTarget(db, fy, "division", dv.id, amount);
    return json({ ok: true, fiscal_year: fy, scope: "division", name: dv.name, amount });
  }
  return json({ error: "company_name or division_name is required" }, { status: 400 });
};
