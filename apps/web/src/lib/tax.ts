// 税率マスタ（適用開始日つき）の型と、日付から適用税率を選ぶ純関数。
// サーバ（db.ts）とクライアント（/new の svelte）の両方から import できるよう
// D1 などのサーバ依存を持たないここに置く。

export interface TaxRate {
  id: string;
  label: string; // 標準 / 軽減 など
  rate: number; // パーセント（10, 8 等）
  valid_from: string; // YYYY-MM-DD この日から適用
  sort: number;
}

/** 発行日に適用される税率の1件（選択肢の表示に使う）。 */
export interface ActiveTaxRate {
  label: string;
  rate: number;
}

/**
 * 指定日に有効な税率を label（系列）ごとに1つ選び、sort順の配列で返す純関数。
 * - 各 label で valid_from <= date の中から valid_from が最大の行を採用（時限切替に追従）。
 * - date に有効な行が1つも無ければ 標準10% にフォールバック。
 */
export function ratesForDate(rows: TaxRate[], date: string): ActiveTaxRate[] {
  const best = new Map<string, TaxRate>();
  for (const r of rows) {
    if (r.valid_from > date) continue; // まだ適用開始前
    const cur = best.get(r.label);
    if (!cur || r.valid_from > cur.valid_from) best.set(r.label, r);
  }
  const active = [...best.values()].sort((a, b) => a.sort - b.sort);
  if (active.length === 0) return [{ label: "標準", rate: 10 }];
  return active.map((r) => ({ label: r.label, rate: r.rate }));
}
