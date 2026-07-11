<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { formatYen } from "@invoice-harness/shared";
  export let data;
  export let form;
  $: editing = data.editing;

  let addDlg;
  let editDlg;
  onMount(() => {
    if (data.editing) editDlg?.showModal();
    else if (form?.error) addDlg?.showModal();
  });
  const closeEdit = () => goto("/items");
</script>

<div class="page-head">
  <h1 class="page-title">品目マスタ</h1>
  <button class="btn btn-primary" type="button" on:click={() => addDlg.showModal()} title="品目を追加">＋ 新規作成</button>
</div>
<p class="hint">よく使う品目を登録すると、帳票の作成時に品目名から単価・単位・税率を呼び出せます。</p>

{#if data.items.length === 0}
  <div class="empty">品目がまだありません。<div style="margin-top:12px"><button class="btn btn-primary btn-sm" type="button" on:click={() => addDlg.showModal()} title="品目を追加">＋ 新規作成</button></div></div>
{:else}
  <div class="table-wrap">
    <table class="table">
      <thead><tr><th>品目名</th><th class="r">単価</th><th>単位</th><th>税率</th><th></th></tr></thead>
      <tbody>
        {#each data.items as it}
          <tr>
            <td><b>{it.name}</b></td>
            <td class="r num">{formatYen(it.unit_price)}</td>
            <td>{it.unit}</td>
            <td class="num">{it.tax_rate}%</td>
            <td class="r ops">
              <a class="mini" href={`/items?edit=${it.id}`}>編集</a>
              <form method="POST" action="?/delete"><input type="hidden" name="id" value={it.id} /><button class="del" type="submit">削除</button></form>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<dialog class="modal" bind:this={addDlg}>
  <div class="modal-head">
    <h2>品目を追加</h2>
    <button class="modal-x" type="button" on:click={() => addDlg.close()} aria-label="閉じる">×</button>
  </div>
  <form class="modal-body" method="POST" action="?/create">
    {#if form?.error}<p class="flash-err">{form.error}</p>{/if}
    <div class="field"><span class="lab">品目名</span><input class="input" name="name" required /></div>
    <div class="field"><span class="lab">単価</span><input class="input" name="unit_price" type="number" value="0" /></div>
    <div class="field"><span class="lab">単位</span><input class="input" name="unit" value="式" /></div>
    <div class="field"><span class="lab">税率</span>
      <select class="input" name="tax_rate"><option value="10">10%</option><option value="8">8%</option></select>
    </div>
    <button class="btn btn-primary" type="submit" style="width:100%">追加する</button>
  </form>
</dialog>

{#if editing}
  <dialog class="modal" bind:this={editDlg} on:close={closeEdit}>
    <div class="modal-head">
      <h2>品目を編集</h2>
      <button class="modal-x" type="button" on:click={() => editDlg.close()} aria-label="閉じる">×</button>
    </div>
    <form class="modal-body" method="POST" action="?/update">
      {#if form?.error}<p class="flash-err">{form.error}</p>{/if}
      <input type="hidden" name="id" value={editing.id} />
      <div class="field"><span class="lab">品目名</span><input class="input" name="name" value={editing.name} required /></div>
      <div class="field"><span class="lab">単価</span><input class="input" name="unit_price" type="number" value={editing.unit_price} /></div>
      <div class="field"><span class="lab">単位</span><input class="input" name="unit" value={editing.unit} /></div>
      <div class="field"><span class="lab">税率</span>
        <select class="input" name="tax_rate"><option value="10" selected={editing.tax_rate === 10}>10%</option><option value="8" selected={editing.tax_rate === 8}>8%</option></select>
      </div>
      <button class="btn btn-primary" type="submit" style="width:100%">更新する</button>
    </form>
  </dialog>
{/if}

<style>
  .hint { color: var(--ink-2); font-size: 13px; margin: -8px 0 14px; }
  .ops { display: flex; gap: 8px; justify-content: flex-end; align-items: center; }
  .ops form { margin: 0; }
  .mini { font-size: 13px; }
  .del { background: var(--red-soft); color: var(--red); border: none; border-radius: 6px; padding: 5px 10px; cursor: pointer; font-size: 13px; }
</style>
