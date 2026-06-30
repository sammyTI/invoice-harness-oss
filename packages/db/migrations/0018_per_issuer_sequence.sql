-- 採番を会社（発行元）ごとに変更したため、既存帳票の番号から会社別シーケンスを引き継ぐ。
-- 番号形式 XXX-YYYY-NNNN（3桁種別 + 年 + 4桁連番）。新キー = issuer_id + '-' + type + '-' + 年。
-- 既存の最大連番をシード値にして、次の採番が max+1 になるようにする（番号衝突防止）。
INSERT OR REPLACE INTO sequences (key, value)
SELECT d.issuer_id || '-' || d.type || '-' || substr(d.number, 5, 4) AS key,
       MAX(CAST(substr(d.number, 10) AS INTEGER)) AS value
FROM documents d
WHERE d.number GLOB '???-????-*'
GROUP BY d.issuer_id, d.type, substr(d.number, 5, 4);
