import type { Actions, PageServerLoad } from "./$types";
import { fail } from "@sveltejs/kit";
import { createApiToken, deleteApiToken, emailUsage, getDB, getMailConfig, listApiTokens, logEmail, setMailConfig } from "$lib/server/db";
import { sendEmail } from "$lib/server/email";

/** APIキーの末尾4文字だけ見せるマスク（フルキーはクライアントに返さない）。 */
function maskKey(key: string): string {
  const tail = key.slice(-4);
  return `re_****${tail}`;
}

export const load: PageServerLoad = async ({ platform, locals }) => {
  const db = getDB(platform);
  const mail = await getMailConfig(db, platform?.env);
  return {
    tokens: await listApiTokens(db),
    usage: await emailUsage(db),
    // テスト送信の宛先既定値（ログイン中ユーザーのメール）
    myEmail: locals.user?.email ?? "",
    mail: {
      configured: !!mail.RESEND_API_KEY,
      source: mail.source,
      maskedKey: mail.RESEND_API_KEY ? maskKey(mail.RESEND_API_KEY) : null,
      from: mail.MAIL_FROM ?? null,
    },
  };
};

export const actions: Actions = {
  create: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    const name = String(fd.get("name") ?? "").trim() || "MCP";
    const raw = await createApiToken(db, name);
    return { created: raw };
  },
  delete: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    await deleteApiToken(db, String(fd.get("id") ?? ""));
    return { ok: true };
  },

  // メール連携（Resend）を保存。キーそのものは監査ログ・レスポンスに残さない。
  saveMail: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    const keyInput = String(fd.get("resend_api_key") ?? "").trim();
    const from = String(fd.get("mail_from") ?? "").trim() || null;
    const current = await getMailConfig(db, platform?.env);

    let key: string | null;
    if (keyInput) {
      if (!keyInput.startsWith("re_")) {
        return fail(400, { mailError: "APIキーは re_ で始まる Resend のキーを入力してください。" });
      }
      key = keyInput;
    } else {
      // 空入力ならDB既存キーを維持（env由来のときはDBには何も保存しない）
      key = current.source === "db" ? (current.RESEND_API_KEY ?? null) : null;
      if (!key && current.source !== "db") {
        return fail(400, { mailError: "APIキーを入力してください。" });
      }
    }
    await setMailConfig(db, key, from);
    return { mailSaved: true };
  },

  clearMail: async ({ platform }) => {
    const db = getDB(platform);
    await setMailConfig(db, null, null);
    return { mailCleared: true };
  },

  // Resend連携の動作確認用テストメールを送る。
  testMail: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    const to = String(fd.get("to") ?? "").trim();
    if (!to) {
      return fail(400, { mailTestError: "宛先メールアドレスを入力してください。" });
    }

    const mail = await getMailConfig(db, platform?.env);
    if (!mail.RESEND_API_KEY) {
      return fail(400, { mailTestError: "Resend未連携です。先にAPIキーを保存してください。" });
    }

    const now = new Date().toISOString();
    const html = `<div style="font-family:sans-serif;line-height:1.7;color:#1b2330">
  <p>このメールが届いていれば、Resend連携は正常に動作しています。</p>
  <p style="color:#8a94a3;font-size:12px;margin-top:18px">差出人設定：${mail.MAIL_FROM || "(既定 onboarding@resend.dev)"}<br>送信日時：${now}</p>
</div>`;

    const result = await sendEmail(mail, {
      to,
      subject: "【テスト送信】Invoice Harness メール連携の確認",
      html,
    });

    // email_log.document_id は NULL 許容なのでテスト送信も記録する
    await logEmail(db, {
      document_id: null,
      recipient: to,
      subject: "【テスト送信】Invoice Harness メール連携の確認",
      kind: "test",
      ok: result.ok,
      detail: result.ok ? result.id : result.reason,
    });

    if (!result.ok) {
      return fail(500, { mailTestError: result.reason });
    }
    return { mailTest: "ok", to };
  },
};
