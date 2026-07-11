<script>
  import { DOCUMENT_SHORT, formatYen, lifecycle } from "@invoice-harness/shared";
  import { page } from "$app/stores";
  import SettingsGear from "$lib/SettingsGear.svelte";
  export let data;
  // viewer（閲覧のみ）は作成系UIを非表示
  $: isViewer = $page.data.user?.role === "viewer";
  const pct = (v) => Math.round((v / data.maxMonthly) * 100);
  // グラフ用の簡易表記（1万以上は「○○万」、未満は3桁区切り）。一目で金額感が掴めるように。
  const compact = (n) => {
    const v = Math.round(n || 0);
    if (Math.abs(v) >= 10000) {
      const m = v / 10000;
      return (Math.abs(m) >= 100 ? Math.round(m) : Math.round(m * 10) / 10) + "万";
    }
    return v.toLocaleString();
  };
  $: issQ = data.issuerId ? `&iss=${data.issuerId}` : "";
  $: divQ = data.divisionId ? `&div=${data.divisionId}` : "";
  $: modeQ = `&mode=${data.calendarMode ? "calendar" : "fiscal"}`;
  // 切替は現在期(fy)を引き継がず、新表示の今期に着地させる
  $: toggleHref = `/?mode=${data.calendarMode ? "fiscal" : "calendar"}${issQ}${divQ}`;
</script>

<div class="page-head">
  <h1 class="page-title">収支一覧<span class="tag">{data.fyLabel}</span></h1>
  <div class="fynav">
    <a class="btn btn-ghost btn-sm toggle" href={toggleHref} title="決算表示／年間表示を切替">
      {data.calendarMode ? "決算表示に切替" : "年間表示に切替"}
    </a>
    <a class="btn btn-quiet btn-sm" href={`/?fy=${data.prevFy}${issQ}${divQ}${modeQ}`}>← {data.calendarMode ? "前年" : "前期"}</a>
    {#if !data.isCurrent}<a class="btn btn-quiet btn-sm" href={`/?${(issQ + divQ + modeQ).slice(1)}`}>{data.calendarMode ? "本年" : "今期"}</a>{/if}
    <a class="btn btn-quiet btn-sm" href={`/?fy=${data.nextFy}${issQ}${divQ}${modeQ}`}>{data.calendarMode ? "翌年" : "次期"} →</a>
    <SettingsGear links={[
      { href: "/settings/targets", label: "売上目標" },
      { href: "/settings/divisions", label: "計上区分（部門）" },
      { href: "/settings/issuer", label: "自社情報・決算月" },
      { href: "/settings/tax", label: "帳票・税" },
    ]} />
  </div>
</div>

<nav class="hubnav" aria-label="ダッシュボード">
  <a class="card hubcard" href="/clients">
    <svg class="hicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    <span class="hlabel">顧客情報</span>
    <span class="num hnum">{data.hub.clients}</span>
    <span class="hunit">社</span>
  </a>
  <a class="card hubcard" href="/projects">
    <svg class="hicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
    <span class="hlabel">プロジェクト情報</span>
    <span class="num hnum">{data.hub.activeProjects}</span>
    <span class="hunit">進行中</span>
  </a>
  <a class="card hubcard" href="/monthly">
    <svg class="hicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
    <span class="hlabel">計上別情報</span>
    <span class="num hnum">{formatYen(data.hub.monthAccrual)}</span>
    <span class="hunit">今月計上</span>
  </a>
  <a class="card hubcard" href="/monthly?basis=cash">
    <svg class="hicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3 21 7l-4 4"/><path d="M21 7H8"/><path d="m7 21-4-4 4-4"/><path d="M3 17h13"/></svg>
    <span class="hlabel">月次入出金情報</span>
    <span class="num hnum">{formatYen(data.hub.monthCash)}</span>
    <span class="hunit">今月入金</span>
  </a>
  <a class="card hubcard" href="#divisions">
    <svg class="hicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6"/><rect x="12" y="8" width="3" height="10"/><rect x="17" y="5" width="3" height="13"/></svg>
    <span class="hlabel">部門別情報</span>
    <span class="num hnum">{data.hub.divisions}</span>
    <span class="hunit">部門</span>
  </a>
</nav>

{#if data.multiCompany}
  <div class="companynav">
    <a class="cbtn" class:active={!data.issuerId} href={`/?fy=${data.fyEndYear}${modeQ}`}>全社合算</a>
    {#each data.issuers as iss}
      <a class="cbtn" class:active={data.issuerId === iss.id} href={`/?fy=${data.fyEndYear}&iss=${iss.id}${modeQ}`}>{iss.name}</a>
    {/each}
  </div>
{/if}

{#if data.divChips.length}
  <div class="companynav divnav">
    <a class="cbtn dbtnn" class:active={!data.divisionId} href={`/?fy=${data.fyEndYear}${issQ}${modeQ}`}>全部門</a>
    {#each data.divChips as dv}
      <a class="cbtn dbtnn" class:active={data.divisionId === dv.id} href={`/?fy=${data.fyEndYear}${issQ}${modeQ}&div=${dv.id}`}>{dv.name}</a>
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

{#if data.target > 0}
  <div class="card targetbar">
    <div class="tb-row">
      <span class="tb-lab">売上目標（{data.fyLabel}）</span>
      <span class="tb-nums num">実績 {formatYen(data.kpi.revenue)} ／ 目標 {formatYen(data.target)}</span>
      <span class="tb-pct num" class:ok={data.achievement >= 100}>{data.achievement}%</span>
    </div>
    <div class="tb-track"><div class="tb-fill" class:over={data.achievement >= 100} style={`width:${Math.min(100, data.achievement)}%`}></div></div>
  </div>
{/if}

<div class="card pl">
  <div class="pl-head">
    <h2>月次推移（{data.fyLabel}）</h2>
    <div class="legend"><span class="dot rev"></span>売上 <span class="dot exp"></span>費用 {#if data.hasMonthTargets}<span class="dot tgt"></span>目標{/if} <span class="scale">上限 ¥{compact(data.maxMonthly)}</span></div>
  </div>
  <div class="chart">
    {#each data.months as m}
      <div class="mcol" title={`${m.label} 売上 ${formatYen(m.revenue)} / 費用 ${formatYen(m.expense)}${m.target ? ` / 目標 ${formatYen(m.target)}` : ""}`}>
        <div class="mval" class:zero={!m.revenue}>{m.revenue ? compact(m.revenue) : ""}</div>
        <div class="bars">
          {#if m.target > 0}<div class="tgtline" style={`bottom:${pct(m.target)}%`}></div>{/if}
          <div class="bar rev" style={`height:${pct(m.revenue)}%`}></div>
          <div class="bar exp" style={`height:${pct(m.expense)}%`}></div>
        </div>
        <div class="mlabel">{m.label}</div>
      </div>
    {/each}
  </div>
</div>

{#if data.hasDivisions}
  <div class="card pl" id="divisions">
    <div class="pl-head">
      <h2>部門別損益（{data.fyLabel}）</h2>
      <div class="pl-acts">
        <a class="btn btn-quiet btn-sm" href="/settings/targets">目標を設定</a>
        <a class="btn btn-quiet btn-sm" href="/settings/divisions">区分を編集</a>
      </div>
    </div>
    <div class="dtable">
      <div class="drow dhead" class:witht={data.hasDivTargets}><span>区分</span><span class="r">売上</span><span class="r">費用</span><span class="r">利益</span>{#if data.hasDivTargets}<span class="r">目標</span><span class="r">達成率</span>{/if}<span class="dbarcell"></span></div>
      {#each data.divisions as d}
        <div class="drow" class:witht={data.hasDivTargets}>
          <span class="dname">{d.name}</span>
          <span class="r num">{formatYen(d.revenue)}</span>
          <span class="r num">{formatYen(d.expense)}</span>
          <span class="r num" class:neg={d.profit < 0}>{formatYen(d.profit)}</span>
          {#if data.hasDivTargets}
            <span class="r num">{d.target ? formatYen(d.target) : "—"}</span>
            <span class="r num ach" class:ok={d.achievement !== null && d.achievement >= 100}>{d.achievement !== null ? `${d.achievement}%` : "—"}</span>
          {/if}
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

<div class="sub-head"><h2>最近の帳票</h2>{#if !isViewer}<a class="btn btn-primary btn-sm" href="/new?type=invoice" title="請求書を作成">＋ 新規作成</a>{/if}</div>

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
  .hubnav { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin: 0 0 18px; }
  @media (max-width: 1080px) { .hubnav { grid-template-columns: repeat(3, 1fr); } }
  @media (max-width: 640px) { .hubnav { grid-template-columns: repeat(2, 1fr); } }
  .hubcard { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding: 14px 16px; text-decoration: none; color: inherit; transition: border-color 0.15s ease, transform 0.15s ease; }
  .hubcard:hover { border-color: var(--primary); transform: translateY(-1px); }
  .hicon { width: 24px; height: 24px; color: var(--primary); margin-bottom: 4px; }
  .hlabel { font-size: 13px; font-weight: 700; color: var(--ink-2); }
  .hnum { font-size: 16px; font-weight: 800; letter-spacing: -0.01em; line-height: 1.2; }
  .hunit { font-size: 11px; color: var(--muted); font-weight: 700; }
  .fynav { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .fynav .toggle { border-color: var(--primary); color: var(--primary-d); font-weight: 700; }
  .companynav { display: flex; gap: 8px; flex-wrap: wrap; margin: 0 0 16px; }
  .cbtn { padding: 7px 16px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); color: var(--ink-2); font-size: 13px; font-weight: 700; text-decoration: none; }
  .cbtn:hover { border-color: var(--primary); color: var(--primary-d); }
  .cbtn.active { background: var(--primary); border-color: var(--primary); color: #fff; }
  .divnav { margin-top: -8px; }
  .dbtnn { padding: 5px 13px; font-size: 12px; }
  .divnav .cbtn.active { background: var(--ink-2); border-color: var(--ink-2); }
  .targetbar { padding: 14px 18px; margin: 14px 0 2px; }
  .tb-row { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
  .tb-lab { font-size: 12px; color: var(--muted); font-weight: 700; }
  .tb-nums { font-size: 13px; color: var(--ink-2); }
  .tb-pct { margin-left: auto; font-size: 20px; font-weight: 800; color: var(--amber); }
  .tb-pct.ok { color: var(--green); }
  .tb-track { height: 10px; background: var(--surface-2); border-radius: 999px; overflow: hidden; }
  .tb-fill { height: 100%; background: var(--grad); border-radius: 999px; min-width: 2px; transition: width 0.4s ease; }
  .tb-fill.over { background: var(--green); }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
  @media (max-width: 860px) { .kpis { grid-template-columns: repeat(2, 1fr); } }
  .kpi { position: relative; padding: 18px 20px 16px; display: flex; flex-direction: column; gap: 6px; overflow: hidden; }
  .kpi::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px; border-radius: 3px 3px 0 0; }
  .kpi.accent-rev::before { background: var(--grad); }
  .kpi.accent-exp::before { background: var(--amber); }
  .kpi.accent-profit::before { background: var(--green); }
  .kpi .lab { font-size: 11.5px; font-weight: 700; color: var(--muted); letter-spacing: 0.02em; }
  .kpi .val { font-size: 26px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.15; }
  .kpi .val.small { font-size: 21px; }
  .kpi .val.neg { color: var(--red); }
  .kpi .sub { font-size: 12px; color: var(--muted); }

  .pl { padding: 18px 20px; margin: 16px 0; }
  .pl-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
  .pl-acts { display: flex; gap: 8px; }
  .pl-head h2 { font-size: 15px; margin: 0; }
  .legend { font-size: 12px; color: var(--muted); display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .legend .scale { margin-left: 8px; padding-left: 10px; border-left: 1px solid var(--line); color: var(--ink-2); font-variant-numeric: tabular-nums; }
  .legend .dot { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
  .legend .dot.rev { background: var(--primary); }
  .legend .dot.exp { background: var(--amber); margin-left: 8px; }
  .legend .dot.tgt { background: var(--green); margin-left: 8px; }
  .chart { display: grid; grid-template-columns: repeat(12, 1fr); gap: 6px; height: 200px; align-items: end; }
  .mcol { display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; justify-content: flex-end; }
  .mval { font-size: 10px; font-weight: 700; color: var(--ink-2); font-variant-numeric: tabular-nums; line-height: 1; white-space: nowrap; }
  .mval.zero { color: transparent; }
  .bars { position: relative; display: flex; align-items: flex-end; gap: 3px; flex: 1; min-height: 0; width: 100%; justify-content: center; }
  /* 月次目標ライン（PLの目標水準） */
  .tgtline { position: absolute; left: 8%; right: 8%; height: 0; border-top: 2px dashed var(--green); z-index: 1; }
  .bar { width: 42%; border-radius: 5px 5px 0 0; min-height: 2px; }
  .bar.rev { background: linear-gradient(180deg, #2e5bff, #5d80ff); }
  .bar.exp { background: #e9bd77; }
  .mlabel { font-size: 11px; color: var(--muted); }

  .dtable { display: flex; flex-direction: column; gap: 2px; }
  .drow { display: grid; grid-template-columns: 1.3fr 1fr 1fr 1fr 1.6fr; gap: 10px; align-items: center; padding: 9px 8px; border-radius: 7px; }
  .drow.witht { grid-template-columns: 1.2fr 1fr 1fr 1fr 1fr 0.7fr 1.3fr; }
  .ach { font-weight: 700; color: var(--amber); }
  .ach.ok { color: var(--green); }
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
  @media (max-width: 720px) {
    .drow, .drow.witht { grid-template-columns: 1fr 1fr 1fr; }
    .drow .dbarcell, .drow.dhead .dbarcell { display: none; }
    .drow > span:nth-child(4) { display: none; }
    /* 目標列あり: モバイルは 区分/売上/達成率 の3列に絞る */
    .drow.witht > span:nth-child(3), .drow.witht > span:nth-child(4), .drow.witht > span:nth-child(5) { display: none; }
  }
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
    .mval { font-size: 8px; }
  }
</style>
