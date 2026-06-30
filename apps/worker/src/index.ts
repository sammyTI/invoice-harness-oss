/**
 * invoice-harness-oss / Worker
 *  - scheduled(): 毎日、支払期限を過ぎた未入金の請求書に催促メール（Resend）を送る
 *  - fetch(): ヘルスチェック
 */
import { formatYen } from "@invoice-harness/shared";

export interface Env {
  DB: D1Database;
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
  APP_URL?: string;
}

interface OverdueRow {
  id: string;
  number: string;
  total: number;
  due_date: string;
  client_name: string;
  client_email: string | null;
  issuer_name: string;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const DEFAULT_DUNNING = {
  subject: "【お支払いのご確認】{number}（{issuer}）",
  body: "{client} 御中\n\nお支払期限（{due}）を過ぎております。ご入金状況をご確認ください。\n金額（税込）: {amount}\n\n{link}",
};

function subst(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

function renderHtml(body: string, vars: Record<string, string>): string {
  let out = escapeHtml(body).replace(/\n/g, "<br>");
  out = out.replace(/\{(\w+)\}/g, (_, k) =>
    k === "link"
      ? `<a href="${escapeHtml(vars.link ?? "#")}" style="background:#2f6df0;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">表示する</a>`
      : escapeHtml(vars[k] ?? "")
  );
  return `<div style="font-family:sans-serif;line-height:1.7;color:#1b2330">${out}<p style="color:#8a94a3;font-size:12px;margin-top:18px">本メールは Invoice Harness から送信されました。</p></div>`;
}

async function sendResend(env: Env, to: string, subject: string, html: string): Promise<boolean> {
  if (!env.RESEND_API_KEY || !to) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.MAIL_FROM || "Invoice Harness <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });
  return res.ok;
}

export default {
  async fetch(): Promise<Response> {
    return new Response("invoice-harness worker: ok", {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  },

  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runDunning(env));
  },
};

async function runDunning(env: Env): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const { results } = await env.DB.prepare(
    `SELECT d.id, d.number, d.total, d.due_date,
            c.name AS client_name, c.email AS client_email, i.name AS issuer_name
     FROM documents d
     JOIN clients c ON c.id = d.client_id
     JOIN issuers i ON i.id = d.issuer_id
     WHERE d.type = 'invoice' AND d.status = 'sent'
       AND d.due_date IS NOT NULL AND d.due_date < ?1`
  )
    .bind(today)
    .all<OverdueRow>();

  const rows = results ?? [];
  const base = env.APP_URL || "";

  const tplRow = await env.DB.prepare("SELECT subject, body FROM email_templates WHERE key = 'dunning'")
    .first<{ subject: string; body: string }>()
    .catch(() => null);
  const tpl = tplRow ?? DEFAULT_DUNNING;

  for (const r of rows) {
    if (!r.client_email) continue;
    const vars: Record<string, string> = {
      client: r.client_name,
      issuer: r.issuer_name,
      number: r.number,
      amount: formatYen(r.total),
      due: r.due_date,
      link: `${base}/doc/${r.id}/print`,
    };
    await sendResend(env, r.client_email, subst(tpl.subject, vars), renderHtml(tpl.body, vars));
  }
}
