-- 入金記録に「伝票番号／摘要」を追加（振込の入金伝票番号など）。
-- 合算入金（1件の振込で複数請求をまとめて入金）の場合、各請求の入金にこの同じ伝票番号を入れて紐づける運用に使う。
ALTER TABLE payments ADD COLUMN reference TEXT;
