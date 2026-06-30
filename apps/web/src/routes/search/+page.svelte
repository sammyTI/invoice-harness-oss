<script>
  import { DOCUMENT_LABELS, formatYen } from "@invoice-harness/shared";
  export let data;
</script>

<div class="page-head"><h1 class="page-title">帳票検索</h1></div>
<p class="hint">電子帳簿保存法の検索要件（取引先・取引年月日・取引金額）に対応した検索です。</p>

<form class="section searchform" method="GET">
  <div class="field"><span class="lab">取引先 / 番号 / 件名</span><input class="input" name="q" value={data.q} placeholder="株式会社サンプル 等" /></div>
  <div class="row">
    <div class="field"><span class="lab">取引年月日（から）</span><input class="input" type="date" name="from" value={data.dateFrom} /></div>
    <div class="field"><span class="lab">（まで）</span><input class="input" type="date" name="to" value={data.dateTo} /></div>
    <div class="field"><span class="lab">金額（下限）</span><input class="input" type="number" name="min" value={data.amountMin} /></div>
    <div class="field"><span class="lab">金額（上限）</span><input class="input" type="number" name="max" value={data.amountMax} /></div>
  </div>
  <button class="btn btn-primary" type="submit">検索</button>
</form>

{#if data.hasQuery}
  {#if data.results.length === 0}
    <div class="empty">条件に一致する帳票はありません。</div>
  {:else}
    <p class="cnt">{data.results.length} 件</p>
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>取引先</th><th>種別</th><th>番号</th><th class="r">金額(税込)</th><th>取引日</th></tr></thead>
        <tbody>
          {#each data.results as d}
            <tr>
              <td><a class="cname" href={`/doc/${d.id}`}>{d.client_name}</a></td>
              <td>{DOCUMENT_LABELS[d.type]}</td>
              <td class="num">{d.number}</td>
              <td class="r num">{formatYen(d.total)}</td>
              <td class="num">{d.issue_date}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
{/if}

<style>
  .hint { color: var(--ink-2); font-size: 13px; margin-top: -8px; }
  .searchform { max-width: 760px; }
  .row { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 0 14px; }
  @media (max-width: 640px) { .row { grid-template-columns: 1fr 1fr; } }
  .cnt { color: var(--muted); font-size: 13px; }
  .cname { font-weight: 700; }
</style>
