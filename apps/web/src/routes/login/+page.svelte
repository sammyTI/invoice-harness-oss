<script>
  import { page } from "$app/stores";
  export let form;
  export let data;
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
  {#if data.demoLogin}
    <div class="divider"><span>または</span></div>
    <form method="POST" action="?/demo">
      <button class="btn btn-ghost" type="submit" style="width:100%">デモアカウントで見る（ログイン不要）</button>
    </form>
    <p class="demo-note">サンプルデータ入りの環境をそのまま操作できます。</p>
  {/if}
</div>

<style>
  .authcard { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; box-shadow: var(--shadow); padding: 32px; width: 360px; max-width: 100%; }
  .brand { display: flex; align-items: center; gap: 8px; font-weight: 800; margin-bottom: 18px; }
  .brand .mark { display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 7px; background: var(--primary); color: #fff; font-size: 12px; }
  h1 { font-size: 20px; margin: 0 0 18px; }
  /* デモボタン用の区切り線と注記 */
  .divider { display: flex; align-items: center; gap: 10px; margin: 18px 0 14px; color: var(--muted); font-size: 12px; }
  .divider::before, .divider::after { content: ""; flex: 1; height: 1px; background: var(--line); }
  .demo-note { margin: 8px 0 0; font-size: 12px; color: var(--muted); text-align: center; }
</style>
