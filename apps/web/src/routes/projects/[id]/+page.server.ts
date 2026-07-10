import type { Actions, PageServerLoad } from "./$types";
import { error, fail, redirect } from "@sveltejs/kit";
import { deleteProject, getDB, getProject, listClients, listDivisions, listDocuments, listIssuers, updateProject } from "$lib/server/db";
import { allowedIssuerIds, canAccessIssuer } from "$lib/server/access";

export const load: PageServerLoad = async ({ platform, params, locals }) => {
  const db = getDB(platform);
  const project = await getProject(db, params.id);
  if (!project) throw error(404, "プロジェクトが見つかりません");
  const allowed = await allowedIssuerIds(db, locals.user);
  if (project.issuer_id && !canAccessIssuer(allowed, project.issuer_id)) throw error(404, "プロジェクトが見つかりません");
  const docs = await listDocuments(db, undefined, allowed, { projectId: params.id });
  return {
    project,
    docs,
    clients: await listClients(db),
    issuers: (await listIssuers(db)).filter((i) => canAccessIssuer(allowed, i.id)),
    divisions: (await listDivisions(db)).filter((d) => !d.issuer_id || canAccessIssuer(allowed, d.issuer_id)),
  };
};

export const actions: Actions = {
  update: async ({ request, platform, params }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    const name = String(fd.get("name") ?? "").trim();
    const client_id = String(fd.get("client_id") ?? "");
    if (!name || !client_id) return fail(400, { error: "案件名と顧客は必須です。" });
    await updateProject(db, params.id, {
      name,
      client_id,
      issuer_id: String(fd.get("issuer_id") ?? "") || null,
      division_id: String(fd.get("division_id") ?? "") || null,
      person: String(fd.get("person") ?? "").trim() || null,
      status: String(fd.get("status") ?? "active"),
      start_date: String(fd.get("start_date") ?? "") || null,
      end_date: String(fd.get("end_date") ?? "") || null,
      detail: String(fd.get("detail") ?? "").trim() || null,
    });
    return { ok: true };
  },
  delete: async ({ platform, params }) => {
    const db = getDB(platform);
    await deleteProject(db, params.id);
    throw redirect(303, "/projects");
  },
};
