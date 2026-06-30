-- invoice-harness-oss / 送信履歴

CREATE TABLE IF NOT EXISTS email_log (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  document_id TEXT,
  recipient TEXT,
  subject TEXT,
  kind TEXT,            -- document | invite | dunning
  ok INTEGER NOT NULL DEFAULT 0,
  detail TEXT
);

CREATE INDEX IF NOT EXISTS idx_email_log_doc ON email_log(document_id);
