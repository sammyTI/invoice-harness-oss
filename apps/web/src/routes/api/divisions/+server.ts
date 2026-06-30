import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { getDB, listDivisions, listIssuers } from "$lib/server/db";

// 計上区分（部門）の一覧。会社名も添える。
export const GET: RequestHandler = async ({ platform }) => {
  const db = getDB(platform);
  const [divisions, issuers] = await Promise.all([listDivisions(db), listIssuers(db)]);
  const issuerName = (id: string | null) => (id ? issuers.find((i) => i.id === id)?.name ?? null : "全社共通");
  return json({
    divisions: divisions.map((d) => ({ id: d.id, name: d.name, issuer_id: d.issuer_id, company: issuerName(d.issuer_id) })),
  });
};
