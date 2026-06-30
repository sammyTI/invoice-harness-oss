-- 備考テンプレートの「既定」フラグ。新規帳票作成時に自動で本文へプリフィルする1件を指定する。
ALTER TABLE note_templates ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0;
