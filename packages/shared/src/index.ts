// ===== invoice-harness-oss / shared types & money logic =====

export type DocumentType =
  | "estimate" // 見積書
  | "delivery_note" // 納品書
  | "order" // 発注書
  | "invoice" // 請求書
  | "receipt" // 領収書
  | "payment_notice"; // 支払通知書

export type DocumentStatus = "draft" | "issued" | "sent" | "paid" | "canceled";

export type Rounding = "floor" | "ceil" | "round";
export type DateFormat = "iso" | "jp";
export type TaxDisplay = "exclusive" | "inclusive"; // 外税 / 内税
export type WithholdingMode = "none" | "standard"; // 源泉徴収 なし / あり(10.21%)
export type WithholdingBasis = "exclusive" | "inclusive"; // 税抜 / 税込で計算

export const WITHHOLDING_RATE = 0.1021;

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  estimate: "見積書",
  delivery_note: "納品書",
  order: "発注書",
  invoice: "請求書",
  receipt: "領収書",
  payment_notice: "支払通知書",
};

// 一覧・モバイル用の短縮ラベル
export const DOCUMENT_SHORT: Record<DocumentType, string> = {
  estimate: "見積",
  delivery_note: "納品",
  order: "発注",
  invoice: "請求",
  receipt: "領収",
  payment_notice: "支払",
};

// 帳票タイトルに使う表記（見積書は「御見積書」など）
export const DOCUMENT_TITLES: Record<DocumentType, string> = {
  estimate: "御見積書",
  delivery_note: "納品書",
  order: "発注書",
  invoice: "請求書",
  receipt: "領収書",
  payment_notice: "支払通知書",
};

export const DOCUMENT_PREFIX: Record<DocumentType, string> = {
  estimate: "EST",
  delivery_note: "DLV",
  order: "ORD",
  invoice: "INV",
  receipt: "RCP",
  payment_notice: "PAY",
};

// サイドバー表示順
export const DOCUMENT_ORDER: DocumentType[] = [
  "estimate",
  "delivery_note",
  "invoice",
  "receipt",
  "order",
  "payment_notice",
];

// 変換フロー
export const DOCUMENT_FLOW: Record<DocumentType, DocumentType[]> = {
  estimate: ["order", "delivery_note", "invoice"],
  delivery_note: ["invoice"],
  order: ["delivery_note", "invoice"],
  invoice: ["receipt", "payment_notice"],
  receipt: [],
  payment_notice: [],
};

export interface Issuer {
  id: string;
  name: string;
  registration_number: string | null; // 適格請求書発行事業者 登録番号 (T + 13桁)
  person_name: string | null; // 発行者名（担当者名）
  postal_code: string | null;
  address: string | null;
  tel: string | null;
  email: string | null;
  bank_info: string | null;
  logo_key: string | null;
  seal_key: string | null;
  fiscal_month?: number | null; // 会社ごとの決算月(1-12)。NULLは全体設定にフォールバック。
}

export interface Client {
  id: string;
  name: string;
  honorific: string;
  contact: string | null;
  postal_code: string | null;
  address: string | null;
  email: string | null;
}

export interface DocumentLine {
  id: string;
  document_id: string;
  position: number;
  name: string;
  description: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  tax_rate: number;
  amount: number;
}

export interface DocumentRecord {
  id: string;
  type: DocumentType;
  number: string;
  status: DocumentStatus;
  issuer_id: string;
  client_id: string;
  issue_date: string;
  due_date: string | null;
  subject: string | null;
  notes: string | null;
  rounding: Rounding;
  parent_id: string | null;
  subtotal: number;
  tax_total: number;
  total: number;
  locked?: number;
  content_hash?: string | null;
  sent_at?: string | null;
  paid_at?: string | null;
  share_token?: string | null;
  /** 発行した担当者（メンバー）名のスナップショット。無い場合は描画時に issuers.person_name へフォールバック。 */
  issuer_person?: string | null;
}

export interface Settings {
  date_format: DateFormat;
  tax_display: TaxDisplay;
  tax_rounding: Rounding;
  amount_rounding: Rounding;
  withholding: WithholdingMode;
  withholding_basis: WithholdingBasis;
  invoice_show_transaction_date: boolean;
  fiscal_month: number; // 決算月 (1-12)
  accent_color: string; // 帳票アクセントカラー
}

export const DEFAULT_SETTINGS: Settings = {
  date_format: "jp",
  tax_display: "exclusive",
  tax_rounding: "floor",
  amount_rounding: "floor",
  withholding: "none",
  withholding_basis: "exclusive",
  invoice_show_transaction_date: false,
  fiscal_month: 3,
  accent_color: "#1b59b0",
};

// ---- 会計年度（決算月）ヘルパ ----

export interface FiscalYear {
  endYear: number;
  startYear: number;
  startMonth: number;
  start: string; // YYYY-MM-01
  end: string; // YYYY-MM-31 (文字列比較用の上限)
  label: string; // "2026年3月期"
}

export function fiscalYearByEndYear(endYear: number, fiscalMonth: number): FiscalYear {
  const startMonth = fiscalMonth === 12 ? 1 : fiscalMonth + 1;
  const startYear = fiscalMonth === 12 ? endYear : endYear - 1;
  return {
    endYear,
    startYear,
    startMonth,
    start: `${startYear}-${String(startMonth).padStart(2, "0")}-01`,
    end: `${endYear}-${String(fiscalMonth).padStart(2, "0")}-31`,
    label: `${endYear}年${fiscalMonth}月期`,
  };
}

export function fiscalYearForDate(dateStr: string, fiscalMonth: number): FiscalYear {
  const [y, m] = dateStr.split("-").map(Number);
  const endYear = m <= fiscalMonth ? y : y + 1;
  return fiscalYearByEndYear(endYear, fiscalMonth);
}

export function fiscalMonths(fy: FiscalYear): { ym: string; label: string }[] {
  const out: { ym: string; label: string }[] = [];
  let y = fy.startYear;
  let m = fy.startMonth;
  for (let i = 0; i < 12; i++) {
    out.push({ ym: `${y}-${String(m).padStart(2, "0")}`, label: `${m}月` });
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

export interface LineInput {
  quantity: number;
  unit_price: number;
  tax_rate: number;
}

export interface TaxByRate {
  rate: number;
  net: number; // 税抜合計
  tax: number; // 消費税額
}

export interface Totals {
  subtotal: number; // 税抜合計
  tax_total: number; // 消費税合計
  total: number; // 税込合計
  withholding: number; // 源泉徴収税額
  payable: number; // 差引請求額（税込 - 源泉）
  tax_by_rate: TaxByRate[];
}

export function applyRounding(value: number, mode: Rounding): number {
  if (mode === "ceil") return Math.ceil(value);
  if (mode === "round") return Math.round(value);
  return Math.floor(value);
}

export function lineAmount(quantity: number, unitPrice: number, mode: Rounding = "floor"): number {
  return applyRounding(quantity * unitPrice, mode);
}

/**
 * 設定に基づく合計計算。
 * - 金額端数: 数量×単価の端数処理（amount_rounding）
 * - 消費税端数: 税率ごとに1回処理（tax_rounding）
 * - 外税/内税（tax_display）に対応
 * - 源泉徴収（10.21%, 1円未満切り捨て）
 */
export function computeTotals(lines: LineInput[], settings: Settings): Totals {
  const amountByRate = new Map<number, number>();
  for (const l of lines) {
    const amt = lineAmount(l.quantity, l.unit_price, settings.amount_rounding);
    amountByRate.set(l.tax_rate, (amountByRate.get(l.tax_rate) ?? 0) + amt);
  }

  let subtotal = 0;
  let tax_total = 0;
  let total = 0;
  const tax_by_rate: TaxByRate[] = [];

  const rates = [...amountByRate.entries()].sort((a, b) => b[0] - a[0]);
  for (const [rate, amount] of rates) {
    let net: number;
    let tax: number;
    if (settings.tax_display === "inclusive") {
      // amount は税込
      tax = applyRounding((amount * rate) / (100 + rate), settings.tax_rounding);
      net = amount - tax;
      total += amount;
    } else {
      // amount は税抜
      net = amount;
      tax = applyRounding((net * rate) / 100, settings.tax_rounding);
      total += net + tax;
    }
    subtotal += net;
    tax_total += tax;
    tax_by_rate.push({ rate, net, tax });
  }

  let withholding = 0;
  if (settings.withholding === "standard") {
    const base = settings.withholding_basis === "inclusive" ? total : subtotal;
    withholding = Math.floor(base * WITHHOLDING_RATE);
  }

  return { subtotal, tax_total, total, withholding, payable: total - withholding, tax_by_rate };
}

export function formatYen(value: number): string {
  return "¥" + Math.trunc(value).toLocaleString("ja-JP");
}

export function formatDate(value: string | null | undefined, fmt: DateFormat): string {
  if (!value) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return value;
  if (fmt === "jp") return `${m[1]}年${m[2]}月${m[3]}日`;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

export function formatNumber(type: DocumentType, year: number, seq: number): string {
  return `${DOCUMENT_PREFIX[type]}-${year}-${String(seq).padStart(4, "0")}`;
}

export function isValidRegistrationNumber(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^T\d{13}$/.test(value.trim());
}

/**
 * 帳票の単一ライフサイクル状態（下書き→発行済→送付済→入金済）。
 * 「下書き」は未発行＝正式書類ではない。「発行済」以降は確定（訂正不可・保存対象）。
 */
export interface Lifecycle {
  key: "draft" | "issued" | "sent" | "paid" | "canceled";
  label: string;
  cls: string; // chip-* クラス
}

export function lifecycle(doc: {
  status: string;
  locked?: number | boolean;
}): Lifecycle {
  if (doc.status === "canceled") return { key: "canceled", label: "取消", cls: "chip-canceled" };
  if (doc.status === "paid") return { key: "paid", label: "入金済", cls: "chip-paid" };
  if (doc.status === "sent") return { key: "sent", label: "送付済・入金待ち", cls: "chip-sent" };
  if (doc.locked) return { key: "issued", label: "発行済・送付待ち", cls: "chip-issued" };
  return { key: "draft", label: "下書き（未発行）", cls: "chip-draft" };
}

/**
 * 収入印紙税額（第17号文書・売上代金の領収書）。記載金額で判定。
 * 消費税額を区分記載している場合は税抜金額で判定可。電子発行（PDF等）は非課税。
 */
export function stampDuty(amount: number): number {
  if (amount < 50_000) return 0;
  if (amount <= 1_000_000) return 200;
  if (amount <= 2_000_000) return 400;
  if (amount <= 3_000_000) return 600;
  if (amount <= 5_000_000) return 1_000;
  if (amount <= 10_000_000) return 2_000;
  if (amount <= 20_000_000) return 4_000;
  if (amount <= 30_000_000) return 6_000;
  if (amount <= 50_000_000) return 10_000;
  if (amount <= 100_000_000) return 20_000;
  return 0; // 1億円超は階層が続くため別途確認
}
