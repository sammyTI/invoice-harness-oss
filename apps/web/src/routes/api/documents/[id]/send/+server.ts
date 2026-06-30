import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { DOCUMENT_LABELS, formatYen } from "@invoice-harness/shared";
import { ensureShareToken, getDB, getDocument, getEmailTemplate, logEmail, markSent } from "$lib/server/db";
import { renderEmailTemplate, sendEmail } from "$lib/server/email";

// 帳票を取引先へメール送付（公開共有リンク付き）。Resend 未設定時は「送付済み」記録のみ。
export const POST: RequestHandler = async ({ platform, params, url }) => {
  const db = getDB(platform);
  const full = await getDocument(db, params.id);
  if (!full) return json({ error: "not found" }, { status: 404 });
  const token = await ensureShareToken(db, params.id);
  const tpl = (await getEmailTemplate(db, "send")) ?? {
    subject: "【{label}】{number} のご送付（{issuer}）",
    body: "{client} 御中\n\n{label}（{number}）をお送りいたします。\n金額: {amount}\n\n{link}",
  };
  const mail = renderEmailTemplate(tpl, {
    client: full.client.name,
    issuer: full.issuer.name,
    label: DOCUMENT_LABELS[full.doc.type],
    number: full.doc.number,
    subject: full.doc.subject ?? "",
    amount: formatYen(full.totals.total),
    issue_date: full.doc.issue_date,
    due: full.doc.due_date ?? "",
    link: token ? `${url.origin}/share/${token}` : `${url.origin}/doc/${full.doc.id}/print`,
  });
  const result = await sendEmail(platform?.env, { to: full.client.email ?? "", subject: mail.subject, html: mail.html });
  await markSent(db, params.id, new Date().toISOString(), "api");
  await logEmail(db, {
    document_id: params.id,
    recipient: full.client.email ?? "",
    subject: mail.subject,
    kind: "document",
    ok: result.ok,
    detail: result.reason,
  });
  return json({ ok: true, sent: result.ok, reason: result.reason ?? null });
};
