import type { Actions, PageServerLoad } from "./$types";
import { fail } from "@sveltejs/kit";
import { createIssuer, getDB, listIssuers, updateIssuer, type IssuerInput } from "$lib/server/db";

function parse(fd: FormData): IssuerInput {
  return {
    name: String(fd.get("name") ?? "").trim(),
    registration_number: String(fd.get("registration_number") ?? "").trim() || null,
    person_name: String(fd.get("person_name") ?? "").trim() || null,
    postal_code: String(fd.get("postal_code") ?? "").trim() || null,
    address: String(fd.get("address") ?? "").trim() || null,
    tel: String(fd.get("tel") ?? "").trim() || null,
    email: String(fd.get("email") ?? "").trim() || null,
    bank_info: String(fd.get("bank_info") ?? "").trim() || null,
    fiscal_month: ((): number | null => {
      const v = Number(fd.get("fiscal_month"));
      return Number.isInteger(v) && v >= 1 && v <= 12 ? v : null;
    })(),
  };
}

export const load: PageServerLoad = async ({ platform }) => {
  const db = getDB(platform);
  return { issuers: await listIssuers(db) };
};

export const actions: Actions = {
  update: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    const id = String(fd.get("id") ?? "");
    const f = parse(fd);
    if (!id || !f.name) return fail(400, { error: "自社名は必須です。" });
    await updateIssuer(db, id, f);
    return { ok: true };
  },
  create: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    const f = parse(fd);
    if (!f.name) return fail(400, { error: "自社名は必須です。" });
    await createIssuer(db, f);
    return { ok: true };
  },
};
