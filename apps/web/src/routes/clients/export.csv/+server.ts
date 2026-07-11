import type { RequestHandler } from "./$types";
import {
  clientCategoryNameMap,
  getClientCategoryIds,
  getDB,
  listClients,
} from "$lib/server/db";
import { csvResponse } from "$lib/server/csv";

// 一覧（clients/+page.server.ts）と同じフィルタ条件を適用してCSVを返す。
export const GET: RequestHandler = async ({ platform, url }) => {
  const db = getDB(platform);

  // 一覧と同じ絞り込み: q=キーワード（取引先名・担当・メール）／ cat=顧客区分ID
  const q = (url.searchParams.get("q") ?? "").trim();
  const cat = (url.searchParams.get("cat") ?? "").trim();

  const all = await listClients(db);
  const catMap = await clientCategoryNameMap(db); // client_id → 区分名[]

  // 区分IDでの絞り込み用に client_id→区分ID配列 のマップを構築（一覧と同じ）
  const catIdMap: Record<string, string[]> = {};
  if (cat) {
    for (const c of all) catIdMap[c.id] = await getClientCategoryIds(db, c.id);
  }

  const ql = q.toLowerCase();
  const clients = all.filter((c) => {
    if (q) {
      const hay = `${c.name} ${c.contact ?? ""} ${c.email ?? ""}`.toLowerCase();
      if (!hay.includes(ql)) return false;
    }
    if (cat && !(catIdMap[c.id] ?? []).includes(cat)) return false;
    return true;
  });

  const header = ["取引先名", "敬称", "担当", "登録番号", "区分", "郵便番号", "住所", "メール"];
  const body = clients.map((c) => [
    c.name,
    c.honorific,
    c.contact,
    c.registration_number,
    (catMap[c.id] ?? []).join(" / "),
    c.postal_code,
    c.address,
    c.email,
  ]);

  const filename = `取引先_${new Date().toISOString().slice(0, 10)}.csv`;
  return csvResponse(filename, header, body);
};
