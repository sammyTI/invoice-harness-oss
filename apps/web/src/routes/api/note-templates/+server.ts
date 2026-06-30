import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { createNoteTemplate, getDB, listNoteTemplates } from "$lib/server/db";

// 備考テンプレートの一覧。
export const GET: RequestHandler = async ({ platform }) => {
  const db = getDB(platform);
  return json({ templates: await listNoteTemplates(db) });
};

// 備考テンプレートを新規登録（AI/MCP から）。
export const POST: RequestHandler = async ({ platform, request }) => {
  const db = getDB(platform);
  const b = (await request.json().catch(() => ({}))) as { name?: string; body?: string };
  const name = (b.name ?? "").trim();
  const body = (b.body ?? "").trim();
  if (!name || !body) return json({ error: "name and body are required" }, { status: 400 });
  await createNoteTemplate(db, name, body);
  return json({ ok: true });
};
