-- 経営数値（売上・利益・PL・レポート）の閲覧権限。ロール独立のメンバー単位フラグ。
-- owner=常に可。viewer（税理士等）は数字の確認が仕事のため常に可。member は既定不可（経営幹部にのみ許可）。
ALTER TABLE members ADD COLUMN can_view_finance INTEGER NOT NULL DEFAULT 0;
