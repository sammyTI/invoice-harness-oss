<script>
  import { formatYen, lifecycle } from "@invoice-harness/shared";
  export let data;
  $: [yy, mm] = data.month.split("-");
  $: issQ = data.issuerId ? `&iss=${data.issuerId}` : "";
  const effDiv = (d) => d.division_name ?? d.project_division_name ?? null;
</script>

<div class="page-head">
  <h1 class="page-title">月次入出金<span class="tag num">{yy}年{mm}月</span></h1>
  <div class="fynav">
    <a class="btn btn-quiet btn-sm" href={`/monthly?m=${data.prev}${issQ}`}>← 前月</a>
    {#if !data.isCurrent}<a class="btn btn-quiet btn-sm" href={`/monthly?${issQ.slice(1)}`}>今月</a>{/if}
    <a class="btn btn-quiet btn-sm" href={`/monthly?m=${data.next}${issQ}`}>翌月 →</a>
  </div>
</div>

{#if data.multiCompany}
  <div class="companynav">
    <a class="cbtn" class:active={!data.issuerId} href={`/monthly?m=${data.month}`}>全社合算</a>
    {#each data.issuers as iss}
      <a class="cbtn" class:active={data.issuerId === iss.id} href={`/monthly?m=${data.month}&iss=${iss.id}`}>{iss.name}</a>
    {/each}
  </div>
{/if}

<div class="kpis">
  <div class="kpi card accent-rev">
    <span class="lab">請求額合計（税込）</span>
    <span class="val num">{formatYen(data.kpi.revTotal)}</span>
    <span class="sub num">入金済 {formatYen(data.kpi.revPaid)} ／ 入金待ち {formatYen(data.kpi.revUnpaid)}</span>
  </div>
  <div class="kpi card accent-exp">
    <span class="lab">支払額合計（税込）</span>
    <span class="val num">{formatYen(data.kpi.expTotal)}</span>
    <span class="sub num">支払済 {formatYen(data.kpi.expPaid)} ／ 支払待ち {formatYen(data.kpi.expUnpaid)}</span>
  </div>
  <div class="kpi card accent-profit">
    <span class="lab">粗利（請求 − 支払）</span>
    <span class="val num" class:neg={data.kpi.profit < 0}>{formatYen(data.kpi.profit)}</span>
  </div>
</div>

<div class="cols">
  <section class="pane">
    <div class="pane-head rev"><h2>請求情報（{data.invoices.length}件）</h2><span class="num">{formatYen(data.kpi.revTotal)}</span></div>
    {#if data.invoices.length === 0}
      <div class="empty">この月の請求はありません。</div>
    {:else}
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>請求先・件名</th><th class="r">金額(税込)</th><th>請求日</th><th>入金日</th><th>状態</th></tr></thead>
          <tbody>
            {#each data.invoices as d}
              <tr>
                <td>
                  <a href={`/doc/${d.id}`}><b>{d.client_name}</b></a>
                  <div class="sub">{d.subject ?? d.number}</div>
                  <div class="dmeta">
                    {#if effDiv(d)}<span class="mchip">{effDiv(d)}</span>{/if}
                    {#if d.project_name}<span class="mchip prj">{d.project_name}</span>{/if}
                  </div>
                </td>
                <td class="r num">{formatYen(d.total)}</td>
                <td class="num">{d.issue_date.slice(5)}</td>
                <td class="num">{d.paid_at ? d.paid_at.slice(5, 10) : "—"}</td>
                <td><span class="chip {lifecycle(d).cls}">{lifecycle(d).label}</span></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>

  <section class="pane">
    <div class="pane-head exp"><h2>支払情報（{data.payments.length}件）</h2><span class="num">{formatYen(data.kpi.expTotal)}</span></div>
    {#if data.payments.length === 0}
      <div class="empty">この月の支払はありません。</div>
    {:else}
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>支払先・件名</th><th class="r">金額(税込)</th><th>支払期日</th><th>支払日</th><th>状態</th></tr></thead>
          <tbody>
            {#each data.payments as d}
              <tr>
                <td>
                  <a href={`/doc/${d.id}`}><b>{d.client_name}</b></a>
                  <div class="sub">{d.subject ?? d.number}</div>
                  <div class="dmeta">
                    {#if effDiv(d)}<span class="mchip">{effDiv(d)}</span>{/if}
                    {#if d.project_name}<span class="mchip prj">{d.project_name}</span>{/if}
                  </div>
                </td>
                <td class="r num">{formatYen(d.total)}</td>
                <td class="num">{d.due_date ? d.due_date.slice(5) : "—"}</td>
                <td class="num">{d.paid_at ? d.paid_at.slice(5, 10) : "—"}</td>
                <td><span class="chip {lifecycle(d).cls}">{lifecycle(d).label}</span></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>
</div>

<style>
  .fynav { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .companynav { display: flex; gap: 8px; flex-wrap: wrap; margin: 0 0 16px; }
  .cbtn { padding: 7px 16px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); color: var(--ink-2); font-size: 13px; font-weight: 700; text-decoration: none; }
  .cbtn:hover { border-color: var(--primary); color: var(--primary-d); }
  .cbtn.active { background: var(--primary); border-color: var(--primary); color: #fff; }
  .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 18px; }
  @media (max-width: 860px) { .kpis { grid-template-columns: 1fr; } }
  .kpi { position: relative; padding: 18px 20px 16px; display: flex; flex-direction: column; gap: 6px; overflow: hidden; }
  .kpi::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px; }
  .kpi.accent-rev::before { background: var(--grad); }
  .kpi.accent-exp::before { background: var(--amber); }
  .kpi.accent-profit::before { background: var(--green); }
  .kpi .lab { font-size: 11.5px; font-weight: 700; color: var(--muted); }
  .kpi .val { font-size: 26px; font-weight: 800; letter-spacing: -0.02em; }
  .kpi .val.neg { color: var(--red); }
  .kpi .sub { font-size: 12px; color: var(--muted); }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: start; }
  @media (max-width: 1080px) { .cols { grid-template-columns: 1fr; } }
  .pane-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 0 0 10px; padding-left: 10px; border-left: 3px solid var(--primary); }
  .pane-head.exp { border-left-color: var(--amber); }
  .pane-head h2 { font-size: 15px; font-weight: 800; margin: 0; }
  .pane-head .num { font-weight: 800; font-size: 15px; }
  .sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .dmeta { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 3px; }
  .mchip { display: inline-block; background: var(--slate-soft); color: var(--ink-2); border-radius: 6px; padding: 1px 7px; font-size: 11px; font-weight: 700; }
  .mchip.prj { background: var(--primary-soft); color: var(--primary-d); }
  .table-wrap .table { min-width: 480px; }
</style>
