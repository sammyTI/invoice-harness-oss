import type { Actions, PageServerLoad } from "./$types";
import { fail } from "@sveltejs/kit";
import { countOwners, createMemberWithPassword, deleteMember, getDB, getEmailTemplate, getMailConfig, getMemberByEmail, listIssuers, listMembers, logEmail, setPayrollAccess, updateMember } from "$lib/server/db";
import { hashPassword, randomPassword } from "$lib/server/auth";
import { renderEmailTemplate, sendEmail } from "$lib/server/email";
import { addMemberIssuer, getMemberIssuers, removeMemberIssuer, setMemberIssuers } from "$lib/server/access";

// 招待・変更で選べる権限。ホワイトリスト外（demo 等）は member に矯正
function normalizeRole(role: string): string {
  return ["owner", "member", "viewer"].includes(role) ? role : "member";
}

// 招待メールのテンプレ未保存時に使う既定文面（設定 ▸ メールテンプレの既定と一致）
const INVITE_TEMPLATE_DEFAULT = {
  subject: "【{company}】{inviter} さんからログイン情報のご案内",
  body: `{name} 様

{company} の {inviter} さんから、請求書管理ツール（Invoice Harness）への招待が届きました。
下記のログイン情報でログインしてください。

メールアドレス: {email}
初期パスワード: {password}

{link}

初回ログイン後にパスワードの変更をお願いします。`,
};

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
    mailEnabled: !!(await getMailConfig(db, platform?.env)).RESEND_API_KEY,
  };
};

export const actions: Actions = {
  invite: async ({ request, platform, url, locals }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const role = normalizeRole(String(fd.get("role") ?? "member"));
    const sendMail = String(fd.get("send_mail") ?? "") === "on";
    if (!name || !email) return fail(400, { error: "名前とメールは必須です。" });
    if (await getMemberByEmail(db, email)) return fail(400, { error: "そのメールは既に登録されています。" });

    // アクセスを許可する会社（owner は常に全社なので無視）。未選択＝全社（後方互換）
    const allIssuers = await listIssuers(db);
    const selectedIds =
      role === "owner"
        ? []
        : fd.getAll("access_issuers").map((v) => String(v)).filter((v) => allIssuers.some((i) => i.id === v));

    const tempPassword = randomPassword(12);
    const { hash, salt } = await hashPassword(tempPassword);
    await createMemberWithPassword(db, name, email, role, hash, salt);

    // 会社別アクセスの登録はメール送信の有無に関係なく行う（コピー共有運用でも権限は効くべき）
    if (selectedIds.length > 0) {
      const created = await getMemberByEmail(db, email);
      if (created) await setMemberIssuers(db, created.id, selectedIds);
    }

    // 招待結果に表示するアクセス範囲。全社＝null 相当、選択あり＝その社名リスト
    const accessNames =
      selectedIds.length > 0
        ? allIssuers.filter((i) => selectedIds.includes(i.id)).map((i) => i.name)
        : null;

    const loginUrl = `${url.origin}/login`;
    // メール連携済み かつ 送信チェックONのときだけ送信。それ以外は資格情報を画面表示してコピペで共有
    let emailed = false;
    let mailError: string | undefined;
    const mailCfg = await getMailConfig(db, platform?.env);
    if (mailCfg.RESEND_API_KEY && sendMail) {
      // テンプレ（設定 ▸ メールテンプレ）を優先。未保存の環境では既定文面へフォールバック
      const tpl = (await getEmailTemplate(db, "invite")) ?? INVITE_TEMPLATE_DEFAULT;
      // 招待者名（ログイン中ユーザー）と会社名（自社情報の先頭）を差し込み用に用意
      const inviter = locals.user?.name ?? "";
      // 会社が選択されていれば選択社名を「・」で連結（漏洩防止）。未選択（全社）は従来どおり先頭社名
      const company =
        accessNames && accessNames.length > 0 ? accessNames.join("・") : allIssuers[0]?.name ?? "Invoice Harness";
      const mail = renderEmailTemplate(tpl, { name, email, password: tempPassword, link: loginUrl, inviter, company });
      const res = await sendEmail(mailCfg, { to: email, subject: mail.subject, html: mail.html });
      emailed = res.ok;
      // 送信失敗しても招待自体は成功扱い。失敗理由は画面へ返し、初期パスワードは必ず表示する
      if (!res.ok) mailError = res.reason;
      await logEmail(db, { recipient: email, subject: mail.subject, kind: "invite", ok: res.ok, detail: res.reason });
    }
    return { ok: true, emailed, mailError, accessNames, cred: { name, email, password: tempPassword, loginUrl } };
  },

  update: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    const id = String(fd.get("id") ?? "");
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim() || null;
    const role = normalizeRole(String(fd.get("role") ?? "member"));
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
    // 給与・人件費の閲覧許可（owner は常に可なので設定不要）。チェックONで付与、OFFで剥奪。
    if (role !== "owner") {
      await setPayrollAccess(db, id, String(fd.get("can_view_payroll") ?? "") === "on");
    }
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
