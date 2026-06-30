<script>
  import { DOCUMENT_SHORT, formatYen, lifecycle } from "@invoice-harness/shared";
  export let data;
  const pct = (v) => Math.round((v / data.maxMonthly) * 100);
  $: issQ = data.issuerId ? `&iss=${data.issuerId}` : "";
</script>

<div class="page-head">
  <h1 class="page-title">収支一覧<span class="tag">{data.fyLabel}</span></h1>
  <div class="fynav">
    <a class="btn btn-quiet btn-sm" href={`/?fy=${data.prevFy}${issQ}`}>← 前期</a>
    {#if !data.isCurrent}<a class="btn btn-quiet btn-sm" href={`/?${issQ.slice(1)}`}>今期</a>{/if}
    <a class="btn btn-quiet btn-sm" href={`/?fy=${data.nextFy}${issQ}`}>次期 →</a>
  </div>
</div>

{#if data.multiCompany}
  <div class="companynav">
    <a class="cbtn" class:active={!data.issuerId} href={`/?fy=${data.fyEndYear}`}>全社合算</a>
    {#each data.issuers as iss}
      <a class="cbtn" class:active={data.issuerId === iss.id} href={`/?fy=${data.fyEndYear}&iss=${iss.id}`}>{iss.name}</a>
    {/each}
  </div>
{/if}

<div class="kpis">
  <div class="kpi card accent-rev">
    <span class="lab">売上（請求）</span>
    <span class="val num">{formatYen(data.kpi.revenue)}</span>
  </div>
  <div class="kpi card accent-exp">
    <span class="lab">費用（発注・支払）</span>
    <span class="val num">{formatYen(data.kpi.expense)}</span>
  </div>
  <div class="kpi card accent-profit">
    <span class="lab">利益</span>
    <span class="val num" class:neg={data.kpi.profit < 0}>{formatYen(data.kpi.profit)}</span>
  </div>
  <div class="kpi card">
    <span class="lab">入金済 / 未入金</span>
    <span class="val num small">{formatYen(data.kpi.paid)}</span>
    <span class="sub num">未入金 {formatYen(data.kpi.unpaid)}</span>
  </div>
</div>

<div class="card pl">
  <div class="pl-head">
    <h2>月次推移（{data.fyLabel}）</h2>
    <div class="legend"><span class="dot rev"></span>売上 <span class="dot exp"></span>費用</div>
  </div>
  <div class="chart">
    {#each data.months as m}
      <div class="mcol" title={`${m.label} 売上 ${formatYen(m.revenue)} / 費用 ${formatYen(m.expense)}`}>
        <div class="bars">
          <div class="bar rev" style={`height:${pct(m.revenue)}%`}></div>
          <div class="bar exp" style={`height:${pct(m.expense)}%`}></div>
        </div>
        <div class="mlabel">{m.label}</div>
      </div>
    {/each}
  </div>
</div>

{#if data.hasDivisions}
  <div class="card pl">
    <div class="pl-head">
      <h2>部門別損益（{data.fyLabel}）</h2>
      <a class="btn btn-quiet btn-sm" href="/settings/divisions">区分を編集</a>
    </div>
    <div class="dtable">
      <div class="drow dhead"><span>区分</span><span class="r">売上</span><span class="r">費用</span><span class="r">利益</span><span class="dbarcell"></span></div>
      {#each data.divisions as d}
        <div class="drow">
          <span class="dname">{d.name}</span>
          <span class="r num">{formatYen(d.revenue)}</span>
          <span class="r num">{formatYen(d.expense)}</span>
          <span class="r num" class:neg={d.profit < 0}>{formatYen(d.profit)}</span>
          <span class="dbarcell">
            <span class="dbar rev" style={`width:${Math.round((d.revenue / data.divMax) * 100)}%`}></span>
            <span class="dbar exp" style={`width:${Math.round((d.expense / data.divMax) * 100)}%`}></span>
          </span>
        </div>
      {/each}
    </div>
    <div class="legend dlegend"><span class="dot rev"></span>売上 <span class="dot exp"></span>費用</div>
  </div>
{/if}

<div class="sub-head"><h2>最近の帳票</h2><a class="btn btn-primary btn-sm" href="/new?type=invoice">＋ 請求書を作成</a></div>

{#if data.recent.length === 0}
  <div class="empty">まだ帳票がありません。<a href="/new?type=invoice">請求書を作成</a>してください。</div>
{:else}
  <div class="table-wrap">
    <table class="table">
      <thead>
        <tr><th>種別</th><th>取引先</th><th class="r">金額(税込)</th><th>発行日</th><th>状態</th></tr>
      </thead>
      <tbody>
        {#each data.recent as d}
          <tr>
            <td><span class="tchip">{DOCUMENT_SHORT[d.type]}</span></td>
            <td><a class="cname" href={`/doc/${d.id}`}>{d.client_name}</a><div class="docno num">{d.number}</div></td>
            <td class="r num">{formatYen(d.total)}</td>
            <td class="num">{d.issue_date}</td>
            <td><span class="chip {lifecycle(d).cls}">{lifecycle(d).label}</span></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<style>
  .fynav { display: flex; gap: 8px; align-items: center; }
  .companynav { display: flex; gap: 8px; flex-wrap: wrap; margin: 0 0 16px; }
  .cbtn { padding: 7px 16px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); color: var(--ink-2); font-size: 13px; font-weight: 700; text-decoration: none; }
  .cbtn:hover { border-color: var(--primary); color: var(--primary-d); }
  .cbtn.active { background: var(--primary); border-color: var(--primary); color: #fff; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
  @media (max-width: 860px) { .kpis { grid-template-columns: repeat(2, 1fr); } }
  .kpi { padding: 16px 18px; display: flex; flex-direction: column; gap: 5px; border-top: 3px solid transparent; }
  .kpi.accent-rev { border-top-color: var(--primary); }
  .kpi.accent-exp { border-top-color: var(--amber); }
  .kpi.accent-profit { border-top-color: var(--green); }
  .kpi .lab { font-size: 12px; color: var(--muted); }
  .kpi .val { font-size: 24px; font-weight: 800; }
  .kpi .val.small { font-size: 20px; }
  .kpi .val.neg { color: var(--red); }
  .kpi .sub { font-size: 12px; color: var(--muted); }

  .pl { padding: 18px 20px; margin: 16px 0; }
  .pl-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
  .pl-head h2 { font-size: 15px; margin: 0; }
  .legend { font-size: 12px; color: var(--muted); display: flex; align-items: center; gap: 6px; }
  .legend .dot { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
  .legend .dot.rev { background: var(--primary); }
  .legend .dot.exp { background: var(--amber); margin-left: 8px; }
  .chart { display: grid; grid-template-columns: repeat(12, 1fr); gap: 6px; height: 180px; align-items: end; }
  .mcol { display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; justify-content: flex-end; }
  .bars { display: flex; align-items: flex-end; gap: 3px; height: 100%; width: 100%; justify-content: center; }
  .bar { width: 42%; border-radius: 4px 4px 0 0; min-height: 2px; }
  .bar.rev { background: var(--primary); }
  .bar.exp { background: var(--amber); }
  .mlabel { font-size: 11px; color: var(--muted); }

  .dtable { display: flex; flex-direction: column; gap: 2px; }
  .drow { display: grid; grid-template-columns: 1.3fr 1fr 1fr 1fr 1.6fr; gap: 10px; align-items: center; padding: 9px 8px; border-radius: 7px; }
  .drow:nth-child(even) { background: var(--surface-2); }
  .drow.dhead { font-size: 12px; color: var(--muted); font-weight: 700; background: none; padding-bottom: 4px; }
  .drow .r { text-align: right; }
  .dname { font-weight: 700; }
  .drow .neg { color: var(--red); }
  .dbarcell { display: flex; flex-direction: column; gap: 3px; }
  .dbar { height: 7px; border-radius: 4px; min-width: 2px; }
  .dbar.rev { background: var(--primary); }
  .dbar.exp { background: var(--amber); }
  .dlegend { margin-top: 10px; }
  @media (max-width: 720px) { .drow { grid-template-columns: 1fr 1fr 1fr; } .drow .dbarcell, .drow.dhead .dbarcell { display: none; } .drow > span:nth-child(4) { display: none; } }
  .sub-head { margin: 22px 0 12px; display: flex; align-items: center; justify-content: space-between; }
  .sub-head h2 { font-size: 16px; margin: 0; }
  .cname { font-weight: 700; }
  .docno { font-size: 11px; color: var(--muted); }
  .tchip { display: inline-grid; place-items: center; min-width: 30px; height: 22px; padding: 0 6px; border-radius: 6px; background: var(--slate-soft); color: var(--ink-2); font-size: 12px; font-weight: 700; }
  /* スマホ: 12本の月次バーが画面幅を超えないよう間隔・ラベルを詰める */
  @media (max-width: 560px) {
    .pl { padding: 14px 12px; }
    .chart { gap: 3px; }
    .mcol { min-width: 0; }
    .bar { width: 60%; }
    .mlabel { font-size: 9px; }
  }
</style>
