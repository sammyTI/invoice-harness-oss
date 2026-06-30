-- メンバーごとの閲覧可能な会社（発行元）。多対多。
-- 割当が0件のメンバーは「全社閲覧可」（後方互換）。オーナーは常に全社。
CREATE TABLE IF NOT EXISTS member_issuers (
  member_id TEXT NOT NULL,
  issuer_id TEXT NOT NULL,
  PRIMARY KEY (member_id, issuer_id)
);
CREATE INDEX IF NOT EXISTS idx_member_issuers_member ON member_issuers (member_id);
