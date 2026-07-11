-- ログイン失敗の記録（総当たり対策）。成功でリセット
CREATE TABLE IF NOT EXISTS login_attempts (
  email TEXT NOT NULL,
  ip TEXT NOT NULL,
  attempted_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_login_attempts ON login_attempts(email, attempted_at);
