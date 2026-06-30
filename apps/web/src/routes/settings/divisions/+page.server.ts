import type { Actions, PageServerLoad } from "./$types";
import { fail } from "@sveltejs/kit";
import { createDivision, deleteDivision, getDB, listDivisions, listIssuers } from "$lib/server/db";

export const load: PageServerLoad = async ({ platform }) => {
  const db = getDB(platform);
  return { divisions: await listDivisions(db), issuers: await listIssuers(db) };
};

export const actions: Actions = {
  create: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    const name = String(fd.get("name") ?? "").trim();
    const issuer_id = String(fd.get("issuer_id") ?? "") || null;
    if (!name) return fail(400, { error: "区分名は必須です。" });
    await createDivision(db, name, issuer_id);
    return { ok: true };
  },
  delete: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    await deleteDivision(db, String(fd.get("id") ?? ""));
    return { ok: true };
  },
};
