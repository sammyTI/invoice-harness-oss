<script>
  import { DOCUMENT_SHORT, formatYen, lifecycle } from "@invoice-harness/shared";
  export let data;
  $: c = data.client;
  $: salesDocs = data.docs.filter((d) => ["estimate", "delivery_note", "invoice", "receipt"].includes(d.type));
  $: costDocs = data.docs.filter((d) => ["order", "payment_notice"].includes(d.type));
</script>

<div class="page-head">
  <div class="ttl">
    <a class="back" href="/clients" aria-label="一覧へ">←</a>
    <h1 class="page-title">{c.name} <span class="hono">{c.honorific}</span></h1>
  </div>
  <a class="btn btn-quiet btn-sm" href={`/clients?edit=${c.id}`}>顧客情報を編集</a>
</div>

<div class="info card">
  <div class="irow">
    {#each data.categories as cat}<span class="catchip">{cat}</span>{/each}
    {#if c.contact}<span class="kv"><span class="k">担当</span>{c.contact}</span>{/if}
    {#if c.email}<span class="kv"><span class="k">メール</span>{c.email}</span>{/if}
    {#if c.address}<span class="kv"><span class="k">住所</span>〒{c.postal_code} {c.address}</span>{/if}
  </div>
</div>

<div class="kpis">
  <div class="kpi card accent-rev"><span class="lab">請求合計（税込）</span><span class="val num">{formatYen(data.fin.revenue)}</span></div>
  <div class="kpi card accent-exp"><span class="lab">支払合計（税込）</span><span class="val num">{formatYen(data.fin.expense)}</span></div>
  <div class="kpi card accent-profit"><span class="lab">粗利</span><span class="val num" class:neg={data.fin.profit < 0}>{formatYen(data.fin.profit)}</span></div>
  <div class="kpi card"><span class="lab">未入金</span><span class="val num small">{formatYen(data.fin.unpaid)}</span></div>
</div>

<div class="sub-head">
  <h2>プロジェクト（{data.projects.length}件）</h2>
  <a class="btn btn-primary btn-sm" href={`/projects?client=${c.id}`}>＋ プロジェクトを作成</a>
</div>
{#if data.projects.length === 0}
  <div class="empty">プロジェクトがまだありません。</div>
{:else}
  <div class="table-wrap">
    <table class="table">
      <thead><tr><th>案件名</th><th>状態</th><th>期間</th><th class="r">請求</th><th class="r">支払</th><th class="r">粗利</th></tr></thead>
      <tbody>
        {#each data.projects as p}
          <tr class:done={p.status === "done"}>
            <td><a class="pname" href={`/projects/${p.id}`}>{p.name}</a></td>
            <td><span class="chip {p.status === 'done' ? 'chip-paid' : 'chip-issued'}">{p.status === "done" ? "完了" : "進行中"}</span></td>
            <td class="num">{p.start_date ?? "—"}{p.end_date ? ` 〜 ${p.end_date}` : ""}</td>
            <td class="r num">{formatYen(p.revenue)}</td>
            <td class="r num">{formatYen(p.expense)}</td>
            <td class="r num profit" class:neg={p.profit < 0}>{formatYen(p.profit)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<div class="sub-head"><h2>請求・見積（{salesDocs.length}件）</h2><a class="btn btn-quiet btn-sm" href={`/new?type=invoice`}>＋ 請求書</a></div>
{#if salesDocs.length === 0}
  <div class="empty">まだありません。</div>
{:else}
  <div class="table-wrap">
    <table class="table">
      <thead><tr><th>種別</th><th>番号・件名</th><th>プロジェクト</th><th class="r">金額(税込)</th><th>発行日</th><th>状態</th></tr></thead>
      <tbody>
        {#each salesDocs as d}
          <tr>
            <td><span class="tchip">{DOCUMENT_SHORT[d.type]}</span></td>
            <td>
              <a href={`/doc/${d.id}`} class="dnum num">{d.number}</a>
              {#if d.client_name !== c.name}<div class="sub">請求先: {d.client_name}</div>{/if}
            </td>
            <td class="pcell">{d.project_name ?? "—"}</td>
            <td class="r num">{formatYen(d.total)}</td>
            <td class="num">{d.issue_date}</td>
            <td><span class="chip {lifecycle(d).cls}">{lifecycle(d).label}</span></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<div class="sub-head"><h2>支払（{costDocs.length}件）</h2></div>
{#if costDocs.length === 0}
  <div class="empty">まだありません。</div>
{:else}
  <div class="table-wrap">
    <table class="table">
      <thead><tr><th>種別</th><th>番号</th><th>プロジェクト</th><th class="r">金額(税込)</th><th>支払期日</th><th>状態</th></tr></thead>
      <tbody>
        {#each costDocs as d}
          <tr>
            <td><span class="tchip">{DOCUMENT_SHORT[d.type]}</span></td>
            <td>
              <a href={`/doc/${d.id}`} class="dnum num">{d.number}</a>
              {#if d.client_name !== c.name}<div class="sub">支払先: {d.client_name}</div>{/if}
            </td>
            <td class="pcell">{d.project_name ?? "—"}</td>
            <td class="r num">{formatYen(d.total)}</td>
            <td class="num">{d.due_date ?? "—"}</td>
            <td><span class="chip {lifecycle(d).cls}">{lifecycle(d).label}</span></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<style>
  .ttl { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .back { display: inline-grid; place-items: center; width: 32px; height: 32px; border: 1px solid var(--line); border-radius: var(--radius-sm); color: var(--ink-2); background: var(--surface); flex: none; }
  .back:hover { background: var(--surface-2); text-decoration: none; }
  .hono { font-size: 14px; color: var(--muted); font-weight: 400; }
  .info { padding: 12px 16px; margin-bottom: 14px; }
  .irow { display: flex; gap: 6px 18px; flex-wrap: wrap; align-items: center; font-size: 13px; color: var(--ink-2); }
  .kv .k { color: var(--muted); font-size: 11px; margin-right: 5px; }
  .catchip { display: inline-block; background: var(--primary-soft); color: var(--primary-d); border-radius: 999px; padding: 2px 10px; font-size: 12px; font-weight: 700; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
  @media (max-width: 860px) { .kpis { grid-template-columns: repeat(2, 1fr); } }
  .kpi { padding: 16px 18px; display: flex; flex-direction: column; gap: 5px; border-top: 3px solid transparent; }
  .kpi.accent-rev { border-top-color: var(--primary); }
  .kpi.accent-exp { border-top-color: var(--amber); }
  .kpi.accent-profit { border-top-color: var(--green); }
  .kpi .lab { font-size: 12px; color: var(--muted); }
  .kpi .val { font-size: 22px; font-weight: 800; }
  .kpi .val.small { font-size: 20px; }
  .kpi .val.neg { color: var(--red); }
  .sub-head { margin: 22px 0 10px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
  .sub-head h2 { font-size: 16px; margin: 0; }
  .pname, .dnum { font-weight: 700; }
  .pcell { font-size: 13px; color: var(--ink-2); }
  .sub { font-size: 11px; color: var(--muted); margin-top: 2px; }
  .profit { font-weight: 700; }
  .profit.neg { color: var(--red); }
  tr.done td { opacity: 0.65; }
  .tchip { display: inline-grid; place-items: center; min-width: 30px; height: 22px; padding: 0 6px; border-radius: 6px; background: var(--slate-soft); color: var(--ink-2); font-size: 12px; font-weight: 700; }
</style>
