<script>
  export let data;
  export let form;
  $: editing = data.editing;
</script>

<div class="page-head"><h1 class="page-title">取引先</h1></div>

{#if form?.error}<p class="flash-err">{form.error}</p>{/if}
{#if form?.ok}<p class="flash-ok">取引先を追加しました。</p>{/if}

<div class="layout">
  <div class="main">
    {#if data.clients.length === 0}
      <div class="empty">取引先がまだありません。右のフォームから追加してください。</div>
    {:else}
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>取引先名</th><th>担当</th><th>住所</th><th>メール</th><th></th></tr></thead>
          <tbody>
            {#each data.clients as c}
              <tr>
                <td><b>{c.name}</b> {c.honorific}</td>
                <td>{c.contact ?? "—"}</td>
                <td>{c.postal_code ? `〒${c.postal_code} ` : ""}{c.address ?? "—"}</td>
                <td>{c.email ?? "—"}</td>
                <td class="r"><a class="mini" href={`/clients?edit=${c.id}`}>編集</a></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>

  {#if editing}
    <form class="section" method="POST" action="?/update">
      <div class="section-head"><h2>取引先を編集</h2><a class="mini" href="/clients">キャンセル</a></div>
      <input type="hidden" name="id" value={editing.id} />
      <div class="field"><span class="lab">取引先名</span><input class="input" name="name" value={editing.name} required /></div>
      <div class="field"><span class="lab">敬称</span>
        <select class="input" name="honorific"><option selected={editing.honorific === "御中"}>御中</option><option selected={editing.honorific === "様"}>様</option></select>
      </div>
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
      <div class="field"><span class="lab">担当</span><input class="input" name="contact" placeholder="総務部 ご担当者様" /></div>
      <div class="field"><span class="lab">郵便番号</span><input class="input" name="postal_code" placeholder="100-0001" /></div>
      <div class="field"><span class="lab">住所</span><input class="input" name="address" /></div>
      <div class="field"><span class="lab">メール</span><input class="input" name="email" type="email" /></div>
      <button type="submit" class="btn btn-primary" style="width:100%">追加する</button>
    </form>
  {/if}
</div>

<style>
  .layout { display: grid; grid-template-columns: minmax(0,1fr) 320px; gap: 20px; align-items: start; }
  @media (max-width: 860px) { .layout { grid-template-columns: 1fr; } }
  .mini { font-size: 13px; }
</style>
