-- invoice-harness-oss / settings (課税・表示項目) + members

CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  date_format TEXT NOT NULL DEFAULT 'jp',                  -- iso | jp
  tax_display TEXT NOT NULL DEFAULT 'exclusive',           -- exclusive(外税) | inclusive(内税)
  tax_rounding TEXT NOT NULL DEFAULT 'floor',              -- floor | ceil | round
  amount_rounding TEXT NOT NULL DEFAULT 'floor',           -- floor | ceil | round
  withholding TEXT NOT NULL DEFAULT 'none',                -- none | standard(10.21%)
  withholding_basis TEXT NOT NULL DEFAULT 'exclusive',     -- exclusive | inclusive
  invoice_show_transaction_date INTEGER NOT NULL DEFAULT 0 -- 0 | 1
);

INSERT OR IGNORE INTO settings (id) VALUES ('default');

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'member',  -- owner | member
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
