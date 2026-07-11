import { EXPENSE_CATEGORIES, type JournalEntry } from "./db";

// 科目マッピング設定に並べるイベント種別（key・ラベル）。経費は科目別に展開する。
// key は journal_accounts.key / JOURNAL_DEFAULTS と一致させる。
export const JOURNAL_EVENT_LABELS: { key: string; label: string }[] = [
  { key: "invoice_issue", label: "請求発行（売上計上）" },
  { key: "payment_in", label: "入金" },
  { key: "payment_fee", label: "振込・決済手数料" },
  { key: "order_issue", label: "発注・支払通知の発行" },
  { key: "payment_out", label: "支払実行" },
  ...EXPENSE_CATEGORIES.map((c) => ({ key: `expense_${c.key}`, label: `経費: ${c.label}` })),
];

// 仕訳エントリ → 各会計ソフト向け行データへの整形。
// - 汎用: 列の割り当て機能つきインポート（freee / マネーフォワード等）向けの素直な8列。
// - 弥生: 弥生会計インポート形式（25列・ヘッダなし）。従来 /reports/yayoi の列構成を踏襲。

/** YYYY-MM-DD → YYYY/MM/DD（弥生は日付をスラッシュ区切りで受ける）。 */
function ymd(s: string): string {
  return (s ?? "").replace(/-/g, "/");
}

// ---- 汎用仕訳CSV ----

/** 汎用仕訳CSVのヘッダ。csvResponse に渡す想定。 */
export const GENERIC_JOURNAL_HEADER = [
  "日付",
  "借方勘定科目",
  "借方金額",
  "貸方勘定科目",
  "貸方金額",
  "消費税区分",
  "摘要",
  "取引先",
];

/** 仕訳エントリを汎用CSVの行（string|number 配列）に変換。csvResponse でエスケープされる。 */
export function genericJournalRows(entries: JournalEntry[]): (string | number)[][] {
  return entries.map((e) => [
    ymd(e.date),
    e.debit,
    e.debitAmount,
    e.credit,
    e.creditAmount,
    e.taxKbn,
    e.memo,
    e.counterparty,
  ]);
}

// ---- 弥生会計インポート形式（25列・ヘッダなし）----

/** 1セルを弥生CSV用にエスケープ（カンマ・改行・ダブルクォートを含む場合のみクォート）。 */
function cell(v: string | number): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** 弥生の1行（列配列）を1つのCSV文字列にする。 */
function toLine(cols: (string | number)[]): string {
  return cols.map(cell).join(",");
}

/**
 * 仕訳エントリを弥生会計インポート形式の行（CSV文字列の配列・ヘッダなし）に変換する。
 * 借方に taxKbn を「対象外」、貸方に entry.taxKbn を割り当てる（売上のみ課税区分・他は対象外）。
 * 従来 /reports/yayoi と同じ 25 列レイアウト（識別フラグ2000・伝票No連番・末尾"no"）。
 */
export function yayoiRows(entries: JournalEntry[]): string[] {
  const lines: string[] = [];
  let no = 1;
  for (const e of entries) {
    lines.push(
      toLine([
        2000, no++, "", ymd(e.date),
        e.debit, "", "", "対象外", e.debitAmount, 0,
        e.credit, "", "", e.taxKbn, e.creditAmount, e.taxAmount,
        e.memo, "", "", 0, "", "", 0, 0, "no",
      ])
    );
  }
  return lines;
}
