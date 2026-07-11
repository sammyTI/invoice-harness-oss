import type { RequestHandler } from "./$types";
import {
  clientCategoryIdMap,
  clientCategoryNameMap,
  getDB,
  listClients,
} from "$lib/server/db";
import { csvResponse } from "$lib/server/csv";
import { todayJst } from "$lib/server/today";

// 一覧（clients/+page.server.ts）と同じフィルタ条件を適用してCSVを返す。
export const GET: RequestHandler = async ({ platform, url }) => {
  const db = getDB(platform);

  // 一覧と同じ絞り込み: q=キーワード（取引先名・担当・メール）／ cat=顧客区分ID
  const q = (url.searchParams.get("q") ?? "").trim();
  const cat = (url.searchParams.get("cat") ?? "").trim();

  const all = await listClients(db);
  const catMap = await clientCategoryNameMap(db); // client_id → 区分名[]

  // 区分IDでの絞り込み用に client_id→区分ID配列 のマップを1クエリで構築（一覧と同じ）
  const catIdMap = cat ? await clientCategoryIdMap(db) : {};

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

  const filename = `取引先_${todayJst()}.csv`;
  return csvResponse(filename, header, body);
};
