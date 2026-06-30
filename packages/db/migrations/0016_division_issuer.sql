-- 計上区分（部門）を会社（発行元）ごとに持てるようにする。
-- issuer_id が NULL の区分は「全社共通」として扱う。
ALTER TABLE divisions ADD COLUMN issuer_id TEXT;
CREATE INDEX IF NOT EXISTS idx_divisions_issuer ON divisions (issuer_id);
