-- invoice-harness-oss / 帳票のプロジェクト（案件）必須化フラグ

ALTER TABLE settings ADD COLUMN require_project INTEGER NOT NULL DEFAULT 0; -- 0 | 1
