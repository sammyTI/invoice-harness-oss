import type { Actions, PageServerLoad } from "./$types";
import { fail } from "@sveltejs/kit";
import { createNoteTemplate, deleteNoteTemplate, getDB, listNoteTemplates, setDefaultNoteTemplate } from "$lib/server/db";

export const load: PageServerLoad = async ({ platform }) => {
  const db = getDB(platform);
  return { templates: await listNoteTemplates(db) };
};

export const actions: Actions = {
  create: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    const name = String(fd.get("name") ?? "").trim();
    const body = String(fd.get("body") ?? "").trim();
    if (!name || !body) return fail(400, { error: "名称と本文は必須です。" });
    await createNoteTemplate(db, name, body);
    return { ok: true };
  },
  delete: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    await deleteNoteTemplate(db, String(fd.get("id") ?? ""));
    return { ok: true };
  },
  setDefault: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    // 同じものを再指定したら解除（トグル）
    await setDefaultNoteTemplate(db, String(fd.get("id") ?? ""));
    return { ok: true };
  },
  clearDefault: async ({ platform }) => {
    const db = getDB(platform);
    await setDefaultNoteTemplate(db, "");
    return { ok: true };
  },
};
