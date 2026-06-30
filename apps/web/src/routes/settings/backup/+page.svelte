<script>
  export let form;
</script>

<div class="page-head"><h1 class="page-title">バックアップ</h1></div>
<p class="hint">取引先・品目・帳票・明細・入金・各種設定・テンプレートを JSON で書き出し／取り込みできます（メンバー・トークン・監査ログは含みません）。</p>

{#if form?.error}<p class="flash-err">{form.error}</p>{/if}
{#if form?.ok}<p class="flash-ok">バックアップから復元しました。</p>{/if}

<div class="grid">
  <section class="section">
    <div class="section-head"><h2>エクスポート</h2></div>
    <p class="desc">現在の全データを JSON ファイルとしてダウンロードします。</p>
    <a class="btn btn-primary" href="/settings/backup/export" data-sveltekit-reload>JSONをダウンロード</a>
  </section>

  <section class="section">
    <div class="section-head"><h2>インポート（復元）</h2></div>
    <p class="desc warn">注意：取り込むと対象テーブルは<strong>現在のデータを置き換えます</strong>。先にエクスポートで控えを取ってください。</p>
    <form method="POST" action="?/import" enctype="multipart/form-data" on:submit={(e) => { if (!confirm("現在のデータを置き換えます。よろしいですか？")) e.preventDefault(); }}>
      <input class="input file" type="file" name="file" accept="application/json,.json" required />
      <button class="btn btn-danger" type="submit" style="margin-top:12px">この内容で復元</button>
    </form>
  </section>
</div>

<style>
  .hint { color: var(--ink-2); font-size: 13px; margin-top: -8px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } }
  .desc { font-size: 13px; color: var(--ink-2); }
  .desc.warn { color: #8a5a13; }
  .file { padding: 8px; }
</style>
