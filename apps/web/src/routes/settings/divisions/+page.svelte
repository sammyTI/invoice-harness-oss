<script>
  import { onMount } from "svelte";
  export let data;
  export let form;
  $: issuerName = (id) => data.issuers.find((i) => i.id === id)?.name ?? "全社共通";

  let addDlg;
  onMount(() => {
    // バリデーションエラー時は追加モーダルを開いたままにする
    if (form?.error) addDlg?.showModal();
  });
</script>

<div class="page-head">
  <h1 class="page-title">計上区分（部門・事業部）</h1>
  <button class="btn btn-primary" type="button" on:click={() => addDlg.showModal()} title="区分を追加">＋ 新規作成</button>
</div>
<p class="hint">帳票を部門ごとに分類すると、トップの収支ダッシュボードで<b>部門別の売上・費用・利益</b>が見られます（例：制作部 / 展示会事業部）。</p>
{#if form?.ok}<p class="flash-ok">保存しました。</p>{/if}

{#if data.divisions.length === 0}
  <div class="empty">区分がまだありません。<div style="margin-top:12px"><button class="btn btn-primary btn-sm" type="button" on:click={() => addDlg.showModal()}>＋ 新規作成</button></div></div>
{:else}
  <div class="table-wrap">
    <table class="table">
      <thead><tr><th>区分名</th><th>会社</th><th class="r">操作</th></tr></thead>
      <tbody>
        {#each data.divisions as d}
          <tr>
            <td>{d.name}</td>
            <td>{issuerName(d.issuer_id)}</td>
            <td class="r">
              <form method="POST" action="?/delete" on:submit={(e) => { if (!confirm(`「${d.name}」を削除します。割り当て済みの帳票は区分なしに戻ります。よろしいですか？`)) e.preventDefault(); }}>
                <input type="hidden" name="id" value={d.id} /><button class="del" type="submit">削除</button>
              </form>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<!-- 追加モーダル -->
<dialog class="modal" bind:this={addDlg}>
  <div class="modal-head">
    <h2>区分を追加</h2>
    <button class="modal-x" type="button" on:click={() => addDlg.close()} aria-label="閉じる">×</button>
  </div>
  <form class="modal-body" method="POST" action="?/create">
    {#if form?.error}<p class="flash-err">{form.error}</p>{/if}
    <div class="field"><span class="lab">区分名</span><input class="input" name="name" required placeholder="制作部 / 展示会事業部 等" /></div>
    <div class="field"><span class="lab">会社（発行元）</span>
      <select class="input" name="issuer_id">
        <option value="">全社共通</option>
        {#each data.issuers as iss}<option value={iss.id}>{iss.name}</option>{/each}
      </select>
    </div>
    <button class="btn btn-primary" type="submit" style="width:100%">追加する</button>
  </form>
</dialog>

<style>
  .hint { color: var(--ink-2); font-size: 13px; margin-top: -8px; }
  .del { background: var(--red-soft); color: var(--red); border: none; border-radius: 6px; padding: 5px 10px; cursor: pointer; font-size: 13px; }
</style>
