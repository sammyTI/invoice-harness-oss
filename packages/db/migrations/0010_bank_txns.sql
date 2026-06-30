-- invoice-harness-oss / 取引明細（銀行・カード）と消込

CREATE TABLE IF NOT EXISTS bank_transactions (
  id TEXT PRIMARY KEY,
  txn_date TEXT NOT NULL,            -- 取引日 YYYY-MM-DD
  description TEXT,                  -- 摘要
  amount INTEGER NOT NULL,          -- 入金は正、出金は負
  account TEXT,                      -- 口座/カード名（任意ラベル）
  source TEXT NOT NULL DEFAULT 'csv',-- csv | api
  external_id TEXT,                  -- API連携時の重複防止キー
  status TEXT NOT NULL DEFAULT 'unmatched', -- unmatched | matched | ignored
  matched_document_id TEXT,         -- 紐づけた帳票
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_btx_status ON bank_transactions(status);
CREATE INDEX IF NOT EXISTS idx_btx_extid ON bank_transactions(external_id);
