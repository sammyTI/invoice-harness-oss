<script>
  export let data;
  export let form;
</script>

<div class="page-head"><h1 class="page-title">帳票テンプレート</h1></div>
<p class="hint">帳票の色と、種別ごとの既定の備考を設定します。新規作成時に備考が自動で入ります。</p>
{#if form?.ok}<p class="flash-ok">保存しました。</p>{/if}

<form method="POST">
  <section class="section">
    <div class="section-head"><h2>アクセントカラー</h2></div>
    <div class="field" style="max-width:220px">
      <span class="lab">帳票の見出し・合計色</span>
      <input class="input" type="color" name="accent_color" value={data.accent} style="height:42px;padding:4px" />
    </div>
  </section>

  <section class="section">
    <div class="section-head"><h2>種別ごとの既定備考</h2></div>
    {#each data.types as t}
      <div class="field">
        <span class="lab">{t.label}</span>
        <textarea class="input" name={`notes_${t.type}`} rows="2" placeholder="この種別の作成時に入る備考">{t.notes}</textarea>
      </div>
    {/each}
  </section>

  <button class="btn btn-primary" type="submit">保存</button>
</form>

<style>
  .hint { color: var(--ink-2); font-size: 13px; margin-top: -8px; }
  form { max-width: 720px; }
</style>
