<script>
  export let data;
  export let form;
</script>

<div class="page-head"><h1 class="page-title">備考テンプレート</h1></div>
<p class="hint">よく使う備考文を登録すると、帳票作成・編集時に選んで適用できます。「既定」に設定したテンプレートは新規作成時に最初から備考へ入ります。</p>
{#if form?.error}<p class="flash-err">{form.error}</p>{/if}
{#if form?.ok}<p class="flash-ok">保存しました。</p>{/if}

<div class="layout">
  <div class="main">
    {#if data.templates.length === 0}
      <div class="empty">テンプレートがまだありません。</div>
    {:else}
      {#each data.templates as t}
        <div class="card row" class:is-default={t.is_default}>
          <div>
            <div class="nm">{t.name}{#if t.is_default}<span class="badge">既定</span>{/if}</div>
            <div class="bd">{t.body}</div>
          </div>
          <div class="acts">
            {#if t.is_default}
              <form method="POST" action="?/clearDefault"><button class="btn btn-quiet btn-sm" type="submit">既定を解除</button></form>
            {:else}
              <form method="POST" action="?/setDefault"><input type="hidden" name="id" value={t.id} /><button class="btn btn-quiet btn-sm" type="submit">既定にする</button></form>
            {/if}
            <form method="POST" action="?/delete"><input type="hidden" name="id" value={t.id} /><button class="del" type="submit">削除</button></form>
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <form class="section" method="POST" action="?/create">
    <div class="section-head"><h2>テンプレートを追加</h2></div>
    <div class="field"><span class="lab">名称</span><input class="input" name="name" required placeholder="振込手数料のお願い 等" /></div>
    <div class="field"><span class="lab">本文</span><textarea class="input" name="body" rows="4" required></textarea></div>
    <button class="btn btn-primary" type="submit" style="width:100%">追加する</button>
  </form>
</div>

<style>
  .hint { color: var(--ink-2); font-size: 13px; margin-top: -8px; }
  .acts { display: flex; gap: 8px; align-items: flex-start; flex: none; }
  .row.is-default { border: 1px solid var(--primary); background: var(--primary-soft); }
  .badge { display: inline-block; margin-left: 8px; font-size: 11px; font-weight: 700; color: var(--primary-d); background: #fff; border: 1px solid var(--primary); border-radius: 6px; padding: 1px 7px; vertical-align: middle; }
  .layout { display: grid; grid-template-columns: minmax(0,1fr) 320px; gap: 20px; align-items: start; }
  @media (max-width: 860px) { .layout { grid-template-columns: 1fr; } }
  .row { display: flex; justify-content: space-between; gap: 14px; padding: 14px 16px; margin-bottom: 12px; }
  .nm { font-weight: 700; margin-bottom: 4px; }
  .bd { color: var(--ink-2); font-size: 13px; white-space: pre-wrap; }
  .del { background: var(--red-soft); color: var(--red); border: none; border-radius: 6px; padding: 5px 10px; cursor: pointer; font-size: 13px; height: fit-content; }
</style>
