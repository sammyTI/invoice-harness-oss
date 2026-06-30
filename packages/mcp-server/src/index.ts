#!/usr/bin/env node
/**
 * invoice-harness MCP server
 * AI（Claude等）から自然言語で請求書ツールを操作するための MCP サーバ。
 * 環境変数: IH_API_URL, IH_API_TOKEN
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_URL = (process.env.IH_API_URL ?? "http://localhost:5179").replace(/\/$/, "");
const API_TOKEN = process.env.IH_API_TOKEN ?? "";

async function api(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(API_URL + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`API ${res.status}: ${text.slice(0, 300)}`);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

const server = new McpServer({ name: "invoice-harness", version: "0.1.0" });

server.tool(
  "list_documents",
  "帳票（見積/納品/請求/領収/発注/支払通知）の一覧を取得。typeで種別を絞り込み。",
  { type: z.enum(["estimate", "delivery_note", "order", "invoice", "receipt", "payment_notice"]).optional() },
  async ({ type }) => ok(await api(`/api/documents${type ? `?type=${type}` : ""}`))
);

server.tool(
  "get_document",
  "帳票1件の詳細（明細・合計・入金状況）を取得。",
  { id: z.string() },
  async ({ id }) => ok(await api(`/api/documents/${id}`))
);

server.tool(
  "list_clients",
  "取引先の一覧を取得。",
  {},
  async () => ok(await api(`/api/clients`))
);

server.tool(
  "list_issuers",
  "発行元（自社・会社）の一覧を取得。どの会社で帳票を発行できるか確認する。",
  {},
  async () => ok(await api(`/api/issuers`))
);

server.tool(
  "create_issuer",
  "発行元（自社）を新規登録。会社名は必須。登録番号(T+13桁)・代表者名・住所・振込先などは任意。複数社運用ではこれで会社を追加する。",
  {
    name: z.string().describe("会社名（必須）"),
    registration_number: z.string().optional().describe("適格請求書発行事業者 登録番号 T+13桁"),
    person_name: z.string().optional().describe("代表者名・担当者名"),
    postal_code: z.string().optional(),
    address: z.string().optional(),
    tel: z.string().optional(),
    email: z.string().optional(),
    bank_info: z.string().optional().describe("振込先（銀行・支店・種別・口座番号・名義）"),
  },
  async (body) => ok(await api(`/api/issuers`, { method: "POST", body: JSON.stringify(body) }))
);

server.tool(
  "update_issuer",
  "発行元（自社）情報を更新。id は list_issuers で取得。指定したフィールドだけ上書きする。",
  {
    id: z.string(),
    name: z.string().optional(),
    registration_number: z.string().optional(),
    person_name: z.string().optional(),
    postal_code: z.string().optional(),
    address: z.string().optional(),
    tel: z.string().optional(),
    email: z.string().optional(),
    bank_info: z.string().optional(),
  },
  async ({ id, ...body }) => ok(await api(`/api/issuers/${id}`, { method: "PUT", body: JSON.stringify(body) }))
);

server.tool(
  "list_divisions",
  "計上区分（部門・事業部）の一覧を取得。会社名付き。",
  {},
  async () => ok(await api(`/api/divisions`))
);

server.tool(
  "list_items",
  "品目マスタの一覧を取得。",
  {},
  async () => ok(await api(`/api/items`))
);

server.tool(
  "get_settings",
  "課税・表示・決算月などの設定を取得。",
  {},
  async () => ok(await api(`/api/settings`))
);

server.tool(
  "update_settings",
  "設定を更新（指定したフィールドだけ上書き）。初期設定をAIで行える。",
  {
    fiscal_month: z.number().optional().describe("決算月 1-12"),
    tax_display: z.enum(["exclusive", "inclusive"]).optional().describe("外税/内税"),
    withholding: z.enum(["none", "standard"]).optional().describe("源泉徴収 なし/あり(10.21%)"),
    withholding_basis: z.enum(["exclusive", "inclusive"]).optional().describe("源泉の計算基礎 税抜/税込"),
    tax_rounding: z.enum(["floor", "ceil", "round"]).optional().describe("消費税の端数"),
    amount_rounding: z.enum(["floor", "ceil", "round"]).optional().describe("金額の端数"),
    date_format: z.enum(["iso", "jp"]).optional().describe("日付表記 2026-01-01 / 2026年1月1日"),
    invoice_show_transaction_date: z.boolean().optional(),
    accent_color: z.string().optional().describe("帳票アクセント色 #RRGGBB"),
  },
  async (body) => ok(await api(`/api/settings`, { method: "PUT", body: JSON.stringify(body) }))
);

server.tool(
  "create_client",
  "取引先を新規登録。会社名は必須。",
  {
    name: z.string(),
    honorific: z.string().optional().describe("敬称（既定 御中）"),
    contact: z.string().optional(),
    postal_code: z.string().optional(),
    address: z.string().optional(),
    email: z.string().optional(),
  },
  async (body) => ok(await api(`/api/clients`, { method: "POST", body: JSON.stringify(body) }))
);

server.tool(
  "create_item",
  "品目マスタを新規登録。",
  {
    name: z.string(),
    unit_price: z.number().optional(),
    tax_rate: z.number().optional().describe("税率（既定10）"),
    unit: z.string().optional().describe("単位（既定 式）"),
  },
  async (body) => ok(await api(`/api/items`, { method: "POST", body: JSON.stringify(body) }))
);

server.tool(
  "create_division",
  "計上区分（部門）を新規登録。issuer_name 省略時は全社共通。",
  { name: z.string(), issuer_name: z.string().optional().describe("会社名（その会社専用にする場合）") },
  async (body) => ok(await api(`/api/divisions`, { method: "POST", body: JSON.stringify(body) }))
);

server.tool(
  "get_summary",
  "財務サマリー（PL）を取得。会計年度・会社別・部門別の売上/費用/利益/入金。fy=決算年, issuer=会社名 で絞り込み可。",
  { fy: z.number().optional(), issuer: z.string().optional() },
  async ({ fy, issuer }) => {
    const p = new URLSearchParams();
    if (fy) p.set("fy", String(fy));
    if (issuer) p.set("issuer", issuer);
    return ok(await api(`/api/summary?${p.toString()}`));
  }
);

server.tool(
  "search_documents",
  "取引先名・日付範囲・金額範囲で帳票を検索（電帳法の検索要件に対応）。",
  {
    q: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
  },
  async (args) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(args)) if (v !== undefined) p.set(k, String(v));
    return ok(await api(`/api/search?${p.toString()}`));
  }
);

server.tool(
  "create_document",
  "帳票を新規作成（下書き）。client_name（無ければ自動作成）と明細を指定。複数社運用では issuer_name で会社を、division_name で部門を指定。typeは既定で請求書。作成後 issue_document で発行（確定）する。",
  {
    type: z
      .enum(["estimate", "delivery_note", "order", "invoice", "receipt", "payment_notice"])
      .optional(),
    client_name: z.string(),
    issuer_name: z.string().optional().describe("発行元（会社）の名前。複数社運用時に指定。省略時は先頭の会社"),
    division_name: z.string().optional().describe("計上区分（部門）の名前"),
    subject: z.string().optional(),
    notes: z.string().optional(),
    due_date: z.string().optional(),
    lines: z
      .array(
        z.object({
          name: z.string(),
          quantity: z.number().default(1),
          unit: z.string().default("式"),
          unit_price: z.number(),
          tax_rate: z.number().default(10),
        })
      )
      .min(1),
  },
  async (body) => ok(await api(`/api/documents`, { method: "POST", body: JSON.stringify(body) }))
);

server.tool(
  "issue_document",
  "帳票を発行（確定・ロック）。以後は訂正不可になり、改ざん検知の対象になる。",
  { id: z.string() },
  async ({ id }) => ok(await api(`/api/documents/${id}/issue`, { method: "POST", body: "{}" }))
);

server.tool(
  "cancel_document",
  "発行済みの帳票を取消（無効化）。原本は保持され売上集計から除外。入金記録があると取消不可。",
  { id: z.string() },
  async ({ id }) => ok(await api(`/api/documents/${id}/cancel`, { method: "POST", body: "{}" }))
);

server.tool(
  "create_correction",
  "発行済みの訂正版（内容コピーの新しい下書き）を作成。元帳票に紐づく。返り値の id を編集・発行する。",
  { id: z.string() },
  async ({ id }) => ok(await api(`/api/documents/${id}/correct`, { method: "POST", body: "{}" }))
);

server.tool(
  "convert_document",
  "取引フロー変換（見積→発注/納品/請求、請求→領収/支払通知 等）。内容をコピーして新帳票を作成し親子リンク。",
  { id: z.string(), target: z.enum(["estimate", "delivery_note", "order", "invoice", "receipt", "payment_notice"]) },
  async ({ id, target }) => ok(await api(`/api/documents/${id}/convert`, { method: "POST", body: JSON.stringify({ target }) }))
);

server.tool(
  "send_document",
  "帳票を取引先へメール送付（公開共有リンク付き）。Resend 設定時は実送信、未設定なら『送付済み』記録のみ。送付前に取引先メールが登録されている必要がある。",
  { id: z.string() },
  async ({ id }) => ok(await api(`/api/documents/${id}/send`, { method: "POST", body: "{}" }))
);

server.tool(
  "record_payment",
  "請求書に入金を記録（部分入金可）。amount省略時は残額全額。reference に入金伝票番号・摘要を入れられる。",
  {
    id: z.string(),
    amount: z.number().optional(),
    paid_date: z.string().optional(),
    method: z.string().optional(),
    reference: z.string().optional().describe("入金伝票番号・摘要（合算入金は同じ番号で各請求に）"),
  },
  async ({ id, ...body }) => ok(await api(`/api/documents/${id}/pay`, { method: "POST", body: JSON.stringify(body) }))
);

const transport = new StdioServerTransport();
await server.connect(transport);
