import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { deleteProject, getDB, getProject, listDocuments, updateProject } from "$lib/server/db";

// プロジェクト詳細（収支＋紐づく帳票つき）。
export const GET: RequestHandler = async ({ platform, params }) => {
  const db = getDB(platform);
  const project = await getProject(db, params.id);
  if (!project) return json({ error: "not found" }, { status: 404 });
  const docs = await listDocuments(db, undefined, undefined, { projectId: params.id });
  return json({ project, documents: docs });
};

// プロジェクトを更新（部分指定・未指定は現状維持）。
export const PUT: RequestHandler = async ({ platform, params, request }) => {
  const db = getDB(platform);
  const cur = await getProject(db, params.id);
  if (!cur) return json({ error: "not found" }, { status: 404 });
  const b = (await request.json().catch(() => ({}))) as Record<string, string | null | undefined>;
  const pick = (k: string, fallback: string | null) =>
    b[k] === undefined ? fallback : (typeof b[k] === "string" ? (b[k] as string).trim() || null : null);
  await updateProject(db, params.id, {
    name: (pick("name", cur.name) as string) || cur.name,
    client_id: (pick("client_id", cur.client_id) as string) || cur.client_id,
    issuer_id: pick("issuer_id", cur.issuer_id),
    division_id: pick("division_id", cur.division_id),
    detail: pick("detail", cur.detail),
    status: (pick("status", cur.status) as string) || cur.status,
    start_date: pick("start_date", cur.start_date),
    end_date: pick("end_date", cur.end_date),
    person: pick("person", cur.person),
  });
  return json({ ok: true });
};

// プロジェクトを削除（帳票は残り、割当だけ外れる）。
export const DELETE: RequestHandler = async ({ platform, params }) => {
  const db = getDB(platform);
  await deleteProject(db, params.id);
  return json({ ok: true });
};
