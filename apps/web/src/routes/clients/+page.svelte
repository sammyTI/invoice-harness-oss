<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  export let data;
  export let form;
  $: editing = data.editing;
  // viewer（閲覧のみ）は作成・編集系UIを非表示
  $: isViewer = $page.data.user?.role === "viewer";

  let addDlg;
  let editDlg;
  let catDlg;
  onMount(() => {
    // 追加モーダルはバリデーションエラー時に開く（クライアント遷移は絡まないのでonMountで十分）
    if (form?.error) addDlg?.showModal();
  });
  // クライアント遷移でも ?edit= でモーダルが開くように（onMountは再実行されないため）
  // editDlg は {#if editing} 内なので bind:this の代入でこの文が再評価される
  $: if (data.editing && editDlg && !editDlg.open) editDlg.showModal();
  const closeEdit = () => goto("/clients");
</script>

<div class="page-head">
  <h1 class="page-title">取引先</h1>
  {#if !isViewer}
    <div class="acts">
      <button class="btn btn-quiet btn-sm" type="button" on:click={() => catDlg.showModal()}>顧客区分マスタ</button>
      <button class="btn btn-primary" type="button" on:click={() => addDlg.showModal()} title="取引先を追加">＋ 新規作成</button>
    </div>
  {/if}
</div>

{#if form?.ok}<p class="flash-ok">保存しました。</p>{/if}

<form class="searchbar" method="GET">
  <input class="input fq" name="q" value={data.q} placeholder="取引先名・担当・メールで検索" />
  {#if data.categories.length}
    <select class="input fsel" name="cat">
      <option value="">すべての区分</option>
      {#each data.categories as cat}<option value={cat.id} selected={cat.id === data.cat}>{cat.name}</option>{/each}
    </select>
  {/if}
  <button class="btn btn-quiet btn-sm" type="submit">絞り込み</button>
  {#if data.q || data.cat}<a class="btn btn-quiet btn-sm" href="/clients">クリア</a>{/if}
</form>

{#if data.clients.length === 0}
  {#if data.q || data.cat}
    <div class="empty">条件に一致する取引先がありません。</div>
  {:else}
    <div class="empty">取引先がまだありません。{#if !isViewer}<div style="margin-top:12px"><button class="btn btn-primary btn-sm" type="button" on:click={() => addDlg.showModal()} title="取引先を追加">＋ 新規作成</button></div>{/if}</div>
  {/if}
{:else}
  <div class="table-wrap">
    <table class="table">
      <thead><tr><th>取引先名</th><th>区分</th><th>担当</th><th>住所</th><th></th></tr></thead>
      <tbody>
        {#each data.clients as c}
          <tr>
            <td><a class="cnamelink" href={`/clients/${c.id}`}><b>{c.name}</b></a> {c.honorific}</td>
            <td>
              {#if c.registration_number}<span class="chip chip-paid" title={c.registration_number}>適格</span>{/if}
              {#each (data.catMap[c.id] ?? []) as cat}<span class="catchip">{cat}</span>{/each}
              {#if !c.registration_number && !(data.catMap[c.id] ?? []).length}<span class="muted">—</span>{/if}
            </td>
            <td>{c.contact ?? "—"}</td>
            <td>{c.postal_code ? `〒${c.postal_code} ` : ""}{c.address ?? "—"}</td>
            <td class="r">{#if !isViewer}<a class="mini" href={`/clients?edit=${c.id}`}>編集</a>{/if}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<!-- 追加モーダル -->
<dialog class="modal" bind:this={addDlg}>
  <div class="modal-head">
    <h2>取引先を追加</h2>
    <button class="modal-x" type="button" on:click={() => addDlg.close()} aria-label="閉じる">×</button>
  </div>
  <form class="modal-body" method="POST" action="?/create">
    {#if form?.error}<p class="flash-err">{form.error}</p>{/if}
    <div class="field"><span class="lab">取引先名</span><input class="input" name="name" required /></div>
    <div class="field"><span class="lab">敬称</span>
      <select class="input" name="honorific"><option>御中</option><option>様</option></select>
    </div>
    {#if data.categories.length}
      <div class="field"><span class="lab">顧客区分（複数可）</span>
        <div class="catpick">
          {#each data.categories as cat}
            <label class="catopt"><input type="checkbox" name="category_ids" value={cat.id} /> <span>{cat.name}</span></label>
          {/each}
        </div>
      </div>
    {/if}
    <div class="field"><span class="lab">担当</span><input class="input" name="contact" placeholder="総務部 ご担当者様" /></div>
    <div class="field"><span class="lab">郵便番号</span><input class="input" name="postal_code" placeholder="100-0001" /></div>
    <div class="field"><span class="lab">住所</span><input class="input" name="address" /></div>
    <div class="field"><span class="lab">メール</span><input class="input" name="email" type="email" /></div>
    <div class="field">
      <span class="lab">インボイス登録番号</span>
      <input class="input" name="registration_number" placeholder="T1234567890123" />
      <span class="hint">未登録（免税事業者・個人など）の場合は空欄。支払先が未登録の場合、仕入税額控除の経過措置対象になります。</span>
    </div>
    <button type="submit" class="btn btn-primary" style="width:100%">追加する</button>
  </form>
</dialog>

<!-- 編集モーダル（?edit= で開く） -->
{#if editing}
  <dialog class="modal" bind:this={editDlg} on:close={closeEdit}>
    <div class="modal-head">
      <h2>取引先を編集</h2>
      <button class="modal-x" type="button" on:click={() => editDlg.close()} aria-label="閉じる">×</button>
    </div>
    <form class="modal-body" method="POST" action="?/update">
      {#if form?.error}<p class="flash-err">{form.error}</p>{/if}
      <input type="hidden" name="id" value={editing.id} />
      <div class="field"><span class="lab">取引先名</span><input class="input" name="name" value={editing.name} required /></div>
      <div class="field"><span class="lab">敬称</span>
        <select class="input" name="honorific"><option selected={editing.honorific === "御中"}>御中</option><option selected={editing.honorific === "様"}>様</option></select>
      </div>
      {#if data.categories.length}
        <div class="field"><span class="lab">顧客区分（複数可）</span>
          <div class="catpick">
            {#each data.categories as cat}
              <label class="catopt"><input type="checkbox" name="category_ids" value={cat.id} checked={data.editingCatIds.includes(cat.id)} /> <span>{cat.name}</span></label>
            {/each}
          </div>
        </div>
      {/if}
      <div class="field"><span class="lab">担当</span><input class="input" name="contact" value={editing.contact ?? ""} /></div>
      <div class="field"><span class="lab">郵便番号</span><input class="input" name="postal_code" value={editing.postal_code ?? ""} /></div>
      <div class="field"><span class="lab">住所</span><input class="input" name="address" value={editing.address ?? ""} /></div>
      <div class="field"><span class="lab">メール</span><input class="input" name="email" type="email" value={editing.email ?? ""} /></div>
      <div class="field">
        <span class="lab">インボイス登録番号</span>
        <input class="input" name="registration_number" placeholder="T1234567890123" value={editing.registration_number ?? ""} />
        <span class="hint">未登録（免税事業者・個人など）の場合は空欄。支払先が未登録の場合、仕入税額控除の経過措置対象になります。</span>
      </div>
      <button type="submit" class="btn btn-primary" style="width:100%">更新する</button>
    </form>
  </dialog>
{/if}

<!-- 顧客区分マスタ モーダル -->
<dialog class="modal" bind:this={catDlg}>
  <div class="modal-head">
    <h2>顧客区分マスタ</h2>
    <button class="modal-x" type="button" on:click={() => catDlg.close()} aria-label="閉じる">×</button>
  </div>
  <div class="modal-body">
    <p class="chint">VIP・代理店・製造業 などの区分を登録すると、取引先に複数タグ付けできます。</p>
    <form method="POST" action="?/addCategory" class="catadd">
      <input class="input" name="cat_name" placeholder="区分名" required />
      <button class="btn btn-quiet btn-sm" type="submit">追加</button>
    </form>
    {#each data.categories as cat}
      <div class="catrow">
        <span class="catchip">{cat.name}</span>
        <form method="POST" action="?/deleteCategory" on:submit={(e) => { if (!confirm(`「${cat.name}」を削除します。各取引先からも外れます。よろしいですか？`)) e.preventDefault(); }}>
          <input type="hidden" name="id" value={cat.id} />
          <button class="catdel" type="submit">削除</button>
        </form>
      </div>
    {:else}
      <p class="muted">まだ区分がありません。</p>
    {/each}
  </div>
</dialog>

<style>
  .acts { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .searchbar { display: flex; gap: 8px; align-items: center; margin: 0 0 14px; flex-wrap: wrap; }
  .searchbar .fq { max-width: 240px; }
  .searchbar .fsel { width: auto; max-width: 200px; font-size: 13px; }
  .mini { font-size: 13px; }
  .muted { color: var(--muted); }
  .hint { display: block; font-size: 12px; color: var(--muted); margin-top: 4px; line-height: 1.6; }
  .catchip { display: inline-block; background: var(--primary-soft); color: var(--primary-d); border-radius: 999px; padding: 2px 10px; font-size: 12px; font-weight: 700; margin: 0 4px 4px 0; }
  .catpick { display: flex; flex-direction: column; gap: 6px; border: 1px solid var(--line); border-radius: var(--radius-sm); padding: 8px 10px; max-height: 160px; overflow-y: auto; }
  .catopt { display: flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer; }
  .catopt input { width: 16px; height: 16px; }
  .chint { font-size: 12px; color: var(--muted); margin: 0 0 10px; line-height: 1.6; }
  .catadd { display: flex; gap: 8px; margin-bottom: 10px; }
  .catrow { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 0; border-top: 1px solid var(--line-2); }
  .catrow form { margin: 0; }
  .catdel { background: var(--red-soft); color: var(--red); border: none; border-radius: 6px; padding: 3px 10px; cursor: pointer; font-size: 12px; }
</style>
