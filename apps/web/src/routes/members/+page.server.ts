import type { Actions, PageServerLoad } from "./$types";
import { fail } from "@sveltejs/kit";
import { countOwners, createMemberWithPassword, deleteMember, getDB, getMemberByEmail, listIssuers, listMembers, logEmail, updateMember } from "$lib/server/db";
import { hashPassword, randomPassword } from "$lib/server/auth";
import { sendEmail } from "$lib/server/email";
import { addMemberIssuer, getMemberIssuers, removeMemberIssuer } from "$lib/server/access";

function credMail(name: string, email: string, password: string, loginUrl: string) {
  const subject = "【Invoice Harness】アカウント発行のお知らせ";
  const html = `<div style="font-family:sans-serif;line-height:1.7;color:#1b2330">
    <p>${name} 様</p>
    <p>Invoice Harness のアカウントを発行しました。下記でログインし、初回にパスワードを変更してください。</p>
    <p>ログインURL：<a href="${loginUrl}">${loginUrl}</a><br>
    メール：${email}<br>初期パスワード：<b>${password}</b></p>
  </div>`;
  return { subject, html };
}

export const load: PageServerLoad = async ({ platform, locals }) => {
  const db = getDB(platform);
  const members = await listMembers(db);
  const assign: Record<string, string[]> = {};
  for (const m of members) assign[m.id] = await getMemberIssuers(db, m.id);
  return {
    members,
    issuers: await listIssuers(db),
    assign,
    me: locals.user ?? null,
    mailEnabled: !!platform?.env?.RESEND_API_KEY,
  };
};

export const actions: Actions = {
  invite: async ({ request, platform, url }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const role = String(fd.get("role") ?? "member");
    if (!name || !email) return fail(400, { error: "名前とメールは必須です。" });
    if (await getMemberByEmail(db, email)) return fail(400, { error: "そのメールは既に登録されています。" });

    const tempPassword = randomPassword(12);
    const { hash, salt } = await hashPassword(tempPassword);
    await createMemberWithPassword(db, name, email, role, hash, salt);

    const loginUrl = `${url.origin}/login`;
    // メール連携済みなら送信。未連携でも資格情報を画面表示してコピペできる
    let emailed = false;
    if (platform?.env?.RESEND_API_KEY) {
      const mail = credMail(name, email, tempPassword, loginUrl);
      const res = await sendEmail(platform?.env, { to: email, subject: mail.subject, html: mail.html });
      emailed = res.ok;
      await logEmail(db, { recipient: email, subject: mail.subject, kind: "invite", ok: res.ok, detail: res.reason });
    }
    return { ok: true, emailed, cred: { name, email, password: tempPassword, loginUrl } };
  },

  update: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    const id = String(fd.get("id") ?? "");
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim() || null;
    const role = String(fd.get("role") ?? "member");
    if (!id || !name) return fail(400, { error: "名前は必須です。" });
    // メール重複チェック（他メンバーと衝突しない）
    if (email) {
      const dup = await getMemberByEmail(db, email);
      if (dup && dup.id !== id) return fail(400, { error: "そのメールは別のメンバーが使用しています。" });
    }
    // 最後のオーナーを member に降格させない
    const target = (await listMembers(db)).find((m) => m.id === id);
    if (target?.role === "owner" && role !== "owner" && (await countOwners(db)) <= 1) {
      return fail(400, { error: "最後のオーナーは権限を変更できません。先に別のメンバーをオーナーにしてください。" });
    }
    await updateMember(db, id, { name, email, role });
    return { ok: true, saved: id };
  },

  delete: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    const id = String(fd.get("id") ?? "");
    // 最後のオーナーは削除させない
    const target = (await listMembers(db)).find((m) => m.id === id);
    if (target?.role === "owner" && (await countOwners(db)) <= 1) {
      return fail(400, { error: "最後のオーナーは削除できません。" });
    }
    await deleteMember(db, id);
    return { ok: true };
  },

  addAccess: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    const memberId = String(fd.get("member_id") ?? "");
    const issuerId = String(fd.get("issuer_id") ?? "");
    if (!memberId || !issuerId) return fail(400, { error: "メンバーと会社を選んでください。" });
    await addMemberIssuer(db, memberId, issuerId);
    return { ok: true };
  },

  removeAccess: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    await removeMemberIssuer(db, String(fd.get("member_id") ?? ""), String(fd.get("issuer_id") ?? ""));
    return { ok: true };
  },
};
