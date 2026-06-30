import type { TxnInput } from "./db";

/** 簡易CSVパース（ダブルクオート対応）。 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQ = false;
  const t = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (inQ) {
      if (ch === '"') {
        if (t[i + 1] === '"') { cell += '"'; i++; }
        else inQ = false;
      } else cell += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ",") { row.push(cell); cell = ""; }
      else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
      else cell += ch;
    }
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function toNumber(s: string): number {
  const n = Number((s ?? "").replace(/[,¥\s　"]/g, "").replace(/△|▲|−/g, "-"));
  return Number.isFinite(n) ? n : 0;
}

function normDate(s: string): string | null {
  const v = (s ?? "").trim();
  let m = /^(\d{4})[-/年.](\d{1,2})[-/月.](\d{1,2})/.exec(v);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = /^(\d{4})(\d{2})(\d{2})$/.exec(v);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

const DATE_KEYS = ["日付", "取引日", "取引年月日", "ご利用日", "利用日", "date"];
const DESC_KEYS = ["摘要", "内容", "ご利用先", "利用店名", "お取引内容", "取引内容", "description", "memo", "名称"];
const IN_KEYS = ["入金", "預入", "お預入れ", "入金金額", "deposit", "credit"];
const OUT_KEYS = ["出金", "支払", "お引出し", "引出", "出金金額", "ご利用金額", "利用金額", "withdrawal", "debit"];
const AMOUNT_KEYS = ["金額", "amount"];

function findCol(header: string[], keys: string[]): number {
  for (let i = 0; i < header.length; i++) {
    const h = header[i].replace(/\s|　/g, "");
    if (keys.some((k) => h.includes(k))) return i;
  }
  return -1;
}

export interface CsvParseResult {
  txns: TxnInput[];
  detected: { date: number; desc: number; in: number; out: number; amount: number };
  error?: string;
}

/**
 * 銀行・カードCSVを取引明細に変換。ヘッダ行のキーワードで列を自動検出。
 * 入金/出金が分かれていれば符号付きに、金額1列なら符号そのまま。
 */
export function csvToTransactions(text: string, account: string): CsvParseResult {
  const rows = parseCsv(text);
  if (rows.length < 2) return { txns: [], detected: { date: -1, desc: -1, in: -1, out: -1, amount: -1 }, error: "データ行がありません。" };
  const header = rows[0];
  const det = {
    date: findCol(header, DATE_KEYS),
    desc: findCol(header, DESC_KEYS),
    in: findCol(header, IN_KEYS),
    out: findCol(header, OUT_KEYS),
    amount: findCol(header, AMOUNT_KEYS),
  };
  if (det.date < 0) return { txns: [], detected: det, error: "日付列が見つかりません（ヘッダに『日付/取引日』等が必要）。" };
  if (det.in < 0 && det.out < 0 && det.amount < 0)
    return { txns: [], detected: det, error: "金額列が見つかりません（『入金/出金』または『金額』）。" };

  const txns: TxnInput[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const date = normDate(r[det.date]);
    if (!date) continue;
    let amount = 0;
    if (det.in >= 0 || det.out >= 0) {
      const inc = det.in >= 0 ? toNumber(r[det.in]) : 0;
      const out = det.out >= 0 ? toNumber(r[det.out]) : 0;
      amount = inc - Math.abs(out);
    } else {
      amount = toNumber(r[det.amount]);
    }
    if (amount === 0) continue;
    txns.push({
      txn_date: date,
      description: det.desc >= 0 ? r[det.desc]?.trim() || null : null,
      amount,
      account,
      source: "csv",
      external_id: `csv:${account}:${date}:${amount}:${(det.desc >= 0 ? r[det.desc] : "") || ""}`.slice(0, 180),
    });
  }
  return { txns, detected: det };
}
