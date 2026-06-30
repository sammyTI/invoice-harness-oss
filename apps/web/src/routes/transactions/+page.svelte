<script>
  import { formatYen } from "@invoice-harness/shared";
  export let data;
  export let form;
  let showImport = false;

  const filters = [
    { key: "unmatched", label: "未消込" },
    { key: "matched", label: "消込済" },
    { key: "ignored", label: "対象外" },
    { key: "all", label: "すべて" },
  ];
</script>

<div class="page-head">
  <h1 class="page-title">入出金明細・消込</h1>
  <button class="btn btn-primary" on:click={() => (showImport = !showImport)}>{showImport ? "閉じる" : "＋ 明細を取り込む"}</button>
</div>

<p class="hint">銀行・カードの明細を取り込み、入金を未入金の請求書に紐づけて消込します。明細はCSV取込のほか、APIからも投入できます（設定 ▸ 連携）。</p>

{#if form?.error}<p class="flash-err">{form.error}</p>{/if}
{#if form?.imported !== undefined}<p class="flash-ok">{form.imported}件を取り込みました（重複スキップ {form.total - form.imported}件）。</p>{/if}
{#if form?.ok}<p class="flash-ok">更新しました。</p>{/if}

{#if showImport}
  <form class="section" method="POST" action="?/import" enctype="multipart/form-data">
    <div class="section-head"><h2>CSV取込</h2></div>
    <p class="desc">ヘッダ行に「日付／摘要／入金・出金（または金額）」を含むCSVに対応（UTF-8）。列は自動判定します。</p>
    <div class="field"><span class="lab">口座・カード名</span><input class="input" name="account" placeholder="みずほ銀行 / 楽天カード 等" /></div>
    <div class="field"><span class="lab">CSVファイル</span><input class="input" type="file" name="file" accept=".csv,text/csv" /></div>
    <div class="field"><span class="lab">または貼り付け</span><textarea class="input" name="paste" rows="4" placeholder="日付,摘要,入金,出金&#10;2026-06-20,カ）テクノブリッジ,385000,"></textarea></div>
    <button class="btn btn-primary" type="submit">取り込む</button>
  </form>
{/if}

<div class="tabs">
  {#each filters as f}
    <a class="tab" class:active={data.view === f.key} href={`/transactions?view=${f.key}`}>{f.label}{#if f.key !== "all"}<span class="n">{data.counts[f.key]}</span>{/if}</a>
  {/each}
</div>

{#if data.rows.length === 0}
  <div class="empty">{data.view === "unmatched" ? "未消込の明細はありません。" : "明細がありません。"}</div>
{:else}
  <div class="txns">
    {#each data.rows as { txn, candidates }}
      <div class="txn card">
        <div class="txn-main">
          <div class="txn-info">
            <span class="d num">{txn.txn_date}</span>
            <span class="desc">{txn.description ?? "—"}</span>
            {#if txn.account}<span class="acct">{txn.account}</span>{/if}
          </div>
          <div class="amt num" class:in={txn.amount > 0} class:out={txn.amount < 0}>{txn.amount > 0 ? "+" : ""}{formatYen(txn.amount)}</div>
        </div>

        {#if txn.status === "unmatched" && txn.amount > 0}
          {#if candidates.length}
            <div class="cands">
              <div class="cand-h">紐づけ候補</div>
              {#each candidates as c}
                <form method="POST" action="?/reconcile" class="cand">
                  <input type="hidden" name="txn_id" value={txn.id} />
                  <input type="hidden" name="document_id" value={c.id} />
                  <span class="c-cli">{c.client_name}</span>
                  <span class="c-no num">{c.number}</span>
                  <span class="c-bal num">残 {formatYen(c.balance)}</span>
                  {#if c.score >= 80}<span class="chip chip-paid">高一致</span>{:else if c.score >= 50}<span class="chip chip-sent">候補</span>{/if}
                  <button class="btn btn-primary btn-sm" type="submit">この請求書に紐づけ</button>
                </form>
              {/each}
            </div>
          {:else}
            <div class="nocand">一致する未入金の請求書が見つかりません。</div>
          {/if}
          <form method="POST" action="?/ignore" class="ignore"><input type="hidden" name="txn_id" value={txn.id} /><button class="link" type="submit">対象外にする</button></form>
        {:else if txn.status === "matched"}
          <div class="matched-row">
            <a href={`/doc/${txn.matched_document_id}`}>紐づけ済みの帳票を開く →</a>
            <form method="POST" action="?/unmatch"><input type="hidden" name="txn_id" value={txn.id} /><button class="link" type="submit">消込解除</button></form>
          </div>
        {:else if txn.amount < 0}
          <div class="nocand">出金明細（消込対象外）。{#if txn.status !== "ignored"}<form method="POST" action="?/ignore" style="display:inline"><input type="hidden" name="txn_id" value={txn.id} /> <button class="link" type="submit">対象外にする</button></form>{/if}</div>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<style>
  .hint { color: var(--ink-2); font-size: 13px; margin-top: -8px; }
  .desc { color: var(--ink-2); font-size: 13px; }
  .tabs { display: flex; gap: 8px; margin: 16px 0; flex-wrap: wrap; }
  .tab { padding: 7px 14px; border-radius: 999px; background: var(--surface); border: 1px solid var(--line); color: var(--ink-2); text-decoration: none; font-size: 14px; }
  .tab.active { background: var(--primary-soft); color: var(--primary-d); border-color: #cfe0fb; font-weight: 700; }
  .tab .n { margin-left: 6px; font-size: 12px; color: var(--muted); }
  .txns { display: flex; flex-direction: column; gap: 12px; }
  .txn { padding: 14px 16px; }
  .txn-main { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
  .txn-info { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .txn-info .d { font-size: 12px; color: var(--muted); }
  .txn-info .desc { font-weight: 700; word-break: break-word; }
  .txn-info .acct { font-size: 12px; color: var(--muted); }
  .amt { font-weight: 800; white-space: nowrap; }
  .amt.in { color: var(--green); }
  .amt.out { color: var(--ink-2); }
  .cands { margin-top: 12px; border-top: 1px dashed var(--line); padding-top: 10px; }
  .cand-h { font-size: 12px; color: var(--muted); font-weight: 700; margin-bottom: 6px; }
  .cand { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 6px 0; border-bottom: 1px solid var(--line-2); margin: 0; }
  .cand .c-cli { font-weight: 700; }
  .cand .c-no { font-size: 12px; color: var(--muted); }
  .cand .c-bal { font-size: 13px; margin-left: auto; }
  .nocand { margin-top: 10px; font-size: 13px; color: var(--muted); }
  .ignore { margin-top: 8px; }
  .link { background: none; border: none; color: var(--primary); cursor: pointer; font-size: 13px; padding: 0; }
  .matched-row { margin-top: 10px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
</style>
