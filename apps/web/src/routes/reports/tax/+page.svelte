<script>
  import { formatYen } from "@invoice-harness/shared";
  export let data;
</script>

<div class="page-head">
  <h1 class="page-title">消費税集計表<span class="tag">{data.fyLabel}</span></h1>
  <div class="nav">
    <a class="btn btn-quiet btn-sm" href={`/reports/tax?fy=${data.prevFy}`}>← 前期</a>
    {#if !data.isCurrent}<a class="btn btn-quiet btn-sm" href="/reports/tax">今期</a>{/if}
    <a class="btn btn-quiet btn-sm" href={`/reports/tax?fy=${data.nextFy}`}>次期 →</a>
  </div>
</div>
<p class="hint">課税売上（請求書）を税率別に集計します。会計年度（決算月設定）で区切ります。</p>

<div class="table-wrap">
  <table class="table">
    <thead><tr><th>税率</th><th class="r">課税売上（税抜）</th><th class="r">消費税額</th></tr></thead>
    <tbody>
      {#each data.rows as r}
        <tr><td>{r.rate}%</td><td class="r num">{formatYen(r.net)}</td><td class="r num">{formatYen(r.tax)}</td></tr>
      {/each}
      {#if data.rows.length === 0}
        <tr><td colspan="3" class="muted" style="text-align:center">この期間の課税売上はありません。</td></tr>
      {/if}
    </tbody>
    <tfoot>
      <tr class="total"><td>合計</td><td class="r num">{formatYen(data.totalNet)}</td><td class="r num">{formatYen(data.totalTax)}</td></tr>
    </tfoot>
  </table>
</div>
<p class="note">※概算です。確定申告・消費税申告の最終値は会計ソフト／税理士でご確認ください。</p>

<style>
  .nav { display: flex; gap: 8px; }
  .hint { color: var(--ink-2); font-size: 13px; margin-top: -8px; }
  .muted { color: var(--muted); }
  tfoot .total td { background: var(--surface-2); font-weight: 800; border-top: 2px solid var(--line); }
  .note { color: var(--muted); font-size: 12px; }
</style>
