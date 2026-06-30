/**
 * @invoice-harness/sdk
 * invoice-harness の REST API を型付きで叩く公式 SDK（ゼロ依存・ESM/CJS）。
 *
 *   import { InvoiceHarness } from "@invoice-harness/sdk";
 *   const ih = new InvoiceHarness({ baseUrl: "https://xxx.pages.dev", token: "..." });
 *   const inv = await ih.documents.create({ type: "invoice", client_name: "○○商事", lines: [...] });
 *   await ih.documents.issue(inv.id);
 */

export type DocumentType =
  | "estimate"
  | "delivery_note"
  | "order"
  | "invoice"
  | "receipt"
  | "payment_notice";

export interface LineInput {
  name: string;
  quantity?: number;
  unit?: string;
  unit_price?: number;
  tax_rate?: number;
}

export interface CreateDocumentInput {
  type?: DocumentType;
  client_id?: string;
  client_name?: string;
  issuer_id?: string;
  issuer_name?: string;
  division_id?: string;
  division_name?: string;
  issue_date?: string;
  due_date?: string;
  subject?: string;
  notes?: string;
  lines: LineInput[];
}

export interface PaymentInput {
  amount?: number;
  paid_date?: string;
  method?: string;
  reference?: string;
}

export interface IssuerInput {
  name: string;
  registration_number?: string;
  person_name?: string;
  postal_code?: string;
  address?: string;
  tel?: string;
  email?: string;
  bank_info?: string;
}

export interface ClientInput {
  name: string;
  honorific?: string;
  contact?: string;
  postal_code?: string;
  address?: string;
  email?: string;
}

export interface ItemInput {
  name: string;
  unit_price?: number;
  tax_rate?: number;
  unit?: string;
}

export interface SettingsInput {
  fiscal_month?: number;
  tax_display?: "exclusive" | "inclusive";
  withholding?: "none" | "standard";
  withholding_basis?: "exclusive" | "inclusive";
  tax_rounding?: "floor" | "ceil" | "round";
  amount_rounding?: "floor" | "ceil" | "round";
  date_format?: "iso" | "jp";
  invoice_show_transaction_date?: boolean;
  accent_color?: string;
}

export interface InvoiceHarnessOptions {
  /** デプロイ先のベースURL（例 https://xxx.pages.dev） */
  baseUrl: string;
  /** 設定 ▸ API/AI連携 で発行した API トークン */
  token: string;
  /** 独自 fetch（Node18未満や testing 用）。省略時はグローバル fetch。 */
  fetch?: typeof fetch;
}

export class InvoiceHarnessError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`invoice-harness API ${status}: ${body.slice(0, 300)}`);
    this.name = "InvoiceHarnessError";
    this.status = status;
    this.body = body;
  }
}

export class InvoiceHarness {
  private base: string;
  private token: string;
  private fetchImpl: typeof fetch;

  constructor(opts: InvoiceHarnessOptions) {
    if (!opts?.baseUrl) throw new Error("baseUrl is required");
    if (!opts?.token) throw new Error("token is required");
    this.base = opts.baseUrl.replace(/\/$/, "");
    this.token = opts.token;
    this.fetchImpl = opts.fetch ?? globalThis.fetch;
    if (!this.fetchImpl) throw new Error("global fetch not available; pass opts.fetch");
  }

  private async req<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await this.fetchImpl(this.base + path, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) throw new InvoiceHarnessError(res.status, text);
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  /** 帳票 */
  documents = {
    list: (type?: DocumentType) =>
      this.req<{ documents: unknown[] }>("GET", `/api/documents${type ? `?type=${type}` : ""}`),
    get: (id: string) => this.req("GET", `/api/documents/${id}`),
    search: (f: { q?: string; from?: string; to?: string; min?: number; max?: number }) => {
      const p = new URLSearchParams();
      for (const [k, v] of Object.entries(f)) if (v !== undefined) p.set(k, String(v));
      return this.req<{ results: unknown[] }>("GET", `/api/search?${p.toString()}`);
    },
    create: (input: CreateDocumentInput) => this.req<{ id: string; ok: true }>("POST", `/api/documents`, input),
    issue: (id: string) => this.req<{ ok: true }>("POST", `/api/documents/${id}/issue`, {}),
    cancel: (id: string) => this.req<{ ok: true }>("POST", `/api/documents/${id}/cancel`, {}),
    correct: (id: string) => this.req<{ id: string; ok: true }>("POST", `/api/documents/${id}/correct`, {}),
    convert: (id: string, target: DocumentType) =>
      this.req<{ id: string; ok: true }>("POST", `/api/documents/${id}/convert`, { target }),
    pay: (id: string, payment: PaymentInput = {}) => this.req<{ ok: true }>("POST", `/api/documents/${id}/pay`, payment),
    send: (id: string) => this.req<{ ok: true; sent: boolean }>("POST", `/api/documents/${id}/send`, {}),
    remove: (id: string) => this.req<{ ok: true }>("DELETE", `/api/documents/${id}`),
    share: (id: string) => this.req<{ ok: true; url: string }>("POST", `/api/documents/${id}/share`, {}),
    unshare: (id: string) => this.req<{ ok: true }>("DELETE", `/api/documents/${id}/share`),
  };

  /** 発行元（自社） */
  issuers = {
    list: () => this.req<{ issuers: unknown[] }>("GET", `/api/issuers`),
    create: (input: IssuerInput) => this.req<{ id: string; ok: true }>("POST", `/api/issuers`, input),
    update: (id: string, input: Partial<IssuerInput>) => this.req<{ ok: true }>("PUT", `/api/issuers/${id}`, input),
  };

  /** 取引先 */
  clients = {
    list: () => this.req<{ clients: unknown[] }>("GET", `/api/clients`),
    create: (input: ClientInput) => this.req<{ id: string; ok: true }>("POST", `/api/clients`, input),
    update: (id: string, input: Partial<ClientInput>) => this.req<{ ok: true }>("PUT", `/api/clients/${id}`, input),
  };

  /** 品目マスタ */
  items = {
    list: () => this.req<{ items: unknown[] }>("GET", `/api/items`),
    create: (input: ItemInput) => this.req<{ ok: true }>("POST", `/api/items`, input),
    update: (id: string, input: Partial<ItemInput>) => this.req<{ ok: true }>("PUT", `/api/items/${id}`, input),
    remove: (id: string) => this.req<{ ok: true }>("DELETE", `/api/items/${id}`),
  };

  /** 計上区分（部門） */
  divisions = {
    list: () => this.req<{ divisions: unknown[] }>("GET", `/api/divisions`),
    create: (input: { name: string; issuer_id?: string; issuer_name?: string }) =>
      this.req<{ ok: true }>("POST", `/api/divisions`, input),
    remove: (id: string) => this.req<{ ok: true }>("DELETE", `/api/divisions/${id}`),
  };

  /** 設定 */
  settings = {
    get: () => this.req("GET", `/api/settings`),
    update: (input: SettingsInput) => this.req<{ ok: true }>("PUT", `/api/settings`, input),
  };

  /** 財務サマリー（PL・会社別・部門別） */
  summary = (opts: { fy?: number; issuer?: string } = {}) => {
    const p = new URLSearchParams();
    if (opts.fy) p.set("fy", String(opts.fy));
    if (opts.issuer) p.set("issuer", opts.issuer);
    return this.req("GET", `/api/summary?${p.toString()}`);
  };
}

export default InvoiceHarness;
