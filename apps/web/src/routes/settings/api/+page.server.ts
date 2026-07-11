import type { Actions, PageServerLoad } from "./$types";
import { fail } from "@sveltejs/kit";
import { createApiToken, deleteApiToken, getDB, getMailConfig, listApiTokens, setMailConfig } from "$lib/server/db";

/** APIキーの末尾4文字だけ見せるマスク（フルキーはクライアントに返さない）。 */
function maskKey(key: string): string {
  const tail = key.slice(-4);
  return `re_****${tail}`;
}

export const load: PageServerLoad = async ({ platform }) => {
  const db = getDB(platform);
  const mail = await getMailConfig(db, platform?.env);
  return {
    tokens: await listApiTokens(db),
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
};
