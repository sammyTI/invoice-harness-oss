import type { PageServerLoad } from "./$types";
import { applyRounding, fiscalYearByEndYear, fiscalYearForDate } from "@invoice-harness/shared";
import { getDB, getSettings } from "$lib/server/db";
import { allowedIssuerIds } from "$lib/server/access";

export const load: PageServerLoad = async ({ platform, url, locals }) => {
  const db = getDB(platform);
  const settings = await getSettings(db);
  const today = new Date().toISOString().slice(0, 10);
  const current = fiscalYearForDate(today, settings.fiscal_month);
  const endYear = Number(url.searchParams.get("fy")) || current.endYear;
  const fy = fiscalYearByEndYear(endYear, settings.fiscal_month);

  const allowed = await allowedIssuerIds(db, locals.user);
  let issuerCond = "";
  const extra: string[] = [];
  if (allowed && allowed.length) {
    issuerCond = ` AND d.issuer_id IN (${allowed.map((_, idx) => `?${3 + idx}`).join(",")})`;
    extra.push(...allowed);
  }

  const { results } = await db
    .prepare(
      `SELECT l.tax_rate AS rate, SUM(l.amount) AS amt
       FROM document_lines l JOIN documents d ON d.id = l.document_id
       WHERE d.type = 'invoice' AND d.status != 'canceled' AND d.issue_date >= ?1 AND d.issue_date <= ?2${issuerCond}
       GROUP BY l.tax_rate ORDER BY l.tax_rate DESC`
    )
    .bind(fy.start, fy.end, ...extra)
    .all<{ rate: number; amt: number }>();

  const inclusive = settings.tax_display === "inclusive";
  const rows = (results ?? []).map((r) => {
    let net: number;
    let tax: number;
    if (inclusive) {
      tax = applyRounding((r.amt * r.rate) / (100 + r.rate), settings.tax_rounding);
      net = r.amt - tax;
    } else {
      net = r.amt;
      tax = applyRounding((net * r.rate) / 100, settings.tax_rounding);
    }
    return { rate: r.rate, net, tax };
  });

  return {
    fyLabel: fy.label,
    prevFy: fy.endYear - 1,
    nextFy: fy.endYear + 1,
    isCurrent: fy.endYear === current.endYear,
    rows,
    totalNet: rows.reduce((a, r) => a + r.net, 0),
    totalTax: rows.reduce((a, r) => a + r.tax, 0),
  };
};
