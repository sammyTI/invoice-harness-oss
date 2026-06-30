import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { createDivision, getDB, listDivisions, listIssuers } from "$lib/server/db";

// 計上区分（部門）の一覧。会社名も添える。
export const GET: RequestHandler = async ({ platform }) => {
  const db = getDB(platform);
  const [divisions, issuers] = await Promise.all([listDivisions(db), listIssuers(db)]);
  const issuerName = (id: string | null) => (id ? issuers.find((i) => i.id === id)?.name ?? null : "全社共通");
  return json({
    divisions: divisions.map((d) => ({ id: d.id, name: d.name, issuer_id: d.issuer_id, company: issuerName(d.issuer_id) })),
  });
};

// 計上区分（部門）を新規登録。company（会社名 or id）省略時は全社共通。
export const POST: RequestHandler = async ({ platform, request }) => {
  const db = getDB(platform);
  const b = (await request.json().catch(() => ({}))) as { name?: string; issuer_id?: string; issuer_name?: string };
  const name = (b.name ?? "").trim();
  if (!name) return json({ error: "name is required" }, { status: 400 });
  let issuerId: string | null = b.issuer_id ?? null;
  if (!issuerId && b.issuer_name) {
    const hit = (await listIssuers(db)).find((i) => i.name === b.issuer_name);
    if (!hit) return json({ error: `issuer not found: ${b.issuer_name}` }, { status: 400 });
    issuerId = hit.id;
  }
  await createDivision(db, name, issuerId);
  return json({ ok: true });
};
