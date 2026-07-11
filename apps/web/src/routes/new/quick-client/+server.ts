import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { createClient, getDB } from "$lib/server/db";

// /new の入力を失わずに取引先を追加するためのインライン作成API（画面内fetch専用）
// セッション認証・書き込みガード（viewerのリダイレクト）はhooksで処理済み。
export const POST: RequestHandler = async ({ request, platform }) => {
  const db = getDB(platform);
  const body = (await request.json().catch(() => ({}))) as {
    name?: unknown;
    honorific?: unknown;
    contact?: unknown;
    email?: unknown;
  };

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return json({ error: "取引先名を入力してください。" }, { status: 400 });

  const id = await createClient(db, {
    name,
    honorific: typeof body.honorific === "string" && body.honorific ? body.honorific : "御中",
    contact: typeof body.contact === "string" && body.contact ? body.contact : null,
    email: typeof body.email === "string" && body.email ? body.email : null,
  });

  return json({ id, name, ok: true });
};
