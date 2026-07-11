-- ログインの email 照合を小文字正規化に統一したため、既存データも一括で揃える。
-- （正規化前に大文字混じりで保存された環境で、ログイン不能になるのを防ぐ）
UPDATE members SET email = lower(trim(email)) WHERE email IS NOT NULL AND email != lower(trim(email));
