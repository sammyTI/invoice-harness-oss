-- 売上目標（年度ごと・会社/部門ごと）。ダッシュボードで実績と対比して達成率を表示する。
-- scope_type='company' → scope_id=issuers.id ／ scope_type='division' → scope_id=divisions.id
CREATE TABLE IF NOT EXISTS targets (
  fiscal_year INTEGER NOT NULL,   -- 会計年度（決算年。例 2027 = 2027年◯月期）
  scope_type TEXT NOT NULL,       -- company | division
  scope_id TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,  -- 年間売上目標（税込）
  PRIMARY KEY (fiscal_year, scope_type, scope_id)
);
