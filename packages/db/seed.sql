-- invoice-harness-oss / demo seed (optional, safe to re-run)
-- 動作確認用の架空サンプルデータ。本番では実行不要（/setup でオーナー作成後に自社情報を登録）。
-- Fictional sample data for trying the app. Not required for production.

INSERT OR REPLACE INTO issuers (id, name, registration_number, postal_code, address, tel, email, bank_info)
VALUES (
  'iss_demo',
  'サンプル株式会社',
  'T0000000000000',
  '100-0001',
  '東京都千代田区千代田1-1-1 サンプルビル10F',
  '03-0000-0000',
  'info@example.com',
  'サンプル銀行 本店 普通 0000000 サンプル（カ'
);

INSERT OR REPLACE INTO clients (id, name, honorific, contact, postal_code, address, email)
VALUES (
  'cli_demo',
  '取引先サンプル株式会社',
  '御中',
  '総務部 ご担当者様',
  '100-0002',
  '東京都千代田区丸の内1-1-1',
  'sample-client@example.com'
);

INSERT OR REPLACE INTO items (id, name, unit_price, tax_rate, unit) VALUES
  ('itm_design', 'デザイン制作費', 50000, 10, '式'),
  ('itm_print', '印刷費', 1000, 10, '箱'),
  ('itm_ship', '送料', 500, 10, '回');
