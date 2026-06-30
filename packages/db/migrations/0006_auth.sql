-- invoice-harness-oss / アプリ内認証・招待
-- 注: ローカル開発でログイン不能になったら、members/sessionsを消して /setup で作り直す
-- （外部 wrangler d1 execute --local の書込は稼働中 vite dev の miniflare に即反映されない場合あり）

ALTER TABLE members ADD COLUMN password_hash TEXT;
ALTER TABLE members ADD COLUMN salt TEXT;
ALTER TABLE members ADD COLUMN status TEXT NOT NULL DEFAULT 'active'; -- active | invited
ALTER TABLE members ADD COLUMN invite_token TEXT;
ALTER TABLE members ADD COLUMN invited_at TEXT;

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,          -- セッショントークン
  member_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_member ON sessions(member_id);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
