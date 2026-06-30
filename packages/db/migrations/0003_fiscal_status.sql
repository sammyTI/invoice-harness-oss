-- invoice-harness-oss / fiscal month setting + document status timestamps

ALTER TABLE settings ADD COLUMN fiscal_month INTEGER NOT NULL DEFAULT 3; -- 決算月 (1-12)

ALTER TABLE documents ADD COLUMN sent_at TEXT;  -- 送付日時
ALTER TABLE documents ADD COLUMN paid_at TEXT;  -- 入金日
