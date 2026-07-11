import type { Actions, PageServerLoad } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import { createProject, getDB, listClients, listDivisions, listIssuers, listMembers, listProjects } from "$lib/server/db";
import { allowedIssuerIds, canAccessIssuer } from "$lib/server/access";

const PAGE_SIZE = 20;

export const load: PageServerLoad = async ({ platform, url, locals }) => {
  const db = getDB(platform);
  const allowed = await allowedIssuerIds(db, locals.user);
  let projects = (await listProjects(db)).filter((p) => !p.issuer_id || canAccessIssuer(allowed, p.issuer_id));

  // 検索・絞り込み（会社＝発行元・顧客・案件名/顧客名/担当者のキーワード＋状態）
  const iss = url.searchParams.get("iss") ?? "";
  const cli = url.searchParams.get("cli") ?? "";
  const q = (url.searchParams.get("q") ?? "").trim();
  const st = url.searchParams.get("st") ?? "";
  if (iss && canAccessIssuer(allowed, iss)) projects = projects.filter((p) => p.issuer_id === iss);
  if (cli) projects = projects.filter((p) => p.client_id === cli);
  if (q) {
    const needle = q.toLowerCase();
    projects = projects.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.client_name.toLowerCase().includes(needle) ||
        (p.person ?? "").toLowerCase().includes(needle)
    );
  }
  if (st === "proposed" || st === "active" || st === "done") projects = projects.filter((p) => p.status === st);

  // ページング（docs/[type] の実装を踏襲: 絞り込み後の件数から page/pageCount を確定）
  const total = projects.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(pageCount, Math.max(1, Number(url.searchParams.get("page")) || 1));
  const pageProjects = projects.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const clientsOptions = await listClients(db);

  return {
    iss,
    cli,
    q,
    st,
    page,
    pageCount,
    total,
    projects: pageProjects,
    clients: clientsOptions,
    clientsOptions: clientsOptions.map((c) => ({ id: c.id, name: c.name })),
    issuers: (await listIssuers(db)).filter((i) => canAccessIssuer(allowed, i.id)),
    divisions: (await listDivisions(db)).filter((d) => !d.issuer_id || canAccessIssuer(allowed, d.issuer_id)),
    members: (await listMembers(db)).filter((m) => m.status === "active").map((m) => m.name),
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
      status: String(fd.get("status") ?? "active"),
      start_date: String(fd.get("start_date") ?? "") || null,
      detail: String(fd.get("detail") ?? "").trim() || null,
    });
    throw redirect(303, `/projects/${id}`);
  },
};
