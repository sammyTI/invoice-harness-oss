<script>
  export let data;
  export let form;
</script>

{#if data.mustChange}
  <div class="authcard">
    <div class="brand"><span class="mark">IH</span> Invoice Harness</div>
    <h1>パスワードの設定</h1>
    <p class="sub">初期パスワードでログインしました。続けるには、ご自身のパスワードを設定してください。</p>
    {#if form?.error}<p class="flash-err">{form.error}</p>{/if}
    <form method="POST">
      <div class="field"><span class="lab">新しいパスワード（8文字以上）</span><input class="input" type="password" name="password" required minlength="8" /></div>
      <div class="field"><span class="lab">確認のためもう一度</span><input class="input" type="password" name="confirm" required minlength="8" /></div>
      <button class="btn btn-primary" type="submit" style="width:100%">設定して開始</button>
    </form>
  </div>
{:else}
  <div class="page-head"><h1 class="page-title">パスワード変更</h1></div>
  {#if form?.error}<p class="flash-err">{form.error}</p>{/if}
  <form class="section" method="POST" style="max-width:440px">
    <div class="field"><span class="lab">現在のパスワード</span><input class="input" type="password" name="current" required /></div>
    <div class="field"><span class="lab">新しいパスワード（8文字以上）</span><input class="input" type="password" name="password" required minlength="8" /></div>
    <div class="field"><span class="lab">確認のためもう一度</span><input class="input" type="password" name="confirm" required minlength="8" /></div>
    <button class="btn btn-primary" type="submit">変更する</button>
  </form>
{/if}

<style>
  .authcard { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; box-shadow: var(--shadow); padding: 32px; width: 380px; max-width: 100%; }
  .brand { display: flex; align-items: center; gap: 8px; font-weight: 800; margin-bottom: 18px; }
  .brand .mark { display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 7px; background: var(--primary); color: #fff; font-size: 12px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .sub { color: var(--ink-2); font-size: 13px; margin: 0 0 18px; }
</style>
