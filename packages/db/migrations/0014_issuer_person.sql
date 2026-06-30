-- 発行元（自社）に発行者名（担当者名）を追加。帳票の発行元欄に「担当: ○○」として表示する。
ALTER TABLE issuers ADD COLUMN person_name TEXT;
