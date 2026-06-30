import type { Actions, PageServerLoad } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import { createItem, deleteItem, getDB, listItems, updateItem } from "$lib/server/db";

export const load: PageServerLoad = async ({ platform, url }) => {
  const db = getDB(platform);
  const items = await listItems(db);
  const editId = url.searchParams.get("edit");
  return { items, editing: editId ? items.find((i) => i.id === editId) ?? null : null };
};

function parse(fd: FormData) {
  return {
    name: String(fd.get("name") ?? "").trim(),
    unit_price: Number(fd.get("unit_price")) || 0,
    tax_rate: Number(fd.get("tax_rate")) || 10,
    unit: String(fd.get("unit") ?? "式") || "式",
  };
}

export const actions: Actions = {
  create: async ({ request, platform }) => {
    const db = getDB(platform);
    const it = parse(await request.formData());
    if (!it.name) return fail(400, { error: "品目名は必須です。" });
    await createItem(db, it);
    return { ok: true };
  },
  update: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    const id = String(fd.get("id") ?? "");
    const it = parse(fd);
    if (!id || !it.name) return fail(400, { error: "品目名は必須です。" });
    await updateItem(db, id, it);
    throw redirect(303, "/items");
  },
  delete: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    await deleteItem(db, String(fd.get("id") ?? ""));
    return { ok: true };
  },
};
