import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { createProject, getDB, listClients, listIssuers, listDivisions, listProjects } from "$lib/server/db";

// プロジェクト一覧（顧客名・請求/支払/粗利つき）。?client=<id or 名前> で絞り込み。
export const GET: RequestHandler = async ({ platform, url }) => {
  const db = getDB(platform);
  const q = url.searchParams.get("client");
  let clientId: string | undefined;
  if (q) {
    const clients = await listClients(db);
    clientId = clients.find((c) => c.id === q || c.name === q)?.id ?? "__none__";
  }
  return json({ projects: await listProjects(db, clientId) });
};

// プロジェクトを新規作成。client_name（無ければ id）で顧客を指定。
export const POST: RequestHandler = async ({ platform, request }) => {
  const db = getDB(platform);
  const b = (await request.json().catch(() => ({}))) as {
    name?: string; client_id?: string; client_name?: string;
    issuer_name?: string; division_name?: string;
    detail?: string; person?: string; start_date?: string; end_date?: string;
  };
  const name = (b.name ?? "").trim();
  if (!name) return json({ error: "name is required" }, { status: 400 });
  let clientId = b.client_id;
  if (!clientId && b.client_name) {
    clientId = (await listClients(db)).find((c) => c.name === b.client_name)?.id;
    if (!clientId) return json({ error: `client not found: ${b.client_name}` }, { status: 400 });
  }
  if (!clientId) return json({ error: "client_id or client_name is required" }, { status: 400 });
  const issuerId = b.issuer_name ? (await listIssuers(db)).find((i) => i.name === b.issuer_name)?.id ?? null : null;
  const divisionId = b.division_name ? (await listDivisions(db)).find((d) => d.name === b.division_name)?.id ?? null : null;
  const id = await createProject(db, {
    name,
    client_id: clientId,
    issuer_id: issuerId,
    division_id: divisionId,
    detail: b.detail?.trim() || null,
    person: b.person?.trim() || null,
    start_date: b.start_date || null,
    end_date: b.end_date || null,
  });
  return json({ id, ok: true });
};
