<script>
  import { onMount } from "svelte";
  import { formatYen } from "@invoice-harness/shared";
  import { page } from "$app/stores";
  export let data;
  export let form;

  $: [yy, mm] = data.month.split("-");
  $: issQ = data.issuerId ? `&iss=${data.issuerId}` : "";
  // viewer（閲覧のみ）は登録・削除UIを非表示（サーバ側 hooks でも書き込みは拒否される）
  $: isViewer = $page.data.user?.role === "viewer";

  // 科目キー→ラベル / 機微フラグ の索引
  $: catMap = new Map(data.categories.map((c) => [c.key, c]));
  $: divMap = new Map(data.divisions.map((d) => [d.id, d.name]));

  let addDlg;
  // モーダルを開いたときの科目初期値（機微注記の出し分けに使う）
  let selectedCat = "rent";
  $: selectedIsConfidential = catMap.get(selectedCat)?.confidential ?? false;

  // 金額入力のカンマ整形
  let amountStr = "";
  function onAmount(e) {
    const digits = e.target.value.replace(/[^\d]/g, "");
    amountStr = digits ? Number(digits).toLocaleString("en-US") : "";
  }

  function openAdd() {
    selectedCat = data.categories.find((c) => !c.confidential)?.key ?? data.categories[0]?.key ?? "";
    amountStr = "";
    addDlg?.showModal();
  }

  onMount(() => {
    if (form?.error) addDlg?.showModal();
  });
</script>

<div class="page-head">
  <h1 class="page-title">経費・給与<span class="tag num">{yy}年{mm}月</span></h1>
  <div class="fynav">
    <a class="btn btn-quiet btn-sm" href={`/expenses?m=${data.prev}${issQ}`}>← 前月</a>
    {#if !data.isCurrent}<a class="btn btn-quiet btn-sm" href={`/expenses${data.issuerId ? `?iss=${data.issuerId}` : ""}`}>今月</a>{/if}
    <a class="btn btn-quiet btn-sm" href={`/expenses?m=${data.next}${issQ}`}>翌月 →</a>
    <a class="btn btn-quiet btn-sm csv-btn" href={`${$page.url.pathname}/export.csv${$page.url.search}`} title="表示中の経費をCSVで出力">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
      CSV
    </a>
    {#if !isViewer}<button class="btn btn-primary btn-sm" type="button" on:click={openAdd}>＋ 新規作成</button>{/if}
  </div>
</div>
<p class="hint">帳票に載らない販管費（給与・家賃・通信費など）を月ごとに記録します。給与・法定福利費は閲覧権限のある方だけに表示されます。</p>

{#if data.multiCompany}
  <div class="companynav">
    <a class="cbtn" class:active={!data.issuerId} href={`/expenses?m=${data.month}`}>全社</a>
    {#each data.issuers as iss}
      <a class="cbtn" class:active={data.issuerId === iss.id} href={`/expenses?m=${data.month}&iss=${iss.id}`}>{iss.name}</a>
    {/each}
  </div>
{/if}

{#if form?.copied === true}<p class="flash-ok">前月の経費をコピーしました。</p>{/if}
{#if form?.copied === false}<p class="flash-err">{form.copyMsg}</p>{/if}

<div class="cols-head">
  <div class="totalbox card">
    <span class="lab">{data.mayViewPayroll ? "経費合計（税込）" : "表示可能な経費の合計（税込）"}</span>
    <span class="val num">{formatYen(data.total)}</span>
  </div>
  <div class="copy-wrap">
    {#if !isViewer}
      <form method="POST" action="?/copyPrev" on:submit={(e) => { if (!confirm(`${data.prev} の経費を ${data.month} にコピーします。よろしいですか？（当月に既に経費がある場合はコピーされません）`)) e.preventDefault(); }}>
        <input type="hidden" name="ym" value={data.month} />
        <input type="hidden" name="iss" value={data.issuerId} />
        <button class="btn btn-quiet btn-sm" type="submit">先月をコピー</button>
      </form>
    {/if}
  </div>
</div>

{#if !data.mayViewPayroll && data.hiddenCount > 0}
  <p class="masknote">給与・法定福利費は閲覧権限がないため表示されていません（{data.hiddenCount}件）。</p>
{/if}

{#if data.expenses.length === 0}
  <div class="empty">
    この月の経費はまだありません。
    {#if !isViewer}<div style="margin-top:12px"><button class="btn btn-primary btn-sm" type="button" on:click={openAdd}>＋ 新規作成</button></div>{/if}
  </div>
{:else}
  <div class="table-wrap">
    <table class="table">
      <thead><tr><th>科目</th><th>摘要</th><th>部門</th><th class="r">金額(税込)</th><th></th></tr></thead>
      <tbody>
        {#each data.expenses as e}
          <tr>
            <td>
              <span class="cchip" class:conf={e.confidential === 1}>
                {#if e.confidential === 1}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
                {/if}
                {catMap.get(e.category)?.label ?? e.category}
              </span>
            </td>
            <td>{e.label ?? "—"}</td>
            <td>{e.division_id ? (divMap.get(e.division_id) ?? "—") : "—"}</td>
            <td class="r num">{formatYen(e.amount)}</td>
            <td class="r ops">
              {#if !isViewer}
                <form method="POST" action="?/delete"><input type="hidden" name="id" value={e.id} /><button class="del" type="submit">削除</button></form>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
      <tfoot>
        <tr><td colspan="3" class="r"><b>{data.mayViewPayroll ? "合計" : "表示可能な経費の合計"}</b></td><td class="r num"><b>{formatYen(data.total)}</b></td><td></td></tr>
      </tfoot>
    </table>
  </div>
{/if}

<dialog class="modal" bind:this={addDlg}>
  <div class="modal-head">
    <h2>経費を追加</h2>
    <button class="modal-x" type="button" on:click={() => addDlg.close()} aria-label="閉じる">×</button>
  </div>
  <form class="modal-body" method="POST" action="?/create">
    {#if form?.error}<p class="flash-err">{form.error}</p>{/if}
    <input type="hidden" name="ym" value={data.month} />
    {#if data.issuerId}
      <input type="hidden" name="issuer_id" value={data.issuerId} />
    {/if}
    <div class="field"><span class="lab">科目</span>
      <select class="input" name="category" bind:value={selectedCat} required>
        {#each data.categories as c}
          <option value={c.key} disabled={c.confidential && !data.mayViewPayroll}>
            {c.label}{c.confidential ? "（給与系）" : ""}
          </option>
        {/each}
      </select>
      {#if selectedIsConfidential}<span class="cathint">※ 閲覧権限者のみ表示されます</span>{/if}
    </div>
    <div class="field"><span class="lab">摘要</span><input class="input" name="label" placeholder="例: 6月分給与" /></div>
    <div class="field"><span class="lab">金額（円）</span>
      <input class="input num" name="amount" inputmode="numeric" value={amountStr} on:input={onAmount} placeholder="0" required />
    </div>
    {#if !data.issuerId && data.issuers.length > 0}
      <div class="field"><span class="lab">会社</span>
        <select class="input" name="issuer_id" required>
          {#each data.issuers as iss}<option value={iss.id}>{iss.name}</option>{/each}
        </select>
      </div>
    {/if}
    <div class="field"><span class="lab">部門</span>
      <select class="input" name="division_id">
        <option value="">（未指定）</option>
        {#each data.divisions as d}<option value={d.id}>{d.name}</option>{/each}
      </select>
    </div>
    <div class="field"><span class="lab">計上月</span><span class="fixedval num">{yy}年{mm}月</span></div>
    <button class="btn btn-primary" type="submit" style="width:100%">追加する</button>
  </form>
</dialog>

<style>
  .fynav { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .csv-btn { display: inline-flex; align-items: center; gap: 5px; }
  .hint { color: var(--ink-2); font-size: 13px; margin: -8px 0 14px; }
  .companynav { display: flex; gap: 8px; flex-wrap: wrap; margin: 0 0 16px; }
  .cbtn { padding: 7px 16px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); color: var(--ink-2); font-size: 13px; font-weight: 700; text-decoration: none; }
  .cbtn:hover { border-color: var(--primary); color: var(--primary-d); }
  .cbtn.active { background: var(--primary); border-color: var(--primary); color: #fff; }
  .flash-ok { background: var(--green-soft, #e7f6ec); color: var(--green, #17843f); border-radius: 8px; padding: 8px 12px; font-size: 13px; margin: 0 0 12px; }
  .cols-head { display: flex; align-items: stretch; justify-content: space-between; gap: 14px; margin-bottom: 14px; flex-wrap: wrap; }
  .totalbox { padding: 14px 18px; display: flex; flex-direction: column; gap: 4px; min-width: 220px; }
  .totalbox .lab { font-size: 11.5px; font-weight: 700; color: var(--muted); }
  .totalbox .val { font-size: 24px; font-weight: 800; letter-spacing: -0.02em; }
  .copy-wrap { display: flex; align-items: center; }
  .masknote { background: var(--slate-soft); color: var(--ink-2); border-radius: 8px; padding: 8px 12px; font-size: 12.5px; margin: 0 0 12px; }
  .cchip { display: inline-flex; align-items: center; gap: 4px; background: var(--slate-soft); color: var(--ink-2); border-radius: 6px; padding: 2px 9px; font-size: 12px; font-weight: 700; }
  .cchip.conf { background: var(--amber-soft, #fbf1de); color: #8a5a13; }
  .cchip svg { flex-shrink: 0; }
  .cathint { display: block; font-size: 12px; color: #8a5a13; margin-top: 4px; }
  .fixedval { display: inline-block; padding: 8px 0; font-weight: 700; color: var(--ink-2); }
  .ops { white-space: nowrap; vertical-align: middle; }
  .ops form { display: inline-block; margin: 0; vertical-align: middle; }
  .del { background: var(--red-soft); color: var(--red); border: none; border-radius: 6px; padding: 5px 10px; cursor: pointer; font-size: 13px; vertical-align: middle; }
  tfoot td { border-top: 2px solid var(--line); }
</style>
