<script>
  export let data;
  export let form;
  const LABELS = { send: "帳票送付メール", dunning: "未入金 催促メール" };
</script>

<div class="page-head"><h1 class="page-title">メールテンプレート</h1></div>
<p class="hint">差し込み変数：<code>{"{client}"}</code> <code>{"{issuer}"}</code> <code>{"{label}"}</code> <code>{"{number}"}</code> <code>{"{subject}"}</code> <code>{"{amount}"}</code> <code>{"{issue_date}"}</code> <code>{"{due}"}</code> <code>{"{link}"}</code></p>
{#if form?.ok}<p class="flash-ok">{LABELS[form.key]}を保存しました。</p>{/if}

{#each data.templates as t}
  <form class="section" method="POST" action="?/save">
    <div class="section-head"><h2>{LABELS[t.key] ?? t.key}</h2></div>
    <input type="hidden" name="key" value={t.key} />
    <div class="field"><span class="lab">件名</span><input class="input" name="subject" value={t.subject} /></div>
    <div class="field"><span class="lab">本文</span><textarea class="input" name="body" rows="8">{t.body}</textarea></div>
    <button class="btn btn-primary" type="submit">保存</button>
  </form>
{/each}

<style>
  .hint { color: var(--ink-2); font-size: 12px; margin-top: -8px; }
  code { background: var(--slate-soft); padding: 1px 6px; border-radius: 5px; font-size: 12px; }
</style>
