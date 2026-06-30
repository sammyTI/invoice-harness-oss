-- 帳票の公開共有リンク用トークン。
-- ログイン不要で取引先が帳票PDFを閲覧できる推測困難なトークン（任意発行・失効可）。
ALTER TABLE documents ADD COLUMN share_token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_share_token ON documents (share_token);
