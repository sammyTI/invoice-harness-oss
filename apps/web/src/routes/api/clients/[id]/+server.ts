import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { getClient, getDB, updateClient } from "$lib/server/db";

// 取引先を更新（部分更新）。
export const PUT: RequestHandler = async ({ platform, params, request }) => {
  const db = getDB(platform);
  const cur = await getClient(db, params.id);
  if (!cur) return json({ error: "not found" }, { status: 404 });
  const b = (await request.json().catch(() => ({}))) as Record<string, string | null>;
  const pick = (k: string, fb: string | null) =>
    b[k] === undefined ? fb : typeof b[k] === "string" ? (b[k] as string).trim() || null : b[k];
  await updateClient(db, params.id, {
    name: (pick("name", cur.name) as string) || cur.name,
    honorific: (pick("honorific", cur.honorific) as string) || cur.honorific || "御中",
    contact: pick("contact", cur.contact),
    postal_code: pick("postal_code", cur.postal_code),
    address: pick("address", cur.address),
    email: pick("email", cur.email),
  });
  return json({ ok: true });
};
