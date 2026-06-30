import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { deleteNoteTemplate, getDB, setDefaultNoteTemplate } from "$lib/server/db";

// 備考テンプレートを削除。
export const DELETE: RequestHandler = async ({ platform, params }) => {
  const db = getDB(platform);
  await deleteNoteTemplate(db, params.id);
  return json({ ok: true });
};

// このテンプレートを既定（新規帳票に自動挿入）にする。
export const POST: RequestHandler = async ({ platform, params }) => {
  const db = getDB(platform);
  await setDefaultNoteTemplate(db, params.id);
  return json({ ok: true });
};
