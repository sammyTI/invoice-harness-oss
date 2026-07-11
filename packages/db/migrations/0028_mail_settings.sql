-- メール連携（Resend）の設定をアプリ内から保存できるように
ALTER TABLE settings ADD COLUMN resend_api_key TEXT;
ALTER TABLE settings ADD COLUMN mail_from TEXT;
