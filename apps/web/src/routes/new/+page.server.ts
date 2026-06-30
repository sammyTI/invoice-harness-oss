import type { Actions, PageServerLoad } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import { DOCUMENT_LABELS, type DocumentType } from "@invoice-harness/shared";
import { createDocument, getDB, getDefaultNoteBody, getDocDefaultNotes, listClients, listDivisions, listItems, listIssuers, listNoteTemplates } from "$lib/server/db";
import { getActor } from "$lib/server/audit";
import { allowedIssuerIds, canAccessIssuer } from "$lib/server/access";

const VALID: DocumentType[] = [
  "estimate",
  "delivery_note",
  "order",
  "invoice",
  "receipt",
  "payment_notice",
];

function normType(v: string | null): DocumentType {
  return VALID.includes(v as DocumentType) ? (v as DocumentType) : "invoice";
}

export const load: PageServerLoad = async ({ platform, url, locals }) => {
  const db = getDB(platform);
  const type = normType(url.searchParams.get("type"));
  const allowed = await allowedIssuerIds(db, locals.user);
  return {
    type,
    label: DOCUMENT_LABELS[type],
    issuers: (await listIssuers(db)).filter((i) => canAccessIssuer(allowed, i.id)),
    clients: await listClients(db),
    items: await listItems(db),
    // 全社共通(issuer_id=null)＋閲覧可能な会社の部門のみ（他社の部門名をクライアントに渡さない）
    divisions: (await listDivisions(db)).filter((d) => !d.issuer_id || canAccessIssuer(allowed, d.issuer_id)),
    // 種別ごとの既定備考があれば優先、なければ「既定」備考テンプレートを初期表示
    defaultNotes: (await getDocDefaultNotes(db, type)) || (await getDefaultNoteBody(db)),
    noteTemplates: await listNoteTemplates(db),
  };
};

export const actions: Actions = {
  default: async ({ request, platform, locals }) => {
    const db = getDB(platform);
    const fd = await request.formData();

    const type = normType(String(fd.get("type") ?? ""));
    const issuer_id = String(fd.get("issuer_id") ?? "");
    let client_id = String(fd.get("client_id") ?? "");
    const issue_date = String(fd.get("issue_date") ?? "");

    const allowed = await allowedIssuerIds(db, locals.user);
    if (!canAccessIssuer(allowed, issuer_id)) return fail(403, { error: "この会社（発行元）で作成する権限がありません。" });

    // 新規取引先をその場で登録（client_id が "__new__" のとき）
    if (client_id === "__new__") {
      const newName = String(fd.get("new_client_name") ?? "").trim();
      if (!newName) return fail(400, { error: "新規取引先名を入力してください。" });
      const newId = crypto.randomUUID();
      await db
        .prepare(
          `INSERT INTO clients (id, name, honorific, contact, postal_code, address, email)
           VALUES (?1,?2,?3,?4,?5,?6,?7)`
        )
        .bind(
          newId,
          newName,
          String(fd.get("new_client_honorific") ?? "御中") || "御中",
          String(fd.get("new_client_contact") ?? "") || null,
          String(fd.get("new_client_postal") ?? "") || null,
          String(fd.get("new_client_address") ?? "") || null,
          String(fd.get("new_client_email") ?? "") || null
        )
        .run();
      client_id = newId;
    }
    const due_date = String(fd.get("due_date") ?? "") || null;
    const subject = String(fd.get("subject") ?? "") || null;
    const notes = String(fd.get("notes") ?? "") || null;
    const division_id = String(fd.get("division_id") ?? "") || null;

    const names = fd.getAll("line_name").map((v) => String(v));
    const qtys = fd.getAll("line_qty").map((v) => Number(v) || 0);
    const units = fd.getAll("line_unit").map((v) => String(v));
    const prices = fd.getAll("line_price").map((v) => Number(v) || 0);
    const rates = fd.getAll("line_rate").map((v) => Number(v) || 10);

    const lines = names
      .map((n, i) => ({
        name: n,
        quantity: qtys[i] ?? 1,
        unit: units[i] || "式",
        unit_price: prices[i] ?? 0,
        tax_rate: rates[i] ?? 10,
      }))
      .filter((l) => l.name.trim() !== "");

    if (!issuer_id || !client_id || !issue_date || lines.length === 0) {
      return fail(400, { error: "発行元・取引先・発行日・明細1行以上は必須です。" });
    }

    const id = await createDocument(
      db,
      { type, issuer_id, client_id, issue_date, due_date, subject, notes, division_id, lines },
      getActor({ request, locals })
    );

    throw redirect(303, `/doc/${id}`);
  },
};
