import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { getDB, listIssuers } from "$lib/server/db";

// 発行元（自社・会社）の一覧。AIが「どの会社で発行するか」を選ぶための一覧。
export const GET: RequestHandler = async ({ platform }) => {
  const db = getDB(platform);
  const issuers = await listIssuers(db);
  return json({ issuers: issuers.map((i) => ({ id: i.id, name: i.name, registration_number: i.registration_number })) });
};
