<script>
  import { page } from "$app/stores";
  // 各ページから関連設定へ1クリックで飛べるギアメニュー。
  // props: links = [{ href, label }, ...]
  export let links = [];
  // owner のみ設定に触れるため、それ以外には描画しない
  $: isOwner = $page.data.user?.role === "owner";
</script>

{#if isOwner}
  <details class="gear">
    <summary aria-label="関連設定">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
    </summary>
    <div class="gear-menu">
      <div class="gear-head">関連する設定</div>
      {#each links as l}
        <a href={l.href}>{l.label}</a>
      {/each}
      <div class="gear-sep"></div>
      <a href="/settings">設定一覧</a>
    </div>
  </details>
{/if}

<style>
  .gear { position: relative; }
  /* summary を btn btn-ghost btn-sm 相当の丸ボタンに */
  .gear summary {
    list-style: none;
    display: inline-grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1px solid #d9dfeb;
    background: var(--surface);
    color: var(--ink-2);
    box-shadow: 0 1px 2px rgba(14, 21, 38, 0.05);
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s;
  }
  .gear summary::-webkit-details-marker { display: none; }
  .gear summary:hover { background: var(--surface-2); border-color: #c8d0e0; }
  .gear[open] summary { background: var(--surface-2); border-color: var(--primary); color: var(--primary-d); }

  .gear-menu {
    position: absolute;
    right: 0;
    top: calc(100% + 6px);
    min-width: 220px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 12px;
    box-shadow: var(--shadow-pop);
    padding: 6px;
    z-index: 50;
  }
  .gear-head { font-size: 11px; color: var(--muted); font-weight: 700; padding: 6px 14px 4px; }
  .gear-menu a {
    display: block;
    font-size: 13px;
    padding: 9px 14px;
    border-radius: 8px;
    color: var(--ink-2);
    text-decoration: none;
    white-space: nowrap;
  }
  .gear-menu a:hover { background: var(--surface-2); text-decoration: none; }
  .gear-sep { height: 1px; background: var(--line); margin: 5px 6px; }
</style>
