import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { createIssuer, getDB, listIssuers } from "$lib/server/db";

// 発行元（自社・会社）の一覧。AIが「どの会社で発行するか」を選ぶための一覧。
export const GET: RequestHandler = async ({ platform }) => {
  const db = getDB(platform);
  const issuers = await listIssuers(db);
  return json({
    issuers: issuers.map((i) => ({
      id: i.id,
      name: i.name,
      registration_number: i.registration_number,
      person_name: i.person_name,
      address: i.address,
      tel: i.tel,
      email: i.email,
    })),
  });
};

// 発行元（自社）を新規登録。AI/MCP から自社登録できるようにする。
export const POST: RequestHandler = async ({ platform, request }) => {
  const db = getDB(platform);
  const b = (await request.json().catch(() => ({}))) as {
    name?: string;
    registration_number?: string;
    person_name?: string;
    postal_code?: string;
    address?: string;
    tel?: string;
    email?: string;
    bank_info?: string;
  };
  const name = (b.name ?? "").trim();
  if (!name) return json({ error: "name is required" }, { status: 400 });
  const id = await createIssuer(db, {
    name,
    registration_number: b.registration_number?.trim() || null,
    person_name: b.person_name?.trim() || null,
    postal_code: b.postal_code?.trim() || null,
    address: b.address?.trim() || null,
    tel: b.tel?.trim() || null,
    email: b.email?.trim() || null,
    bank_info: b.bank_info?.trim() || null,
  });
  return json({ id, ok: true });
};
