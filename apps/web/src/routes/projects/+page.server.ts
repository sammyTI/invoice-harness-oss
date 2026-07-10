import type { Actions, PageServerLoad } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import { createProject, getDB, listClients, listDivisions, listIssuers, listProjects } from "$lib/server/db";
import { allowedIssuerIds, canAccessIssuer } from "$lib/server/access";

export const load: PageServerLoad = async ({ platform, url, locals }) => {
  const db = getDB(platform);
  const allowed = await allowedIssuerIds(db, locals.user);
  const projects = (await listProjects(db)).filter((p) => !p.issuer_id || canAccessIssuer(allowed, p.issuer_id));
  return {
    projects,
    clients: await listClients(db),
    issuers: (await listIssuers(db)).filter((i) => canAccessIssuer(allowed, i.id)),
    divisions: (await listDivisions(db)).filter((d) => !d.issuer_id || canAccessIssuer(allowed, d.issuer_id)),
    presetClient: url.searchParams.get("client") ?? "",
  };
};

export const actions: Actions = {
  create: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    const name = String(fd.get("name") ?? "").trim();
    const client_id = String(fd.get("client_id") ?? "");
    if (!name || !client_id) return fail(400, { error: "案件名と顧客は必須です。" });
    const id = await createProject(db, {
      name,
      client_id,
      issuer_id: String(fd.get("issuer_id") ?? "") || null,
      division_id: String(fd.get("division_id") ?? "") || null,
      person: String(fd.get("person") ?? "").trim() || null,
      start_date: String(fd.get("start_date") ?? "") || null,
      detail: String(fd.get("detail") ?? "").trim() || null,
    });
    throw redirect(303, `/projects/${id}`);
  },
};
