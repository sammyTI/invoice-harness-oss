<script>
  import { formatYen, lifecycle } from "@invoice-harness/shared";
  export let data;
  export let form;

  const paid = (d) => d.status === "paid";
  const overdue = (d) => !paid(d) && d.due_date && d.due_date < data.today;

  $: filters = [
    { key: "all", label: `全ての${data.label}`, n: data.counts.all },
    { key: "unsent", label: "送付待ち", n: data.counts.unsent },
    { key: "undraft", label: "確定待ち", n: data.counts.undraft },
    { key: "unpaid", label: "入金待ち", n: data.counts.unpaid },
    { key: "overdue", label: "入金期日超過", n: data.counts.overdue },
  ];
  $: qs = data.q ? `&q=${encodeURIComponent(data.q)}` : "";
  $: fhref = (k) => (k === "all" ? `/docs/${data.type}${data.q ? `?q=${encodeURIComponent(data.q)}` : ""}` : `/docs/${data.type}?view=${k}${qs}`);
  $: sortHref = (col) => {
    const dir = data.sort === col && data.dir === "asc" ? "desc" : "asc";
    return `/docs/${data.type}?view=${data.view}&sort=${col}&dir=${dir}${qs}`;
  };
  $: arrow = (col) => (data.sort === col ? (data.dir === "asc" ? " ▲" : " ▼") : "");
  $: pageHref = (p) => `/docs/${data.type}?view=${data.view}&sort=${data.sort}&dir=${data.dir}&page=${p}${qs}`;

  let allChecked = false;
  function toggleAll(e) {
    allChecked = e.target.checked;
    document.querySelectorAll('input[name="ids"]').forEach((c) => (c.checked = allChecked));
  }
</script>

<div class="page-head">
  <h1 class="page-title">{data.label}</h1>
  <a class="btn btn-primary" href={`/new?type=${data.type}`}>＋ 新規作成</a>
</div>

<form class="searchbar" method="GET">
  <input type="hidden" name="view" value={data.view} />
  <input class="input" name="q" value={data.q} placeholder="取引先名・番号で検索" />
  <button class="btn btn-quiet btn-sm" type="submit">検索</button>
  {#if data.q}<a class="btn btn-quiet btn-sm" href={`/docs/${data.type}`}>クリア</a>{/if}
</form>

{#if form?.bulk}<p class="flash-ok">{form.bulk}</p>{/if}
{#if form?.error}<p class="flash-err">{form.error}</p>{/if}

<div class="layout">
  <aside class="filters">
    <div class="filt-h">フィルタ条件</div>
    {#each filters as f}
      <a class="frow" class:active={data.view === f.key} href={fhref(f.key)}><span>{f.label}</span><span class="cnt num">{f.n}</span></a>
    {/each}
  </aside>

  <div class="main">
    {#if data.documents.length === 0}
      <div class="empty">該当する{data.label}はありません。<div style="margin-top:10px"><a class="btn btn-primary btn-sm" href={`/new?type=${data.type}`}>＋ 作成</a></div></div>
    {:else}
      <form method="POST">
        <div class="bulkbar">
          <span class="muted num">{data.total}件 / {data.page}–{data.pageCount}ページ</span>
          <div class="bulk-actions">
            <button class="btn btn-quiet btn-sm" formaction="?/bulkSend" type="submit">選択を送付済みに</button>
            <button class="btn btn-danger btn-sm" formaction="?/bulkDelete" type="submit" on:click={(e) => { if (!confirm("選択した帳票を削除します。よろしいですか？")) e.preventDefault(); }}>選択を削除</button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="table list">
            <thead>
              <tr>
                <th class="chk"><input type="checkbox" on:change={toggleAll} checked={allChecked} /></th>
                <th><a class="sh" href={sortHref("client")}>取引先・番号{arrow("client")}</a></th>
                <th class="r"><a class="sh" href={sortHref("total")}>金額{arrow("total")}</a></th>
                <th><a class="sh" href={sortHref("issue_date")}>発行日{arrow("issue_date")}</a></th>
                <th>期日</th>
                <th>状態</th>
              </tr>
            </thead>
            <tbody>
              {#each data.documents as d}
                <tr>
                  <td class="chk"><input type="checkbox" name="ids" value={d.id} /></td>
                  <td><a class="cname" href={`/doc/${d.id}`}>{d.client_name}</a><div class="num muted docno">{d.number}</div></td>
                  <td class="r num amt">{formatYen(d.total)}</td>
                  <td class="num">{d.issue_date}</td>
                  <td class="num" class:over={overdue(d)}>{d.due_date ?? "—"}</td>
                  <td><span class="chip {lifecycle(d).cls}">{lifecycle(d).label}</span></td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </form>

      {#if data.pageCount > 1}
        <div class="pager">
          <a class="btn btn-quiet btn-sm" class:is-disabled={data.page <= 1} href={pageHref(data.page - 1)}>← 前</a>
          <span class="muted num">{data.page} / {data.pageCount}</span>
          <a class="btn btn-quiet btn-sm" class:is-disabled={data.page >= data.pageCount} href={pageHref(data.page + 1)}>次 →</a>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .searchbar { display: flex; gap: 8px; align-items: center; margin: 0 0 14px; }
  .searchbar .input { max-width: 320px; }
  .layout { display: grid; grid-template-columns: 190px minmax(0, 1fr); gap: 20px; align-items: start; }
  @media (max-width: 920px) { .layout { grid-template-columns: 1fr; } }
  .filters { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); box-shadow: var(--shadow); padding: 8px; }
  .filt-h { font-size: 11px; color: var(--muted); font-weight: 700; padding: 6px 12px 8px; }
  .frow { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-radius: var(--radius-sm); color: var(--ink-2); font-size: 14px; text-decoration: none; }
  .frow:hover { background: var(--surface-2); text-decoration: none; }
  .frow.active { background: var(--primary-soft); color: var(--primary-d); font-weight: 700; }
  .frow .cnt { color: var(--muted); font-size: 13px; }
  .bulkbar { display: flex; justify-content: space-between; align-items: center; padding: 0 2px 10px; }
  .bulk-actions { display: flex; gap: 8px; }
  .muted { color: var(--muted); }
  .list th, .list td { white-space: nowrap; }
  .list .chk { width: 36px; text-align: center; }
  .list .amt { font-weight: 700; }
  .sh { color: var(--ink-2); text-decoration: none; }
  .sh:hover { color: var(--primary); }
  .cname { font-weight: 700; }
  .docno { font-size: 11px; }
  td.over { color: var(--red); font-weight: 700; }
  .pager { display: flex; align-items: center; gap: 14px; justify-content: center; margin-top: 16px; }
</style>
