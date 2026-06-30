import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { DOCUMENT_ORDER, type DocumentType } from "@invoice-harness/shared";
import { createDocument, getDB, listClients, listDivisions, listDocuments, listIssuers } from "$lib/server/db";

export const GET: RequestHandler = async ({ platform, url }) => {
  const db = getDB(platform);
  const type = url.searchParams.get("type") as DocumentType | null;
  const docs = await listDocuments(db, type && DOCUMENT_ORDER.includes(type) ? type : undefined);
  return json({ documents: docs });
};

export const POST: RequestHandler = async ({ platform, request }) => {
  const db = getDB(platform);
  const body = (await request.json().catch(() => ({}))) as {
    type?: string;
    client_id?: string;
    client_name?: string;
    issuer_id?: string;
    issuer_name?: string;
    division_id?: string;
    division_name?: string;
    issue_date?: string;
    due_date?: string;
    subject?: string;
    notes?: string;
    issuer_person?: string;
    lines?: { name: string; quantity?: number; unit?: string; unit_price?: number; tax_rate?: number }[];
  };

  const type = (body.type as DocumentType) ?? "invoice";
  if (!DOCUMENT_ORDER.includes(type)) return json({ error: "invalid type" }, { status: 400 });

  // issuer（id 優先、無ければ会社名で照合、それも無ければ先頭）
  const issuers = await listIssuers(db);
  if (!issuers.length) return json({ error: "no issuer configured" }, { status: 400 });
  let issuerId = body.issuer_id;
  if (!issuerId && body.issuer_name) {
    const hit = issuers.find((i) => i.name === body.issuer_name);
    if (!hit) return json({ error: `issuer not found: ${body.issuer_name}` }, { status: 400 });
    issuerId = hit.id;
  }
  if (!issuerId) issuerId = issuers[0].id;

  // division（id 優先、無ければ部門名で照合。会社共通＋その会社の部門のみ）
  let divisionId = body.division_id ?? null;
  if (!divisionId && body.division_name) {
    const divs = await listDivisions(db);
    const hit = divs.find((d) => d.name === body.division_name && (!d.issuer_id || d.issuer_id === issuerId));
    if (!hit) return json({ error: `division not found: ${body.division_name}` }, { status: 400 });
    divisionId = hit.id;
  }

  // client (id or name; create if name not found)
  let clientId = body.client_id;
  if (!clientId) {
    const name = (body.client_name ?? "").trim();
    if (!name) return json({ error: "client_id or client_name required" }, { status: 400 });
    const clients = await listClients(db);
    const hit = clients.find((c) => c.name === name);
    if (hit) clientId = hit.id;
    else {
      clientId = crypto.randomUUID();
      await db
        .prepare("INSERT INTO clients (id, name, honorific) VALUES (?1,?2,'御中')")
        .bind(clientId, name)
        .run();
    }
  }

  const lines = (body.lines ?? []).map((l) => ({
    name: String(l.name ?? ""),
    quantity: Number(l.quantity ?? 1),
    unit: String(l.unit ?? "式"),
    unit_price: Number(l.unit_price ?? 0),
    tax_rate: Number(l.tax_rate ?? 10),
  })).filter((l) => l.name);
  if (!lines.length) return json({ error: "lines required" }, { status: 400 });

  const id = await createDocument(
    db,
    {
      type,
      issuer_id: issuerId,
      client_id: clientId,
      issue_date: body.issue_date || new Date().toISOString().slice(0, 10),
      due_date: body.due_date ?? null,
      subject: body.subject ?? null,
      notes: body.notes ?? null,
      division_id: divisionId,
      // API/AI 発行は担当者を任意指定（省略時は描画で issuers.person_name にフォールバック）。
      issuer_person: body.issuer_person ?? null,
      lines,
    },
    "api"
  );
  return json({ id, ok: true });
};
