import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { getDB, updateEmailTemplate } from "$lib/server/db";

// メール文面テンプレートを更新（件名・本文）。
export const PUT: RequestHandler = async ({ platform, params, request }) => {
  const db = getDB(platform);
  const b = (await request.json().catch(() => ({}))) as { subject?: string; body?: string };
  await updateEmailTemplate(db, params.key, (b.subject ?? "").trim(), (b.body ?? "").trim());
  return json({ ok: true });
};
