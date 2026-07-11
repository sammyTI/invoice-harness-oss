-- 取引先の適格請求書発行事業者 登録番号（T+13桁・任意）。
-- 空欄=未登録（免税事業者等）。支払先が免税事業者の場合は仕入税額控除の経過措置対象。
ALTER TABLE clients ADD COLUMN registration_number TEXT;
