<script>
  import "../app.css";
  import { page } from "$app/stores";
  export let data;

  const tplNav = [
    { href: "/settings/templates/document", label: "帳票テンプレート" },
    { href: "/settings/templates/notes", label: "備考テンプレート" },
    { href: "/settings/templates/email", label: "メールテンプレート" },
    { href: "/settings/assets", label: "社印・ロゴ" },
  ];

  const settingsPaths = [
    "/settings/templates",
    "/settings/assets",
    "/settings/issuer",
    "/settings/tax",
    "/settings/audit",
    "/settings/email-log",
    "/settings/backup",
    "/settings/api",
  ];

  $: path = $page.url.pathname;
  $: bare = ["/login", "/setup", "/accept"].includes(path) || (path === "/account/password" && data?.user?.must_change_password);
  const active = (href) => path === href || (href !== "/" && path.startsWith(href));
  $: settingsActive = path === "/settings" || settingsPaths.some((p) => path.startsWith(p));
  // 管理系リンク（計上区分・入出金・メンバー・設定一覧）は owner のみ。
  // demo は公開デモ向けにこれら管理系へ入れないため、リンク自体も隠す。
  $: isAdmin = data?.user?.role === "owner";

  let navOpen = false;
  // ページ遷移したらドロワーを閉じる
  $: if (path) navOpen = false;
</script>

<svelte:head>
  <title>Invoice Harness</title>
  <link
    href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;800&display=swap"
    rel="stylesheet"
  />
</svelte:head>

{#if bare}
  <div class="bare">
    <slot />
  </div>
{:else}
<!-- モバイル用トップバー -->
<header class="topbar">
  <button class="hamburger" on:click={() => (navOpen = !navOpen)} aria-label="メニュー" aria-expanded={navOpen}>
    <span></span><span></span><span></span>
  </button>
  <a class="tb-brand" href="/"><span class="mark">IH</span> Invoice Harness</a>
</header>

{#if navOpen}
  <button class="scrim" on:click={() => (navOpen = false)} aria-label="閉じる"></button>
{/if}

<div class="shell">
  <aside class="sidebar" class:open={navOpen}>
    <div class="brand">
      <span class="mark">IH</span>
      <span>Invoice Harness</span>
    </div>
    <nav>
      <a class:active={path === "/"} href="/">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
        <span>{data?.finance === false ? "ホーム" : "収支一覧"}</span>
      </a>

      <div class="sec">帳票</div>
      <a class:active={active("/docs/estimate")} href="/docs/estimate">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6"/><path d="M18.5 12.5 21 15l-4 4-2.5-.5.5-2.5z"/><line x1="9" y1="8" x2="14" y2="8"/><line x1="9" y1="12" x2="12" y2="12"/></svg>
        <span>見積書</span>
      </a>
      <a class:active={active("/docs/delivery_note")} href="/docs/delivery_note">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8v8a1 1 0 0 1-.5.87l-7.5 4.3a2 2 0 0 1-2 0l-7.5-4.3A1 1 0 0 1 3 16V8"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="m7.5 4.7 9 5.2"/><line x1="12" y1="12" x2="12" y2="21.5"/></svg>
        <span>納品書</span>
      </a>
      <a class:active={active("/docs/invoice")} href="/docs/invoice">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="14" y2="17"/></svg>
        <span>請求書</span>
      </a>
      <a class:active={active("/docs/receipt")} href="/docs/receipt">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="8.5 14 10.5 16 15 11.5"/></svg>
        <span>領収書</span>
      </a>
      <a class:active={active("/docs/order")} href="/docs/order">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.3"/><circle cx="18" cy="20" r="1.3"/><path d="M2 3h2.2l2.2 12.2a1.5 1.5 0 0 0 1.5 1.2h9.4a1.5 1.5 0 0 0 1.5-1.2L21 7H5"/></svg>
        <span>発注書</span>
      </a>
      <a class:active={active("/docs/payment_notice")} href="/docs/payment_notice">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="m9 17 6-6"/><polyline points="10 11 15 11 15 16"/></svg>
        <span>支払通知書</span>
      </a>

      <div class="sec">管理</div>
      <a class:active={active("/projects")} href="/projects">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h5l2 2h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/></svg>
        <span>プロジェクト</span>
      </a>
      <a class:active={active("/clients")} href="/clients">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20"/><circle cx="10" cy="8" r="3.2"/><path d="M20 20v-1.5a3.5 3.5 0 0 0-2.6-3.4"/><path d="M15.5 5.1a3.2 3.2 0 0 1 0 5.8"/></svg>
        <span>取引先</span>
      </a>
      <a class:active={active("/items")} href="/items">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 3H5a2 2 0 0 0-2 2v6l9.3 9.3a2 2 0 0 0 2.8 0l5.6-5.6a2 2 0 0 0 0-2.8L11 3z"/><circle cx="7.5" cy="7.5" r="1.3"/></svg>
        <span>品目マスタ</span>
      </a>
      {#if isAdmin}
        <a class:active={active("/settings/divisions")} href="/settings/divisions">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          <span>計上区分（部門）</span>
        </a>
        <a class:active={active("/transactions")} href="/transactions">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3v18"/><polyline points="3 7 7 3 11 7"/><path d="M17 21V3"/><polyline points="13 17 17 21 21 17"/></svg>
          <span>入出金・消込</span>
        </a>
      {/if}
      <a class:active={active("/expenses")} href="/expenses">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.4"/><line x1="6" y1="10" x2="6" y2="14"/><line x1="18" y1="10" x2="18" y2="14"/></svg>
        <span>経費・給与</span>
      </a>
      <a class:active={active("/search")} href="/search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="10.5" r="6.5"/><line x1="21" y1="21" x2="15.2" y2="15.2"/></svg>
        <span>帳票検索</span>
      </a>
      {#if isAdmin}
        <a class:active={active("/members")} href="/members">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-4A3.5 3.5 0 0 0 3 18.5V20"/><circle cx="8.5" cy="8" r="3.2"/><line x1="18.5" y1="8" x2="18.5" y2="14"/><line x1="15.5" y1="11" x2="21.5" y2="11"/></svg>
          <span>メンバー</span>
        </a>
      {/if}

      {#if data?.finance}
      <div class="sec">レポート・会計</div>
      <a class:active={active("/monthly")} href="/monthly">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="16" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2.5" x2="8" y2="6.5"/><line x1="16" y1="2.5" x2="16" y2="6.5"/></svg>
        <span>月次入出金</span>
      </a>
      <a class:active={active("/reports/pl")} href="/reports/pl">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="21" x2="21" y2="21"/><line x1="3" y1="21" x2="3" y2="4"/><rect x="6" y="11" width="3" height="7"/><rect x="11" y="7" width="3" height="11"/><polyline points="6 8 11 4.5 16 6.5 21 3"/></svg>
        <span>損益計算書（PL）</span>
      </a>
      <a class:active={active("/reports/tax")} href="/reports/tax">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="7.5" cy="7.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/></svg>
        <span>消費税集計表</span>
      </a>
      <a class:active={active("/reports/aging")} href="/reports/aging">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>
        <span>売掛金年齢表</span>
      </a>
      <a href="/reports/export" data-sveltekit-reload>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        <span>CSVエクスポート</span>
      </a>
      <a class:active={active("/reports/journal")} href="/reports/journal">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        <span>仕訳エクスポート</span>
      </a>
      {/if}

      {#if isAdmin}
        <div class="sec">設定</div>
        <a class:active={settingsActive} href="/settings">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></svg>
          <span>設定一覧</span>
        </a>
      {/if}
    </nav>

    {#if data?.user}
      <div class="userbox">
        <div class="u">
          <div class="uname">{data.user.name || data.user.email}</div>
          <div class="urole"><a href="/account/password">パスワード変更</a> ・ {data.user.role}</div>
        </div>
        <form method="POST" action="/logout"><button class="logout" type="submit">ログアウト</button></form>
      </div>
    {/if}
  </aside>

  <main>
    {#if data?.user?.role === "demo"}
      <div class="demo-bar">DEMOモード — 自由にお試しいただけます（共有のサンプルデータです）。<form method="POST" action="/logout" style="display:inline"><button class="demo-out" type="submit">終了</button></form></div>
    {/if}
    <slot />
  </main>
</div>
{/if}

<style>
  .bare { min-height: 100vh; display: grid; place-items: center; background: var(--bg); padding: 24px; }
  .demo-bar { background: var(--amber-soft); border: 1px solid #f0dcae; color: #8a5a13; padding: 8px 14px; border-radius: var(--radius-sm); font-size: 13px; margin-bottom: 16px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .demo-out { background: #8a5a13; color: #fff; border: none; border-radius: 6px; padding: 4px 10px; font-size: 12px; cursor: pointer; }
  /* ダークネイビーのサイドバー（デザインの要）。中身のリンク・ユーザー枠も同系でまとめる */
  .userbox { margin-top: auto; padding: 12px 14px; border-top: 1px solid var(--sidebar-line); display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .userbox .uname { font-size: 13px; font-weight: 700; color: var(--sidebar-ink-strong); }
  .userbox .urole { font-size: 11px; color: var(--sidebar-ink); }
  .userbox .urole :global(a) { color: var(--sidebar-ink); }
  .userbox .logout { background: rgba(255, 255, 255, 0.1); color: var(--sidebar-ink-strong); border: none; border-radius: 8px; padding: 6px 10px; font-size: 12px; cursor: pointer; }
  .userbox .logout:hover { background: rgba(255, 255, 255, 0.18); }
  .shell { min-height: 100vh; }
  .sidebar {
    width: 240px;
    display: flex;
    flex-direction: column;
    background: var(--sidebar-bg);
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    height: 100dvh; /* モバイルのアドレスバー込みで切れないよう実ビューポート高に */
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 30px;
    z-index: 30;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.18) transparent;
  }
  .sidebar::-webkit-scrollbar { width: 6px; }
  .sidebar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.18); border-radius: 3px; }
  .sidebar::-webkit-scrollbar-track { background: transparent; }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 800;
    font-size: 15px;
    letter-spacing: -0.01em;
    color: var(--sidebar-ink-strong);
    padding: 18px 18px 16px;
    border-bottom: 1px solid var(--sidebar-line);
  }
  .brand .mark {
    display: inline-grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: var(--grad);
    color: #fff;
    font-size: 12px;
    font-weight: 800;
    box-shadow: 0 2px 8px rgba(46, 91, 255, 0.4);
  }
  nav { display: flex; flex-direction: column; padding: 10px 12px; }
  nav a {
    position: relative;
    display: flex;
    align-items: center;
    gap: 9px;
    color: var(--sidebar-ink);
    text-decoration: none;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 13.5px;
    font-weight: 500;
    margin: 1px 0;
    transition: background-color 0.12s ease, color 0.12s ease;
  }
  nav a svg { flex-shrink: 0; opacity: 0.75; transition: opacity 0.12s ease; }
  nav a:hover svg,
  nav a.active svg { opacity: 1; }
  nav a.sub { font-size: 13px; padding-left: 18px; }
  nav a:hover { background: rgba(255, 255, 255, 0.06); color: var(--sidebar-ink-strong); text-decoration: none; }
  nav a.active {
    background: var(--sidebar-active);
    color: var(--sidebar-ink-strong);
    font-weight: 700;
  }
  nav a.active::before {
    content: "";
    position: absolute;
    left: 0;
    top: 7px;
    bottom: 7px;
    width: 3px;
    border-radius: 3px;
    background: var(--grad);
  }
  .sec {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.38);
    font-weight: 700;
    padding: 16px 12px 5px;
    letter-spacing: 0.14em;
  }
  main { margin-left: 240px; padding: 26px 40px; min-width: 0; }

  /* モバイル用トップバー（デフォルト非表示） */
  .topbar { display: none; }
  .scrim { display: none; }
  .hamburger { background: none; border: none; cursor: pointer; padding: 8px; display: flex; flex-direction: column; gap: 5px; }
  .hamburger span { display: block; width: 22px; height: 2px; background: #fff; border-radius: 2px; }
  .tb-brand { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 15px; color: #fff; text-decoration: none; }
  .tb-brand .mark { display: inline-grid; place-items: center; width: 24px; height: 24px; border-radius: 7px; background: var(--grad); color: #fff; font-size: 11px; }

  @media (max-width: 820px) {
    .topbar {
      display: flex; align-items: center; gap: 12px;
      position: sticky; top: 0; z-index: 40;
      background: var(--sidebar-bg);
      padding: 10px 14px;
    }
    .scrim { display: block; position: fixed; inset: 0; z-index: 45; background: rgba(10, 15, 28, 0.5); border: none; }
    .shell { display: block; }
    .sidebar {
      position: fixed; top: 0; left: 0; z-index: 50;
      width: 264px; max-width: 84vw; height: 100vh; height: 100dvh;
      transform: translateX(-100%);
      transition: transform .22s ease;
      box-shadow: var(--shadow-pop);
    }
    .sidebar.open { transform: translateX(0); }
    main { margin-left: 0; padding: 16px; max-width: 100%; }
  }
</style>
