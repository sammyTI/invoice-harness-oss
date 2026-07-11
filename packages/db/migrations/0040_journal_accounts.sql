-- 仕訳エクスポートの勘定科目マッピング（イベント種別→借方/貸方）。無い行は既定値を使う
CREATE TABLE IF NOT EXISTS journal_accounts (
  key TEXT PRIMARY KEY,   -- invoice_issue / payment_in / payment_fee / order_issue / payment_out / expense_<category>
  debit TEXT NOT NULL,
  credit TEXT NOT NULL
);
