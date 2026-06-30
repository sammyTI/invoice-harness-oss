import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { deleteDocument, DocumentLockedError, getDB, getDocument, updateDocument } from "$lib/server/db";

export const GET: RequestHandler = async ({ platform, params }) => {
  const db = getDB(platform);
  const full = await getDocument(db, params.id);
  if (!full) return json({ error: "not found" }, { status: 404 });
  return json(full);
};

// 下書きの内容を更新（部分指定可・未指定は現状維持）。発行済みはロックで弾く。
export const PUT: RequestHandler = async ({ platform, params, request }) => {
  const db = getDB(platform);
  const full = await getDocument(db, params.id);
  if (!full) return json({ error: "not found" }, { status: 404 });
  const b = (await request.json().catch(() => ({}))) as {
    issue_date?: string; due_date?: string | null; subject?: string | null; notes?: string | null;
    lines?: { name: string; quantity?: number; unit?: string; unit_price?: number; tax_rate?: number }[];
  };
  const lines = b.lines
    ? b.lines.map((l) => ({ name: String(l.name ?? ""), quantity: Number(l.quantity ?? 1), unit: String(l.unit ?? "式"), unit_price: Number(l.unit_price ?? 0), tax_rate: Number(l.tax_rate ?? 10) })).filter((l) => l.name)
    : full.lines.map((l) => ({ name: l.name, description: l.description, quantity: l.quantity, unit: l.unit, unit_price: l.unit_price, tax_rate: l.tax_rate }));
  try {
    await updateDocument(db, params.id, {
      issuer_id: full.doc.issuer_id,
      client_id: full.doc.client_id,
      issue_date: b.issue_date ?? full.doc.issue_date,
      due_date: b.due_date !== undefined ? b.due_date : full.doc.due_date,
      subject: b.subject !== undefined ? b.subject : full.doc.subject,
      notes: b.notes !== undefined ? b.notes : full.doc.notes,
      division_id: full.doc.division_id ?? null,
      lines,
    }, "api");
    return json({ ok: true });
  } catch (e) {
    if (e instanceof DocumentLockedError) return json({ error: "発行済みの帳票は編集できません（取消＋訂正を使用）。" }, { status: 400 });
    throw e;
  }
};

// 帳票を削除（下書きのみ。発行済みは取消/訂正を使う）。
export const DELETE: RequestHandler = async ({ platform, params }) => {
  const db = getDB(platform);
  try {
    const okDel = await deleteDocument(db, params.id, "api");
    if (!okDel) return json({ error: "not found" }, { status: 404 });
    return json({ ok: true });
  } catch (e) {
    if (e instanceof DocumentLockedError) return json({ error: e.message }, { status: 400 });
    throw e;
  }
};
