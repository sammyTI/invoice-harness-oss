-- 税率マスタ（適用開始日つき）。帳票の発行日に有効な税率が作成画面の選択肢になる。
-- 系列（label）ごとに valid_from が最新の行がその日の適用税率。
CREATE TABLE IF NOT EXISTS tax_rates (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,        -- 標準 / 軽減 など
  rate INTEGER NOT NULL,      -- パーセント（10, 8 等）
  valid_from TEXT NOT NULL,   -- YYYY-MM-DD この日から適用
  sort INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO tax_rates (id, label, rate, valid_from, sort) VALUES
  ('tr_std_2019', '標準', 10, '2019-10-01', 1),
  ('tr_red_2019', '軽減', 8, '2019-10-01', 2);
