-- 決算月を発行元(会社)ごとに持たせる。NULL のときは設定の全体決算月(settings.fiscal_month)にフォールバック。
-- トップ収支一覧は「会社選択時=その会社の年度／複数社合算時=暦年(1-12月)」で集計する。
ALTER TABLE issuers ADD COLUMN fiscal_month INTEGER;
