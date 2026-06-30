-- invoice-harness-oss / Phase 1-2 積み残し: テンプレート設定（帳票・備考・メール）

-- 備考テンプレート（プリセット文）
CREATE TABLE IF NOT EXISTS note_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- メールテンプレート（送付・催促）
CREATE TABLE IF NOT EXISTS email_templates (
  key TEXT PRIMARY KEY,        -- send | dunning
  subject TEXT NOT NULL,
  body TEXT NOT NULL
);

-- 帳票テンプレート（種別ごとの既定備考）
CREATE TABLE IF NOT EXISTS doc_templates (
  type TEXT PRIMARY KEY,       -- estimate/delivery_note/order/invoice/receipt/payment_notice
  default_notes TEXT
);

-- 帳票のアクセントカラー
ALTER TABLE settings ADD COLUMN accent_color TEXT NOT NULL DEFAULT '#1b59b0';

INSERT OR IGNORE INTO email_templates (key, subject, body) VALUES
 ('send',
  '【{label}】{number} のご送付（{issuer}）',
  '{client} 御中

いつもお世話になっております。{issuer} です。
{label}（{number}）をお送りいたします。

件名: {subject}
金額（税込）: {amount}
発行日: {issue_date}

{link}'),
 ('dunning',
  '【お支払いのご確認】{number}（{issuer}）',
  '{client} 御中

いつもお世話になっております。{issuer} です。
下記ご請求（{number}）につきまして、お支払期限（{due}）を過ぎております。
ご入金状況をご確認ください。行き違いの場合はご容赦ください。

金額（税込）: {amount}

{link}');

INSERT OR IGNORE INTO note_templates (id, name, body) VALUES
 ('nt_furikomi', '振込手数料のお願い', 'お振込手数料は貴社にてご負担くださいますようお願い申し上げます。'),
 ('nt_thanks', 'お礼', '平素より格別のお引き立てを賜り、誠にありがとうございます。');
