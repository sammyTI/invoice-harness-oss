import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import type { DocumentType } from "@invoice-harness/shared";
import { getDB, setDocTemplate } from "$lib/server/db";

const TYPES = ["estimate", "delivery_note", "order", "invoice", "receipt", "payment_notice"];

// 帳票種別ごとの既定備考を設定。
export const PUT: RequestHandler = async ({ platform, params, request }) => {
  const db = getDB(platform);
  if (!TYPES.includes(params.type)) return json({ error: "invalid type" }, { status: 400 });
  const b = (await request.json().catch(() => ({}))) as { notes?: string };
  await setDocTemplate(db, params.type as DocumentType, (b.notes ?? "").trim());
  return json({ ok: true });
};
