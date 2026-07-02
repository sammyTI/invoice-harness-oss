-- 入金に決済手数料（クレカ/Square 等）を記録。
-- amount=請求先が支払った額（入金合計・残額に反映）、fee=決済手数料、実入金=amount-fee。
ALTER TABLE payments ADD COLUMN fee INTEGER NOT NULL DEFAULT 0;
