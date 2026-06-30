-- 計上区分（部門・事業部）マスタ。帳票を部門ごとに分類し、部門別損益を集計・可視化する。
CREATE TABLE IF NOT EXISTS divisions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
ALTER TABLE documents ADD COLUMN division_id TEXT;
CREATE INDEX IF NOT EXISTS idx_documents_division ON documents (division_id);
