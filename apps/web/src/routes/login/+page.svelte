<script>
  import { page } from "$app/stores";
  export let form;
  $: next = $page.url.searchParams.get("next") ?? "/";
</script>

<div class="authcard">
  <div class="brand"><span class="mark">IH</span> Invoice Harness</div>
  <h1>ログイン</h1>
  {#if form?.error}<p class="flash-err">{form.error}</p>{/if}
  <form method="POST">
    <input type="hidden" name="next" value={next} />
    <div class="field"><span class="lab">メールアドレス</span><input class="input" type="email" name="email" required /></div>
    <div class="field"><span class="lab">パスワード</span><input class="input" type="password" name="password" required /></div>
    <button class="btn btn-primary" type="submit" style="width:100%">ログイン</button>
  </form>
</div>

<style>
  .authcard { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; box-shadow: var(--shadow); padding: 32px; width: 360px; max-width: 100%; }
  .brand { display: flex; align-items: center; gap: 8px; font-weight: 800; margin-bottom: 18px; }
  .brand .mark { display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 7px; background: var(--primary); color: #fff; font-size: 12px; }
  h1 { font-size: 20px; margin: 0 0 18px; }
</style>
