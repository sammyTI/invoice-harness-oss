-- 発行元の事業形態（法人/個人事業主）。個人はインボイス番号なし・暦年（12月締め）が既定
ALTER TABLE issuers ADD COLUMN entity_type TEXT NOT NULL DEFAULT 'corporate'; -- corporate | individual
