-- invoice-harness-oss / 初期パスワード招待: 初回ログイン時のパスワード変更を強制

ALTER TABLE members ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0;
