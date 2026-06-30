-- 帳票ごとに「発行した担当者（ログイン中のメンバー）名」をスナップショット保存する。
-- 発行時点の担当者を原本として固定（メンバー名変更・退職後も帳票上は当時の発行者を保持／電帳法）。
-- 値が無い帳票（API発行・旧データ）は描画時に issuers.person_name へフォールバックする。
ALTER TABLE documents ADD COLUMN issuer_person TEXT;
