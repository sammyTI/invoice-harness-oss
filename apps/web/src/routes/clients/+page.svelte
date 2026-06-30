<script>
  export let data;
  export let form;
  $: editing = data.editing;
  $: catChecked = (id) => editing && data.editingCatIds.includes(id);
</script>

<div class="page-head"><h1 class="page-title">取引先</h1></div>

{#if form?.error}<p class="flash-err">{form.error}</p>{/if}
{#if form?.ok}<p class="flash-ok">保存しました。</p>{/if}

<div class="layout">
  <div class="main">
    {#if data.clients.length === 0}
      <div class="empty">取引先がまだありません。右のフォームから追加してください。</div>
    {:else}
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>取引先名</th><th>区分</th><th>担当</th><th>住所</th><th></th></tr></thead>
          <tbody>
            {#each data.clients as c}
              <tr>
                <td><b>{c.name}</b> {c.honorific}</td>
                <td>
                  {#each (data.catMap[c.id] ?? []) as cat}<span class="catchip">{cat}</span>{:else}<span class="muted">—</span>{/each}
                </td>
                <td>{c.contact ?? "—"}</td>
                <td>{c.postal_code ? `〒${c.postal_code} ` : ""}{c.address ?? "—"}</td>
                <td class="r"><a class="mini" href={`/clients?edit=${c.id}`}>編集</a></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>

  <div class="side">
    {#if editing}
      <form class="section" method="POST" action="?/update">
        <div class="section-head"><h2>取引先を編集</h2><a class="mini" href="/clients">キャンセル</a></div>
        <input type="hidden" name="id" value={editing.id} />
        <div class="field"><span class="lab">取引先名</span><input class="input" name="name" value={editing.name} required /></div>
        <div class="field"><span class="lab">敬称</span>
          <select class="input" name="honorific"><option selected={editing.honorific === "御中"}>御中</option><option selected={editing.honorific === "様"}>様</option></select>
        </div>
        {#if data.categories.length}
          <div class="field"><span class="lab">顧客区分（複数可）</span>
            <div class="catpick">
              {#each data.categories as cat}
                <label class="catopt"><input type="checkbox" name="category_ids" value={cat.id} checked={catChecked(cat.id)} /> <span>{cat.name}</span></label>
              {/each}
            </div>
          </div>
        {/if}
        <div class="field"><span class="lab">担当</span><input class="input" name="contact" value={editing.contact ?? ""} /></div>
        <div class="field"><span class="lab">郵便番号</span><input class="input" name="postal_code" value={editing.postal_code ?? ""} /></div>
        <div class="field"><span class="lab">住所</span><input class="input" name="address" value={editing.address ?? ""} /></div>
        <div class="field"><span class="lab">メール</span><input class="input" name="email" type="email" value={editing.email ?? ""} /></div>
        <button type="submit" class="btn btn-primary" style="width:100%">更新する</button>
      </form>
    {:else}
      <form class="section" method="POST" action="?/create">
        <div class="section-head"><h2>取引先を追加</h2></div>
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
        <button type="submit" class="btn btn-primary" style="width:100%">追加する</button>
      </form>
    {/if}

    <details class="section catmaster" open={data.categories.length === 0}>
      <summary>顧客区分マスタを管理</summary>
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
    </details>
  </div>
</div>

<style>
  .layout { display: grid; grid-template-columns: minmax(0,1fr) 320px; gap: 20px; align-items: start; }
  @media (max-width: 860px) { .layout { grid-template-columns: 1fr; } }
  .side { display: flex; flex-direction: column; gap: 16px; }
  .mini { font-size: 13px; }
  .muted { color: var(--muted); }
  .catchip { display: inline-block; background: var(--primary-soft); color: var(--primary-d); border-radius: 999px; padding: 2px 10px; font-size: 12px; font-weight: 700; margin: 0 4px 4px 0; }
  .catpick { display: flex; flex-direction: column; gap: 6px; border: 1px solid var(--line); border-radius: var(--radius-sm); padding: 8px 10px; max-height: 160px; overflow-y: auto; }
  .catopt { display: flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer; }
  .catopt input { width: 16px; height: 16px; }
  .catmaster { padding: 14px 16px; }
  .catmaster summary { font-weight: 700; cursor: pointer; }
  .chint { font-size: 12px; color: var(--muted); margin: 8px 0 10px; line-height: 1.6; }
  .catadd { display: flex; gap: 8px; margin-bottom: 10px; }
  .catrow { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 5px 0; border-top: 1px solid var(--line-2); }
  .catrow form { margin: 0; }
  .catdel { background: var(--red-soft); color: var(--red); border: none; border-radius: 6px; padding: 3px 10px; cursor: pointer; font-size: 12px; }
</style>
