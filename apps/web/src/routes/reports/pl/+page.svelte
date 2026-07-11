<script>
  import { formatYen } from "@invoice-harness/shared";
  import SettingsGear from "$lib/SettingsGear.svelte";
  export let data;

  // 会社タブ・年度送りのクエリ保持用
  $: issQ = data.issuerId ? `&iss=${data.issuerId}` : "";
  $: fmQ = data.calendar ? "&fm=12" : "";
  // セル表示：0は控えめに「—」
  const cell = (n) => (n ? formatYen(n) : "—");
</script>

<div class="page-head">
  <h1 class="page-title">損益計算書（PL）<span class="tag">{data.periodLabel}</span></h1>
  <div class="fynav">
    <a class="btn btn-quiet btn-sm" href={`/reports/pl?fy=${data.fy - 1}${issQ}${fmQ}`}>← 前年度</a>
    {#if data.fy !== data.current}<a class="btn btn-quiet btn-sm" href={`/reports/pl?${(issQ + fmQ).slice(1)}`}>今年度</a>{/if}
    <a class="btn btn-quiet btn-sm" href={`/reports/pl?fy=${data.fy + 1}${issQ}${fmQ}`}>翌年度 →</a>
    <SettingsGear links={[
      { href: "/expenses", label: "経費・給与" },
      { href: "/settings/targets", label: "売上目標" },
    ]} />
  </div>
</div>
<p class="hint">
  会計年度の月次で、売上高・売上原価・粗利・販管費・営業利益を並べます。売上＝請求書、原価＝発注＋支払通知（税込）。
  販管費は<b>経費・給与</b>で登録した金額を科目別に積みます。<b>給与手当・法定福利費は閲覧権限が必要</b>です。
</p>

<div class="modeswitch">
  <a class="ms" class:on={!data.calendar} href={`/reports/pl?fy=${data.fy}${issQ}`}>決算期（{data.fiscalMonth}月締め）</a>
  <a class="ms" class:on={data.calendar} href={`/reports/pl?fy=${data.fy}&fm=12${issQ}`}>暦年（1〜12月）</a>
</div>

{#if data.multiCompany}
  <div class="companynav">
    <a class="cbtn" class:active={!data.issuerId} href={`/reports/pl?fy=${data.fy}${fmQ}`}>全社合算</a>
    {#each data.issuers as iss}
      <a class="cbtn" class:active={data.issuerId === iss.id} href={`/reports/pl?fy=${data.fy}&iss=${iss.id}${fmQ}`}>{iss.name}</a>
    {/each}
  </div>
{/if}

<div class="gridwrap">
  <table class="pltable">
    <thead>
      <tr>
        <th class="sticky nm">科目</th>
        {#each data.months as m}<th class="r mo">{m.label}</th>{/each}
        <th class="r annual">年間計</th>
      </tr>
    </thead>
    <tbody>
      <!-- 売上高 -->
      <tr>
        <th class="sticky nm">売上高</th>
        {#each data.monthRevenue as v}<td class="r num">{cell(v)}</td>{/each}
        <td class="r num annual">{formatYen(data.revenue)}</td>
      </tr>
      <!-- 売上原価 -->
      <tr>
        <th class="sticky nm">売上原価（外注・仕入）</th>
        {#each data.monthCogs as v}<td class="r num">{cell(v)}</td>{/each}
        <td class="r num annual">{formatYen(data.cogs)}</td>
      </tr>
      <!-- 売上総利益（粗利） -->
      <tr class="sub-total">
        <th class="sticky nm">売上総利益（粗利）</th>
        {#each data.monthGross as v}<td class="r num" class:neg={v < 0}>{formatYen(v)}</td>{/each}
        <td class="r num annual" class:neg={data.grossProfit < 0}>{formatYen(data.grossProfit)}</td>
      </tr>

      {#if data.confidentialHidden}
        <!-- 権限なし：販管費以下は非表示 -->
        <tr class="locked">
          <td class="sticky lockcell" colspan={data.months.length + 1}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
            販管費・営業利益は閲覧権限が必要です（給与情報を含むため）
          </td>
        </tr>
      {:else if data.sgaRows.length === 0}
        <!-- 経費0件 -->
        <tr class="empty-row">
          <td class="sticky emptycell" colspan={data.months.length + 1}>
            経費が未登録です。<a href="/expenses">経費・給与ページ</a>から登録してください。
          </td>
        </tr>
      {:else}
        <!-- 販管費：科目ごと1行 -->
        <tr class="sec-row">
          <th class="sticky nm sec">販管費</th>
          {#each data.months as _}<td></td>{/each}
          <td></td>
        </tr>
        {#each data.sgaRows as row}
          <tr>
            <th class="sticky nm indent">{row.label}</th>
            {#each row.byMonth as v}<td class="r num">{cell(v)}</td>{/each}
            <td class="r num annual">{formatYen(row.total)}</td>
          </tr>
        {/each}
        <tr class="sub-total">
          <th class="sticky nm">販管費計</th>
          {#each data.monthSgaTotal as v}<td class="r num">{cell(v)}</td>{/each}
          <td class="r num annual">{formatYen(data.sgaTotal)}</td>
        </tr>
        <!-- 営業利益 -->
        <tr class="op-total">
          <th class="sticky nm">営業利益</th>
          {#each data.monthOp as v}<td class="r num" class:neg={v != null && v < 0}>{v == null ? "—" : formatYen(v)}</td>{/each}
          <td class="r num annual" class:neg={data.operatingProfit != null && data.operatingProfit < 0}>{data.operatingProfit == null ? "—" : formatYen(data.operatingProfit)}</td>
        </tr>
      {/if}
    </tbody>
  </table>
</div>

{#if data.confidentialHidden}
  <p class="note">給与・法定福利費を含む販管費以下は、給与閲覧権限を持つメンバーのみ表示されます。権限はオーナーがメンバー画面で付与できます。</p>
{:else}
  <p class="note">※概算です。確定申告・決算の最終値は会計ソフト／税理士でご確認ください。</p>
{/if}

<style>
  .hint { color: var(--ink-2); font-size: 13px; margin-top: -8px; line-height: 1.7; }
  .fynav { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .modeswitch { display: inline-flex; border: 1px solid var(--line); border-radius: 999px; overflow: hidden; margin-bottom: 14px; }
  .ms { padding: 6px 14px; font-size: 13px; font-weight: 700; color: var(--ink-2); text-decoration: none; }
  .ms.on { background: var(--primary); color: #fff; }
  .companynav { display: flex; gap: 8px; flex-wrap: wrap; margin: 0 0 16px; }
  .cbtn { padding: 7px 16px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); color: var(--ink-2); font-size: 13px; font-weight: 700; text-decoration: none; }
  .cbtn:hover { border-color: var(--primary); color: var(--primary-d); }
  .cbtn.active { background: var(--primary); border-color: var(--primary); color: #fff; }

  .gridwrap { overflow-x: auto; border: 1px solid var(--line); border-radius: var(--radius); background: var(--surface); -webkit-overflow-scrolling: touch; }
  .pltable { border-collapse: collapse; width: 100%; }
  .pltable th, .pltable td { padding: 8px 10px; border-bottom: 1px solid var(--line-2); white-space: nowrap; }
  .pltable thead th { background: var(--surface-2); font-size: 11px; color: var(--muted); font-weight: 700; position: sticky; top: 0; z-index: 1; }
  .pltable .sticky { position: sticky; left: 0; background: var(--surface); z-index: 2; }
  .pltable thead .sticky { z-index: 3; }
  .nm { text-align: left; min-width: 190px; font-size: 13px; font-weight: 700; }
  .nm.indent { font-weight: 500; color: var(--ink-2); padding-left: 22px; }
  .mo { min-width: 84px; }
  .num { font-variant-numeric: tabular-nums; }
  .r { text-align: right; }
  .annual { font-weight: 800; color: var(--primary-d); border-left: 1px solid var(--line); }
  .neg { color: var(--red); }

  /* 科目セクション見出し行 */
  .sec-row .sec { color: var(--muted); font-size: 11px; letter-spacing: 0.06em; font-weight: 700; }
  .sec-row td { background: var(--surface-2); }

  /* 粗利・販管費計：太字＋上境界線 */
  .sub-total th, .sub-total td { font-weight: 800; border-top: 1.5px solid var(--line); background: var(--surface-2); }
  .sub-total .sticky { background: var(--surface-2); }
  /* 営業利益：さらに強い境界線 */
  .op-total th, .op-total td { font-weight: 800; border-top: 2px solid var(--ink); background: var(--surface-2); font-size: 13.5px; }
  .op-total .sticky { background: var(--surface-2); }

  /* 権限なし・空状態 */
  .lockcell { color: var(--muted); font-size: 13px; background: var(--surface-2); text-align: left; }
  .lockcell svg { vertical-align: -2px; margin-right: 6px; opacity: 0.7; }
  .emptycell { color: var(--muted); font-size: 13px; text-align: left; }
  .emptycell a { color: var(--primary-d); }

  .note { color: var(--muted); font-size: 12px; margin-top: 12px; }
</style>
