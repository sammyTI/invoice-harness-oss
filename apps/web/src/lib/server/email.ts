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
    return { ok: false, reason: `Resend ${res.status}: ${text.slice(0, 200)}` };
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
