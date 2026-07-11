-- メンバー招待メールのテンプレート既定値
-- 差し込み変数: {name} 招待者名 / {email} ログインメール / {password} 初期パスワード / {link} ログインURL（ボタン化）
INSERT OR IGNORE INTO email_templates (key, subject, body) VALUES
 ('invite',
  '【Invoice Harness】ログイン情報のご案内',
  '{name} 様

Invoice Harness のログイン情報をご案内します。下記からログインしてください。

メールアドレス: {email}
初期パスワード: {password}

{link}

初回ログイン後にパスワードの変更をお願いします。');
