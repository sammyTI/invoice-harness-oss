import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { createClient, getDB, listClients, resolveClientCategoryNames, setClientCategories } from "$lib/server/db";

export const GET: RequestHandler = async ({ platform }) => {
  const db = getDB(platform);
  return json({ clients: await listClients(db) });
};

// 取引先を新規登録。AIから追加できるように。
export const POST: RequestHandler = async ({ platform, request }) => {
  const db = getDB(platform);
  const b = (await request.json().catch(() => ({}))) as {
    name?: string; honorific?: string; contact?: string; postal_code?: string; address?: string; email?: string;
    category_names?: string[];
  };
  const name = (b.name ?? "").trim();
  if (!name) return json({ error: "name is required" }, { status: 400 });
  const id = await createClient(db, {
    name,
    honorific: b.honorific?.trim() || "御中",
    contact: b.contact?.trim() || null,
    postal_code: b.postal_code?.trim() || null,
    address: b.address?.trim() || null,
    email: b.email?.trim() || null,
  });
  if (b.category_names?.length) {
    await setClientCategories(db, id, await resolveClientCategoryNames(db, b.category_names));
  }
  return json({ id, ok: true });
};
