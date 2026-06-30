<script>
  export let form;
</script>

<div class="authcard">
  <div class="brand"><span class="mark">IH</span> Invoice Harness</div>
  <h1>初期セットアップ</h1>
  <p class="sub">最初の管理者（オーナー）を作成します。</p>
  {#if form?.error}<p class="flash-err">{form.error}</p>{/if}
  <form method="POST">
    <div class="field"><span class="lab">氏名</span><input class="input" name="name" required /></div>
    <div class="field"><span class="lab">メールアドレス</span><input class="input" type="email" name="email" required /></div>
    <div class="field"><span class="lab">パスワード（8文字以上）</span><input class="input" type="password" name="password" required minlength="8" /></div>
    <button class="btn btn-primary" type="submit" style="width:100%">作成して開始</button>
  </form>
</div>

<style>
  .authcard { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; box-shadow: var(--shadow); padding: 32px; width: 380px; max-width: 100%; }
  .brand { display: flex; align-items: center; gap: 8px; font-weight: 800; margin-bottom: 18px; }
  .brand .mark { display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 7px; background: var(--primary); color: #fff; font-size: 12px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .sub { color: var(--ink-2); font-size: 13px; margin: 0 0 18px; }
</style>
