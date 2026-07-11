import type { RequestHandler } from "./$types";
import { getDB, listProjects } from "$lib/server/db";
import { allowedIssuerIds, canAccessIssuer } from "$lib/server/access";
import { csvResponse } from "$lib/server/csv";

// 状態キー→日本語ラベル（一覧の表示と揃える）
const STATUS_LABEL: Record<string, string> = {
  proposed: "提案中",
  active: "進行中",
  done: "完了",
};

// 一覧（projects/+page.server.ts）と同じフィルタ条件を適用してCSVを返す。
export const GET: RequestHandler = async ({ platform, url, locals }) => {
  const db = getDB(platform);
  const allowed = await allowedIssuerIds(db, locals.user);
  let projects = (await listProjects(db)).filter((p) => !p.issuer_id || canAccessIssuer(allowed, p.issuer_id));

  // 一覧と同じ絞り込み: 会社（発行元）／顧客／q=キーワード（案件名・顧客名・担当者）／ st=状態
  const iss = url.searchParams.get("iss") ?? "";
  const cli = url.searchParams.get("cli") ?? "";
  const q = (url.searchParams.get("q") ?? "").trim();
  const st = url.searchParams.get("st") ?? "";
  if (iss && canAccessIssuer(allowed, iss)) projects = projects.filter((p) => p.issuer_id === iss);
  if (cli) projects = projects.filter((p) => p.client_id === cli);
  if (q) {
    const needle = q.toLowerCase();
    projects = projects.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.client_name.toLowerCase().includes(needle) ||
        (p.person ?? "").toLowerCase().includes(needle)
    );
  }
  if (st === "proposed" || st === "active" || st === "done") projects = projects.filter((p) => p.status === st);

  const header = ["案件名", "顧客", "状態", "開始日", "終了日", "担当", "請求計", "支払計", "粗利"];
  const body = projects.map((p) => [
    p.name,
    p.client_name,
    STATUS_LABEL[p.status] ?? p.status,
    p.start_date,
    p.end_date,
    p.person,
    p.revenue,
    p.expense,
    p.profit,
  ]);

  const filename = `案件_${new Date().toISOString().slice(0, 10)}.csv`;
  return csvResponse(filename, header, body);
};
