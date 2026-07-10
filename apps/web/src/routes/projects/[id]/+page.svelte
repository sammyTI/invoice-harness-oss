<script>
  import { DOCUMENT_SHORT, formatYen, lifecycle } from "@invoice-harness/shared";
  export let data;
  export let form;
  $: p = data.project;
  // 売上系（見積/納品/請求/領収）と支払系（発注/支払通知）に分けて表示
  $: salesDocs = data.docs.filter((d) => ["estimate", "delivery_note", "invoice", "receipt"].includes(d.type));
  $: costDocs = data.docs.filter((d) => ["order", "payment_notice"].includes(d.type));
  let editing = false;
</script>

<div class="page-head">
  <div class="ttl">
    <a class="back" href="/projects" aria-label="一覧へ">←</a>
    <h1 class="page-title">{p.name}<span class="chip {p.status === 'done' ? 'chip-paid' : 'chip-issued'}">{p.status === "done" ? "完了" : "進行中"}</span></h1>
  </div>
  <div class="acts">
    <button class="btn btn-quiet btn-sm" type="button" on:click={() => (editing = !editing)}>{editing ? "編集を閉じる" : "編集"}</button>
  </div>
</div>
<p class="meta">
  顧客: <a href={`/clients/${p.client_id}`}><b>{p.client_name}</b></a>
  {#if p.division_name}　区分: {p.division_name}{/if}
  {#if p.person}　担当: {p.person}{/if}
  {#if p.start_date}　期間: <span class="num">{p.start_date}{p.end_date ? ` 〜 ${p.end_date}` : " 〜"}</span>{/if}
</p>
{#if p.detail}<p class="detail">{p.detail}</p>{/if}
{#if form?.error}<p class="flash-err">{form.error}</p>{/if}
{#if form?.ok}<p class="flash-ok">保存しました。</p>{/if}

{#if editing}
  <form class="section editform" method="POST" action="?/update">
    <div class="grid2">
      <div class="field"><span class="lab">案件名</span><input class="input" name="name" value={p.name} required /></div>
      <div class="field"><span class="lab">顧客</span>
        <select class="input" name="client_id">{#each data.clients as c}<option value={c.id} selected={c.id === p.client_id}>{c.name}</option>{/each}</select>
      </div>
      <div class="field"><span class="lab">状態</span>
        <select class="input" name="status"><option value="active" selected={p.status !== "done"}>進行中</option><option value="done" selected={p.status === "done"}>完了</option></select>
      </div>
      <div class="field"><span class="lab">計上区分（部門）</span>
        <select class="input" name="division_id"><option value="">（未設定）</option>{#each data.divisions as d}<option value={d.id} selected={d.id === p.division_id}>{d.name}</option>{/each}</select>
      </div>
      {#if data.issuers.length > 1}
        <div class="field"><span class="lab">自社（発行元）</span>
          <select class="input" name="issuer_id"><option value="">（未指定）</option>{#each data.issuers as i}<option value={i.id} selected={i.id === p.issuer_id}>{i.name}</option>{/each}</select>
        </div>
      {/if}
      <div class="field"><span class="lab">担当者</span><input class="input" name="person" value={p.person ?? ""} /></div>
      <div class="field"><span class="lab">開始日</span><input class="input" type="date" name="start_date" value={p.start_date ?? ""} /></div>
      <div class="field"><span class="lab">完了日</span><input class="input" type="date" name="end_date" value={p.end_date ?? ""} /></div>
    </div>
    <div class="field"><span class="lab">詳細</span><textarea class="input" name="detail" rows="2">{p.detail ?? ""}</textarea></div>
    <button class="btn btn-primary" type="submit">保存</button>
  </form>
  <form class="delform" method="POST" action="?/delete" on:submit={(e) => { if (!confirm("このプロジェクトを削除します。帳票は残り、割当だけ外れます。よろしいですか？")) e.preventDefault(); }}>
    <button class="btn btn-danger btn-sm" type="submit">プロジェクトを削除</button>
  </form>
{/if}

<div class="kpis">
  <div class="kpi card accent-rev"><span class="lab">請求合計（税込）</span><span class="val num">{formatYen(p.revenue)}</span></div>
  <div class="kpi card accent-exp"><span class="lab">支払合計（税込）</span><span class="val num">{formatYen(p.expense)}</span></div>
  <div class="kpi card accent-profit"><span class="lab">粗利</span><span class="val num" class:neg={p.profit < 0}>{formatYen(p.profit)}</span></div>
</div>

<div class="sub-head">
  <h2>請求・見積（売上側）</h2>
  <div class="btns">
    <a class="btn btn-primary btn-sm" href={`/new?type=invoice&project=${p.id}`}>＋ 請求書</a>
    <a class="btn btn-quiet btn-sm" href={`/new?type=estimate&project=${p.id}`}>＋ 見積書</a>
  </div>
</div>
{#if salesDocs.length === 0}
  <div class="empty">まだありません。</div>
{:else}
  <div class="table-wrap">
    <table class="table">
      <thead><tr><th>種別</th><th>請求先・番号</th><th class="r">金額(税込)</th><th>発行日</th><th>状態</th></tr></thead>
      <tbody>
        {#each salesDocs as d}
          <tr>
            <td><span class="tchip">{DOCUMENT_SHORT[d.type]}</span></td>
            <td>
              <a href={`/doc/${d.id}`}><b>{d.client_name}</b></a>{#if d.client_name !== p.client_name}<span class="diffnote">（管理顧客と別）</span>{/if}
              <div class="sub num">{d.number}</div>
            </td>
            <td class="r num">{formatYen(d.total)}</td>
            <td class="num">{d.issue_date}</td>
            <td><span class="chip {lifecycle(d).cls}">{lifecycle(d).label}</span></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<div class="sub-head">
  <h2>支払（外注費・仕入側）</h2>
  <div class="btns">
    <a class="btn btn-primary btn-sm" href={`/new?type=payment_notice&project=${p.id}`}>＋ 支払通知書</a>
    <a class="btn btn-quiet btn-sm" href={`/new?type=order&project=${p.id}`}>＋ 発注書</a>
  </div>
</div>
<p class="costnote">支払先（外注先・仕入先）を取引先として選び、支払通知書/発注書を作成するとこのプロジェクトの支払として集計されます。</p>
{#if costDocs.length === 0}
  <div class="empty">まだありません。</div>
{:else}
  <div class="table-wrap">
    <table class="table">
      <thead><tr><th>種別</th><th>支払先・番号</th><th class="r">金額(税込)</th><th>発行日</th><th>支払期日</th><th>状態</th></tr></thead>
      <tbody>
        {#each costDocs as d}
          <tr>
            <td><span class="tchip">{DOCUMENT_SHORT[d.type]}</span></td>
            <td><a href={`/doc/${d.id}`}><b>{d.client_name}</b></a><div class="sub num">{d.number}</div></td>
            <td class="r num">{formatYen(d.total)}</td>
            <td class="num">{d.issue_date}</td>
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
  .page-title { display: flex; align-items: center; gap: 10px; }
  .meta { color: var(--ink-2); font-size: 13px; margin: -8px 0 4px; }
  .detail { color: var(--muted); font-size: 13px; white-space: pre-wrap; margin: 0 0 8px; }
  .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin: 14px 0 6px; }
  @media (max-width: 700px) { .kpis { grid-template-columns: 1fr; } }
  .kpi { padding: 16px 18px; display: flex; flex-direction: column; gap: 5px; border-top: 3px solid transparent; }
  .kpi.accent-rev { border-top-color: var(--primary); }
  .kpi.accent-exp { border-top-color: var(--amber); }
  .kpi.accent-profit { border-top-color: var(--green); }
  .kpi .lab { font-size: 12px; color: var(--muted); }
  .kpi .val { font-size: 22px; font-weight: 800; }
  .kpi .val.neg { color: var(--red); }
  .sub-head { margin: 22px 0 10px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
  .sub-head h2 { font-size: 16px; margin: 0; }
  .btns { display: flex; gap: 8px; flex-wrap: wrap; }
  .costnote { font-size: 12px; color: var(--muted); margin: -4px 0 10px; }
  .tchip { display: inline-grid; place-items: center; min-width: 30px; height: 22px; padding: 0 6px; border-radius: 6px; background: var(--slate-soft); color: var(--ink-2); font-size: 12px; font-weight: 700; }
  .dnum { font-weight: 700; }
  .sub { font-size: 11px; color: var(--muted); }
  .diffnote { font-size: 11px; color: var(--amber); margin-left: 4px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
  .grid2 > .field { min-width: 0; }
  @media (max-width: 640px) { .grid2 { grid-template-columns: 1fr; } }
  .editform { margin-bottom: 6px; }
  .delform { margin: 0 0 10px; text-align: right; }
</style>
