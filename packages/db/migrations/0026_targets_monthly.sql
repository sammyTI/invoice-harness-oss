-- 売上目標を「月次（暦年月）」に作り替える。
-- 旧: (fiscal_year, scope_type, scope_id) の年間一括。決算月と表示モード（決算期/暦年）で年度キーがズレ、
--     全社合算（暦年）表示では別年度キーを引いて目標が出ない問題があった。
-- 新: ym='YYYY-MM' の暦年月キー。表示モードに依らず「表示期間に含まれる各月の合計」で一意に集計できる。
--     PLのように会社・部門×月で目標を入力する運用に対応。
CREATE TABLE IF NOT EXISTS monthly_targets (
  ym TEXT NOT NULL,            -- 'YYYY-MM' 暦年月
  scope_type TEXT NOT NULL,    -- company | division
  scope_id TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,  -- その月の売上目標（税込）
  PRIMARY KEY (ym, scope_type, scope_id)
);

-- 旧 targets（年間一括）は、決算月が行から一意に定まらないため機械的な月按分ができない。
-- 本番の少数データは手動で月次に再設定するため、ここではテーブルを残すのみ（参照はしない）。
