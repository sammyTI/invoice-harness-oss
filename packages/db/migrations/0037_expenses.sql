-- 経費・給与の月次記録（PL用）。confidential=1（給与・法定福利費）は閲覧権限者のみ参照可
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  issuer_id TEXT NOT NULL,
  division_id TEXT,
  category TEXT NOT NULL,          -- 勘定科目キー（salary / social_insurance / rent / utilities / communication / advertising / travel / supplies / misc / other）
  label TEXT,                      -- 摘要（例: 6月分給与）
  amount INTEGER NOT NULL,         -- 金額（円）
  ym TEXT NOT NULL,                -- 計上月 YYYY-MM
  confidential INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (issuer_id) REFERENCES issuers(id)
);
CREATE INDEX IF NOT EXISTS idx_expenses_ym ON expenses(ym, issuer_id);
-- 給与・人件費の閲覧権限（ロールと独立。owner は常に可）
ALTER TABLE members ADD COLUMN can_view_payroll INTEGER NOT NULL DEFAULT 0;
