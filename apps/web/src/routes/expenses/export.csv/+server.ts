import type { RequestHandler } from "./$types";
import { canViewPayroll, expenseCategoryLabel, getDB, listDivisions, listExpenses, listIssuers } from "$lib/server/db";
import { allowedIssuerIds } from "$lib/server/access";
import { csvResponse } from "$lib/server/csv";

// 一覧（expenses/+page.server.ts）と同じフィルタ条件を適用してCSVを返す。
export const GET: RequestHandler = async ({ platform, url, locals }) => {
  const db = getDB(platform);
  const allowed = await allowedIssuerIds(db, locals.user);
  const mayViewPayroll = await canViewPayroll(db, locals.user);

  let issuers = await listIssuers(db);
  if (allowed) issuers = issuers.filter((i) => allowed.includes(i.id));

  // 一覧と同じ: iss=会社（閲覧可能な会社のみ有効）／ m=計上月（YYYY-MM）
  const issParam = url.searchParams.get("iss") ?? "";
  const issuerId = issuers.some((i) => i.id === issParam) ? issParam : "";
  const today = new Date().toISOString().slice(0, 10);
  const mParam = url.searchParams.get("m") ?? "";
  const month = /^\d{4}-\d{2}$/.test(mParam) ? mParam : today.slice(0, 7);

  const filterIssuer = issuerId || undefined;
  let rows = await listExpenses(db, month, filterIssuer);
  // 全社表示でも allowed 制限があれば範囲外の会社を除外
  if (!filterIssuer && allowed) rows = rows.filter((e) => allowed.includes(e.issuer_id));

  // 閲覧権限が無ければ機微行（給与・法定福利費）を落とす
  const visible = mayViewPayroll ? rows : rows.filter((e) => e.confidential !== 1);

  // 部門ID→名称マップ（会社フィルタ中はその会社＋全社共通のみ）
  let divisions = await listDivisions(db);
  if (filterIssuer) divisions = divisions.filter((d) => !d.issuer_id || d.issuer_id === filterIssuer);
  const divName = new Map(divisions.map((d) => [d.id, d.name]));

  const header = ["計上月", "科目", "摘要", "部門", "金額"];
  const body = visible.map((e) => [
    e.ym,
    expenseCategoryLabel(e.category),
    e.label,
    e.division_id ? divName.get(e.division_id) ?? null : null,
    e.amount,
  ]);

  const filename = `経費_${month}.csv`;
  return csvResponse(filename, header, body);
};
