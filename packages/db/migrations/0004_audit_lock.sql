-- invoice-harness-oss / Phase 3: 改ざん防止・監査ログ・確定ロック

ALTER TABLE documents ADD COLUMN locked INTEGER NOT NULL DEFAULT 0; -- 確定ロック(訂正不可)
ALTER TABLE documents ADD COLUMN content_hash TEXT;                  -- 確定時の内容ハッシュ

-- 監査ログ（ハッシュチェーンで改ざん検知）
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  actor TEXT,
  action TEXT NOT NULL,        -- create/update/convert/send/pay/lock
  document_id TEXT,
  summary TEXT,
  payload_hash TEXT NOT NULL,  -- このエントリ内容のハッシュ
  prev_hash TEXT,              -- 直前エントリの chain_hash
  chain_hash TEXT NOT NULL     -- sha256(prev_hash + payload_hash)
);

CREATE INDEX IF NOT EXISTS idx_audit_doc ON audit_log(document_id);
