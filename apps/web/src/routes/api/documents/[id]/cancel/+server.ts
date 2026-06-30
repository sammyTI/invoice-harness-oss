import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { cancelDocument, getDB, getDocument } from "$lib/server/db";

// 帳票を取消（無効化）。原本は保持・売上集計から除外。入金記録があると不可。
export const POST: RequestHandler = async ({ platform, params }) => {
  const db = getDB(platform);
  const full = await getDocument(db, params.id);
  if (!full) return json({ error: "not found" }, { status: 404 });
  if (full.paid_total > 0) return json({ error: "入金記録があるため取消できません。先に入金を取り消してください。" }, { status: 400 });
  await cancelDocument(db, params.id, "api");
  return json({ ok: true });
};
