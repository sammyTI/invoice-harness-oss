import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { getDB, listIssuers, updateIssuer } from "$lib/server/db";

// 発行元（自社）情報を更新。指定したフィールドだけ上書き（部分更新）。
export const PUT: RequestHandler = async ({ platform, params, request }) => {
  const db = getDB(platform);
  const cur = (await listIssuers(db)).find((i) => i.id === params.id);
  if (!cur) return json({ error: "not found" }, { status: 404 });
  const b = (await request.json().catch(() => ({}))) as Record<string, string | number | null>;
  const pick = (k: string, fallback: string | null) =>
    b[k] === undefined ? fallback : (typeof b[k] === "string" ? (b[k] as string).trim() || null : (b[k] as string | null));
  const fiscalMonth = ((): number | null => {
    if (b.fiscal_month === undefined) return cur.fiscal_month ?? null;
    const v = Number(b.fiscal_month);
    return Number.isInteger(v) && v >= 1 && v <= 12 ? v : null;
  })();
  await updateIssuer(db, params.id, {
    name: (pick("name", cur.name) as string) || cur.name,
    registration_number: pick("registration_number", cur.registration_number),
    person_name: pick("person_name", cur.person_name),
    postal_code: pick("postal_code", cur.postal_code),
    address: pick("address", cur.address),
    tel: pick("tel", cur.tel),
    email: pick("email", cur.email),
    bank_info: pick("bank_info", cur.bank_info),
    fiscal_month: fiscalMonth,
  });
  return json({ ok: true });
};
