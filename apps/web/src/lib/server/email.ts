export interface SendResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  id?: string;
}

export interface MailEnv {
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
}

/**
 * Resend の失敗レスポンスから、日本語の「状況＋対処」解説を返す。
 * 該当パターンがなければ null。
 */
export function explainResendError(status: number, body: string): string | null {
  const b = body.toLowerCase();
  // 401: APIキー無効
  if (status === 401) {
    return "状況: APIキーが無効です。／対処: 設定 ▸ API/連携 でResendのAPIキー（re_...）を確認し、保存し直してください。";
  }
  // 403: ドメイン未認証など
  if (status === 403) {
    if (b.includes("not verified")) {
      return "状況: 差出人ドメインがResendで未認証です（DNSレコードの反映待ち、またはResend側でVerify未実行の可能性）。／対処: resend.com/domains でドメインの状態を確認してください。DNS追加直後は反映まで数分〜1時間かかることがあります。認証完了までは差出人を onboarding@resend.dev にすれば自分のResend登録アドレス宛てにのみ送れます。";
    }
    if (b.includes("testing emails") || b.includes("your own email")) {
      return "状況: ドメイン未認証のため、Resendに登録した自分のメールアドレス宛てにしか送れません。／対処: resend.com/domains でドメイン認証を完了すると任意の宛先に送れます。";
    }
  }
  // 422: 差出人/宛先の形式不正
  if (status === 422) {
    return "状況: 差出人または宛先の形式が正しくありません。／対処: 差出人は『名前 <mail@example.com>』の形式か、認証済みドメインのアドレスかを確認してください。";
  }
  // 429: レート制限
  if (status === 429) {
    return "状況: 送信レート制限（無料枠: 100通/日）に達しています。／対処: 時間をおいて再試行してください。";
  }
  // 500以上: Resend側障害
  if (status >= 500) {
    return "状況: Resend側で障害が起きている可能性があります。／対処: 時間をおいて再試行してください。";
  }
  return null;
}

/** Resend でメール送信。APIキー未設定なら skipped で返す（壊さない）。 */
export async function sendEmail(
  env: MailEnv | undefined,
  msg: { to: string; subject: string; html: string }
): Promise<SendResult> {
  const key = env?.RESEND_API_KEY;
  const from = env?.MAIL_FROM || "Invoice Harness <onboarding@resend.dev>";
  if (!key) return { ok: false, skipped: true, reason: "RESEND_API_KEY 未設定" };
  if (!msg.to) return { ok: false, skipped: true, reason: "宛先メール未設定" };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, html: msg.html }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const hint = explainResendError(res.status, text);
    return { ok: false, reason: `Resend ${res.status}: ${text.slice(0, 200)}${hint ? `\n${hint}` : ""}` };
  }
  const data = (await res.json().catch(() => ({}))) as { id?: string };
  return { ok: true, id: data.id };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * メールテンプレート（件名/本文）に変数を差し込んで {subject, html} を返す。
 * プレースホルダ: {client} {issuer} {label} {number} {subject} {amount} {issue_date} {due} {link}
 * {link} は本文中でボタンリンクに変換される。
 */
export function renderEmailTemplate(
  tpl: { subject: string; body: string },
  vars: Record<string, string>
): { subject: string; html: string } {
  const subject = tpl.subject.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
  let body = escapeHtml(tpl.body).replace(/\n/g, "<br>");
  body = body.replace(/\{(\w+)\}/g, (_, k) => {
    if (k === "link") {
      const url = escapeHtml(vars.link ?? "#");
      return `<a href="${url}" style="background:#2f6df0;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">表示する</a>`;
    }
    return escapeHtml(vars[k] ?? "");
  });
  const html = `<div style="font-family:sans-serif;line-height:1.7;color:#1b2330">${body}<p style="color:#8a94a3;font-size:12px;margin-top:18px">本メールは Invoice Harness から送信されました。</p></div>`;
  return { subject, html };
}
