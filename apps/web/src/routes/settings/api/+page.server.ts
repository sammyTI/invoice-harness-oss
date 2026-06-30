import type { Actions, PageServerLoad } from "./$types";
import { fail } from "@sveltejs/kit";
import { createApiToken, deleteApiToken, getDB, listApiTokens } from "$lib/server/db";

export const load: PageServerLoad = async ({ platform }) => {
  const db = getDB(platform);
  return {
    tokens: await listApiTokens(db),
    mailEnabled: !!platform?.env?.RESEND_API_KEY,
    mailFrom: platform?.env?.MAIL_FROM ?? "",
  };
};

export const actions: Actions = {
  create: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    const name = String(fd.get("name") ?? "").trim() || "MCP";
    const raw = await createApiToken(db, name);
    return { created: raw };
  },
  delete: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    await deleteApiToken(db, String(fd.get("id") ?? ""));
    return { ok: true };
  },
};
