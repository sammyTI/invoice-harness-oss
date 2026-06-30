<script>
  import { page } from "$app/stores";
  $: isHub = $page.url.pathname === "/settings";
</script>

{#if !isHub}
  <a class="setback" href="/settings">← 設定一覧へ戻る</a>
{/if}
<slot />

<style>
  .setback {
    display: inline-block;
    margin-bottom: 14px;
    color: var(--ink-2);
    font-size: 13px;
    text-decoration: none;
  }
  .setback:hover { color: var(--primary); text-decoration: underline; }
</style>
