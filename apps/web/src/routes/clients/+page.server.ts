import type { Actions, PageServerLoad } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import { getClient, getDB, listClients, updateClient, type ClientInput } from "$lib/server/db";

function parse(fd: FormData): ClientInput {
  return {
    name: String(fd.get("name") ?? "").trim(),
    honorific: String(fd.get("honorific") ?? "御中") || "御中",
    contact: String(fd.get("contact") ?? "").trim() || null,
    postal_code: String(fd.get("postal_code") ?? "").trim() || null,
    address: String(fd.get("address") ?? "").trim() || null,
    email: String(fd.get("email") ?? "").trim() || null,
  };
}

export const load: PageServerLoad = async ({ platform, url }) => {
  const db = getDB(platform);
  const editId = url.searchParams.get("edit");
  return {
    clients: await listClients(db),
    editing: editId ? await getClient(db, editId) : null,
  };
};

export const actions: Actions = {
  create: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    const c = parse(fd);
    if (!c.name) return fail(400, { error: "取引先名は必須です。" });
    await db
      .prepare(
        `INSERT INTO clients (id, name, honorific, contact, postal_code, address, email)
         VALUES (?1,?2,?3,?4,?5,?6,?7)`
      )
      .bind(crypto.randomUUID(), c.name, c.honorific, c.contact, c.postal_code, c.address, c.email)
      .run();
    return { ok: true };
  },
  update: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    const id = String(fd.get("id") ?? "");
    const c = parse(fd);
    if (!id || !c.name) return fail(400, { error: "取引先名は必須です。" });
    await updateClient(db, id, c);
    throw redirect(303, "/clients");
  },
};
