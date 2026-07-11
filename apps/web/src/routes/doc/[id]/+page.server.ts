import type { Actions, PageServerLoad } from "./$types";
import { error, fail, redirect } from "@sveltejs/kit";
import { DOCUMENT_FLOW, DOCUMENT_LABELS, formatYen, type DocumentType } from "@invoice-harness/shared";
import {
  assignDocumentProject,
  clearShareToken,
  cancelDocument,
  convertDocument,
  createCorrection,
  deleteDocument,
  deletePayment,
  DocumentLockedError,
  duplicateDocument,
  ensureShareToken,
  getDB,
  getDocument,
  getEmailTemplate,
  getProject,
  getSettings,
  getRelated,
  listDivisions,
  listProjects,
  lockDocument,
  logEmail,
  markPaid,
  markSent,
} from "$lib/server/db";
import { renderEmailTemplate, sendEmail } from "$lib/server/email";
import { getActor } from "$lib/server/audit";
import { allowedIssuerIds, assertDocAccess, canAccessIssuer } from "$lib/server/access";

export const load: PageServerLoad = async ({ params, platform, url, locals }) => {
  const db = getDB(platform);
  const full = await getDocument(db, params.id);
  if (!full) throw error(404, "帳票が見つかりません");
  const allowed = await allowedIssuerIds(db, locals.user);
  if (!canAccessIssuer(allowed, full.doc.issuer_id)) throw error(404, "帳票が見つかりません");
  const related = await getRelated(db, full.doc);
  const mailEnabled = !!platform?.env?.RESEND_API_KEY;
  const shareUrl = full.doc.share_token ? `${url.origin}/share/${full.doc.share_token}` : null;
  const divisionName = full.doc.division_id
    ? (await listDivisions(db)).find((d) => d.id === full.doc.division_id)?.name ?? null
    : null;
  const project = full.doc.project_id ? await getProject(db, full.doc.project_id) : null;
  return {
    full,
    related,
    mailEnabled,
    shareUrl,
    divisionName,
    project: project ? { id: project.id, name: project.name } : null,
    projects: (await listProjects(db)).filter((pr) => pr.status !== "done").map((pr) => ({ id: pr.id, name: pr.name, client_name: pr.client_name })),
    requireProject: (await getSettings(db)).require_project,
  };
};

export const actions: Actions = {
  duplicate: async ({ params, platform, request, locals }) => {
    const db = getDB(platform);
    await assertDocAccess(db, locals.user, params.id);
    const newId = await duplicateDocument(db, params.id, getActor({ request, locals }));
    if (!newId) throw error(404, "複製元が見つかりません");
    throw redirect(303, `/doc/${newId}/edit`);
  },

  assignProject: async ({ params, platform, request, locals }) => {
    const db = getDB(platform);
    await assertDocAccess(db, locals.user, params.id);
    const fd = await request.formData();
    const projectId = String(fd.get("project_id") ?? "") || null;
    await assignDocumentProject(db, params.id, projectId);
    return { projectAssigned: "ok" as const };
  },

  convert: async ({ params, platform, request, locals }) => {
    const db = getDB(platform);
    await assertDocAccess(db, locals.user, params.id);
    const fd = await request.formData();
    const target = String(fd.get("target") ?? "") as DocumentType;
    const src = await getDocument(db, params.id);
    if (!src) throw error(404, "変換元が見つかりません");
    if (!DOCUMENT_FLOW[src.doc.type].includes(target)) return fail(400, { error: "この変換はできません。" });
    const newId = await convertDocument(db, params.id, target, getActor({ request, locals }));
    if (!newId) throw error(404, "変換に失敗しました");
    throw redirect(303, `/doc/${newId}`);
  },

  lock: async ({ params, platform, request, locals }) => {
    const db = getDB(platform);
    await assertDocAccess(db, locals.user, params.id);
    await lockDocument(db, params.id, getActor({ request, locals }));
    return { locked: "ok" as const };
  },

  cancel: async ({ params, platform, request, locals }) => {
    const db = getDB(platform);
    await assertDocAccess(db, locals.user, params.id);
    const full = await getDocument(db, params.id);
    if (!full) throw error(404, "帳票が見つかりません");
    if (full.paid_total > 0) {
      return fail(400, { error: "入金記録があるため取消できません。先に入金記録を取り消してから取消してください。" });
    }
    await cancelDocument(db, params.id, getActor({ request, locals }));
    return { canceled: "ok" as const };
  },

  correct: async ({ params, platform, request, locals }) => {
    const db = getDB(platform);
    await assertDocAccess(db, locals.user, params.id);
    const newId = await createCorrection(db, params.id, getActor({ request, locals }));
    if (!newId) throw error(404, "訂正元が見つかりません");
    throw redirect(303, `/doc/${newId}/edit`);
  },

  share: async ({ params, platform, locals }) => {
    const db = getDB(platform);
    await assertDocAccess(db, locals.user, params.id);
    const token = await ensureShareToken(db, params.id);
    if (!token) throw error(404, "帳票が見つかりません");
    return { shared: "ok" as const };
  },

  unshare: async ({ params, platform, locals }) => {
    const db = getDB(platform);
    await assertDocAccess(db, locals.user, params.id);
    await clearShareToken(db, params.id);
    return { shared: "off" as const };
  },

  // メール以外（郵送・手渡し・別ツール等）で送った場合に、手動で送付済みにする。
  markSent: async ({ params, platform, request, locals }) => {
    const db = getDB(platform);
    await assertDocAccess(db, locals.user, params.id);
    await markSent(db, params.id, new Date().toISOString(), getActor({ request, locals }));
    return { sent: "manual" as const };
  },

  send: async ({ params, platform, url, request, locals }) => {
    const db = getDB(platform);
    await assertDocAccess(db, locals.user, params.id);
    const full = await getDocument(db, params.id);
    if (!full) throw error(404, "帳票が見つかりません");
    // 取引先がログインなしで開ける公開共有リンクを必ず使う（/doc/.../print はログイン必須で開けない）
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
    const result = await sendEmail(platform?.env, {
      to: full.client.email ?? "",
      subject: mail.subject,
      html: mail.html,
    });
    await markSent(db, params.id, new Date().toISOString(), getActor({ request, locals }));
    await logEmail(db, {
      document_id: params.id,
      recipient: full.client.email ?? "",
      subject: mail.subject,
      kind: "document",
      ok: result.ok,
      detail: result.reason,
    });
    if (result.ok) return { sent: "ok" as const };
    return { sent: "marked" as const, reason: result.reason ?? "メール未送信" };
  },

  pay: async ({ params, platform, request, locals }) => {
    const db = getDB(platform);
    await assertDocAccess(db, locals.user, params.id);
    const full = await getDocument(db, params.id);
    if (!full) throw error(404, "帳票が見つかりません");
    const fd = await request.formData();
    const paidDate = String(fd.get("paid_date") ?? "") || new Date().toISOString().slice(0, 10);
    const amount = Number(fd.get("amount")) || full.totals.payable || full.totals.total;
    const method = String(fd.get("method") ?? "") || null;
    const reference = String(fd.get("reference") ?? "").trim() || null;
    const fee = Math.max(0, Number(fd.get("fee")) || 0);
    if (amount <= 0) return fail(400, { error: "入金額が不正です。" });
    await markPaid(db, params.id, paidDate, amount, method, getActor({ request, locals }), reference, fee);
    return { paid: "ok" as const };
  },

  delpay: async ({ params, platform, request, locals }) => {
    const db = getDB(platform);
    await assertDocAccess(db, locals.user, params.id);
    const fd = await request.formData();
    await deletePayment(db, String(fd.get("payment_id") ?? ""), getActor({ request, locals }));
    return { paid: "ok" as const };
  },

  remove: async ({ params, platform, request, locals }) => {
    const db = getDB(platform);
    await assertDocAccess(db, locals.user, params.id);
    try {
      await deleteDocument(db, params.id, getActor({ request, locals }));
    } catch (e) {
      if (e instanceof DocumentLockedError) return fail(400, { error: e.message });
      throw e;
    }
    throw redirect(303, "/");
  },
};
