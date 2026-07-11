<script>
  import { formatYen } from "@invoice-harness/shared";
  import { enhance } from "$app/forms";
  export let data;
  export let form;

  // 期間・会社・対象・形式をフォーム状態として持ち、GET送信でプレビューを更新する。
  let fromYm = data.fromYm;
  let toYm = data.toYm;
  let issuerId = data.issuerId;
  let sales = data.include.sales;
  let receipts = data.include.receipts;
  let purchases = data.include.purchases;
  let expenses = data.include.expenses;
  let format = data.format;

  // ダウンロードURL（現在のフォーム状態をクエリに反映）。
  $: dlParams = new URLSearchParams({
    from: fromYm,
    to: toYm,
    ...(issuerId ? { iss: issuerId } : {}),
    sales: sales ? "1" : "0",
    receipts: receipts ? "1" : "0",
    purchases: purchases ? "1" : "0",
    expenses: expenses ? "1" : "0",
    format,
  }).toString();

  const ymd = (s) => (s ?? "").replace(/-/g, "/");
</script>

<div class="page-head">
  <h1 class="page-title">仕訳エクスポート</h1>
</div>

<p class="hint">
  全イベント（売上・入金・支払・経費）を仕訳形式で出力します。<b>freee・マネーフォワード</b>へは「汎用仕訳CSV」を、
  各ソフトのインポート（列の割り当て機能つき）で取り込めます。<b>弥生会計</b>は「弥生形式」を選んでください。
  勘定科目は下の設定で変更できます。
</p>

<!-- 抽出条件（GET：送信するとプレビューが更新される） -->
<form method="GET" class="panel">
  <div class="row">
    <label class="fld">
      <span>期間（開始月）</span>
      <input type="month" name="from" bind:value={fromYm} />
    </label>
    <label class="fld">
      <span>期間（終了月）</span>
      <input type="month" name="to" bind:value={toYm} />
    </label>
    {#if data.multiCompany}
      <label class="fld">
        <span>会社</span>
        <select name="iss" bind:value={issuerId}>
          <option value="">すべて（合算）</option>
          {#each data.issuers as iss}
            <option value={iss.id}>{iss.name}</option>
          {/each}
        </select>
      </label>
    {/if}
  </div>

  <div class="row targets">
    <span class="lbl">含める対象</span>
    <label class="chk"><input type="checkbox" name="sales" value="1" bind:checked={sales} />売上仕訳</label>
    <label class="chk"><input type="checkbox" name="receipts" value="1" bind:checked={receipts} />入金仕訳</label>
    <label class="chk"><input type="checkbox" name="purchases" value="1" bind:checked={purchases} />支払仕訳</label>
    <label class="chk"><input type="checkbox" name="expenses" value="1" bind:checked={expenses} />経費仕訳</label>
  </div>

  <div class="row targets">
    <span class="lbl">形式</span>
    <label class="chk"><input type="radio" name="format" value="generic" bind:group={format} />汎用仕訳CSV</label>
    <label class="chk"><input type="radio" name="format" value="yayoi" bind:group={format} />弥生形式</label>
  </div>

  <div class="row actions">
    <button type="submit" class="btn btn-quiet btn-sm">プレビュー更新</button>
    <a class="btn btn-primary btn-sm" href={`/reports/journal/download?${dlParams}`} data-sveltekit-reload>CSVダウンロード</a>
    <span class="count">{data.totalCount} 行</span>
  </div>
</form>

{#if data.payrollExcluded}
  <p class="warn">給与系の仕訳は閲覧権限がないため含まれていません。</p>
{/if}

<!-- プレビュー（先頭20行） -->
<div class="gridwrap">
  <table class="jtable">
    <thead>
      <tr>
        <th>日付</th>
        <th>借方</th>
        <th class="r">金額</th>
        <th>貸方</th>
        <th class="r">金額</th>
        <th>摘要</th>
      </tr>
    </thead>
    <tbody>
      {#if data.preview.length === 0}
        <tr><td colspan="6" class="empty">対象の仕訳がありません。期間・対象を見直してください。</td></tr>
      {:else}
        {#each data.preview as e}
          <tr>
            <td class="num">{ymd(e.date)}</td>
            <td>{e.debit}</td>
            <td class="r num">{formatYen(e.debitAmount)}</td>
            <td>{e.credit}</td>
            <td class="r num">{formatYen(e.creditAmount)}</td>
            <td class="memo">{e.memo}</td>
          </tr>
        {/each}
      {/if}
    </tbody>
  </table>
</div>
{#if data.totalCount > data.preview.length}
  <p class="note">先頭 {data.preview.length} 行を表示（全 {data.totalCount} 行）。全件はCSVをダウンロードしてください。</p>
{/if}

<!-- 科目マッピング設定 -->
<section class="mapping">
  <h2 class="sec-title">勘定科目マッピング</h2>
  <p class="hint">
    イベント種別ごとに借方・貸方の勘定科目を指定できます。空欄のまま保存すると既定値が使われます。
  </p>
  {#if form?.saved}<p class="ok">科目マッピングを保存しました。</p>{/if}
  {#if form?.error}<p class="warn">{form.error}</p>{/if}
  <form method="POST" action="?/saveMapping" use:enhance>
    <div class="gridwrap">
      <table class="jtable">
        <thead>
          <tr><th>イベント種別</th><th>借方勘定科目</th><th>貸方勘定科目</th></tr>
        </thead>
        <tbody>
          {#each data.mapping as m}
            <tr>
              <td class="evlbl">{m.label}</td>
              <td><input class="acc" name={`debit_${m.key}`} value={m.debit} /></td>
              <td><input class="acc" name={`credit_${m.key}`} value={m.credit} /></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <div class="row actions">
      <button type="submit" class="btn btn-primary btn-sm">科目マッピングを保存</button>
    </div>
  </form>
</section>

<style>
  .hint { color: var(--ink-2); font-size: 13px; margin-top: -4px; line-height: 1.7; }
  .panel { border: 1px solid var(--line); border-radius: var(--radius); background: var(--surface); padding: 14px 16px; margin: 14px 0; }
  .row { display: flex; gap: 14px; flex-wrap: wrap; align-items: flex-end; }
  .row + .row { margin-top: 12px; }
  .fld { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--ink-2); font-weight: 700; }
  .fld input, .fld select { padding: 7px 10px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); font-size: 13px; }
  .targets { align-items: center; }
  .lbl { font-size: 12px; color: var(--muted); font-weight: 700; }
  .chk { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: var(--ink-2); }
  .actions { align-items: center; }
  .count { font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; }
  .warn { color: var(--red, #c0392b); font-size: 13px; margin: 10px 0; font-weight: 700; }
  .ok { color: var(--primary-d); font-size: 13px; margin: 10px 0; font-weight: 700; }

  .gridwrap { overflow-x: auto; border: 1px solid var(--line); border-radius: var(--radius); background: var(--surface); -webkit-overflow-scrolling: touch; }
  .jtable { border-collapse: collapse; width: 100%; }
  .jtable th, .jtable td { padding: 8px 10px; border-bottom: 1px solid var(--line-2); white-space: nowrap; text-align: left; font-size: 13px; }
  .jtable thead th { background: var(--surface-2); font-size: 11px; color: var(--muted); font-weight: 700; }
  .jtable .r { text-align: right; }
  .num { font-variant-numeric: tabular-nums; }
  .memo { white-space: normal; min-width: 200px; color: var(--ink-2); }
  .empty { color: var(--muted); text-align: center; padding: 20px; }
  .acc { padding: 6px 8px; border: 1px solid var(--line); border-radius: 6px; background: var(--surface); font-size: 13px; width: 140px; }
  .evlbl { font-weight: 700; }

  .mapping { margin-top: 28px; }
  .sec-title { font-size: 15px; font-weight: 800; margin: 0 0 6px; }
  .note { color: var(--muted); font-size: 12px; margin-top: 10px; }
</style>
