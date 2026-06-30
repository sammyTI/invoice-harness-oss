import type { Actions, PageServerLoad } from "./$types";
import { getDB, listEmailTemplates, updateEmailTemplate } from "$lib/server/db";

export const load: PageServerLoad = async ({ platform }) => {
  const db = getDB(platform);
  return { templates: await listEmailTemplates(db) };
};

export const actions: Actions = {
  save: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    const key = String(fd.get("key") ?? "");
    const subject = String(fd.get("subject") ?? "");
    const body = String(fd.get("body") ?? "");
    if (key !== "send" && key !== "dunning") return { ok: false };
    await updateEmailTemplate(db, key, subject, body);
    return { ok: true, key };
  },
};
