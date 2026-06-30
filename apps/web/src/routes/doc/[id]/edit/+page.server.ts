import type { Actions, PageServerLoad } from "./$types";
import { error, fail, redirect } from "@sveltejs/kit";
import { DOCUMENT_LABELS } from "@invoice-harness/shared";
import { DocumentLockedError, getDB, getDocument, listClients, listDivisions, listIssuers, listNoteTemplates, updateDocument } from "$lib/server/db";
import { getActor } from "$lib/server/audit";
import { allowedIssuerIds, canAccessIssuer } from "$lib/server/access";

export const load: PageServerLoad = async ({ params, platform, locals }) => {
  const db = getDB(platform);
  const full = await getDocument(db, params.id);
  if (!full) throw error(404, "帳票が見つかりません");
  const allowed = await allowedIssuerIds(db, locals.user);
  if (!canAccessIssuer(allowed, full.doc.issuer_id)) throw error(404, "帳票が見つかりません");
  if (full.doc.locked) throw redirect(303, `/doc/${params.id}`);
  return {
    full,
    label: DOCUMENT_LABELS[full.doc.type],
    issuers: (await listIssuers(db)).filter((i) => canAccessIssuer(allowed, i.id)),
    clients: await listClients(db),
    divisions: (await listDivisions(db)).filter((d) => !d.issuer_id || canAccessIssuer(allowed, d.issuer_id)),
    noteTemplates: await listNoteTemplates(db),
  };
};

export const actions: Actions = {
  default: async ({ request, params, platform, locals }) => {
    const db = getDB(platform);
    const fd = await request.formData();

    const issuer_id = String(fd.get("issuer_id") ?? "");
    const client_id = String(fd.get("client_id") ?? "");
    const issue_date = String(fd.get("issue_date") ?? "");
    const due_date = String(fd.get("due_date") ?? "") || null;
    const subject = String(fd.get("subject") ?? "") || null;
    const notes = String(fd.get("notes") ?? "") || null;
    const division_id = String(fd.get("division_id") ?? "") || null;

    const allowed = await allowedIssuerIds(db, locals.user);
    const current = await getDocument(db, params.id);
    if (!current || !canAccessIssuer(allowed, current.doc.issuer_id) || !canAccessIssuer(allowed, issuer_id)) {
      return fail(403, { error: "この帳票を編集する権限がありません。" });
    }

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

    try {
      await updateDocument(
        db,
        params.id,
        { issuer_id, client_id, issue_date, due_date, subject, notes, division_id, lines },
        getActor({ request, locals })
      );
    } catch (e) {
      if (e instanceof DocumentLockedError) return fail(400, { error: e.message });
      throw e;
    }

    throw redirect(303, `/doc/${params.id}`);
  },
};
