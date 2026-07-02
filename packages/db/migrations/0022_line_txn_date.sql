-- 明細（内訳）の各行に取引年月日を持たせる（インボイス制度：取引年月日を明細ごとに記載可能に）。
-- 未設定の行は帳票上で発行日にフォールバックして表示する。
ALTER TABLE document_lines ADD COLUMN txn_date TEXT;
