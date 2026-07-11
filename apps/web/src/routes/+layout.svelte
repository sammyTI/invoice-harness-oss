<script>
  import "../app.css";
  import { page } from "$app/stores";
  export let data;

  const docNav = [
    { href: "/docs/estimate", label: "見積書" },
    { href: "/docs/delivery_note", label: "納品書" },
    { href: "/docs/invoice", label: "請求書" },
    { href: "/docs/receipt", label: "領収書" },
    { href: "/docs/order", label: "発注書" },
    { href: "/docs/payment_notice", label: "支払通知書" },
  ];
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
  $: isAdmin = data?.user?.role === "owner" || data?.user?.role === "demo";

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
      <a class:active={path === "/"} href="/">収支一覧</a>

      <div class="sec">帳票</div>
      {#each docNav as n}
        <a class:active={active(n.href)} href={n.href}>{n.label}</a>
      {/each}

      <div class="sec">管理</div>
      <a class:active={active("/projects")} href="/projects">プロジェクト</a>
      <a class:active={active("/clients")} href="/clients">取引先</a>
      <a class:active={active("/items")} href="/items">品目マスタ</a>
      {#if isAdmin}
        <a class:active={active("/settings/divisions")} href="/settings/divisions">計上区分（部門）</a>
        <a class:active={active("/transactions")} href="/transactions">入出金・消込</a>
      {/if}
      <a class:active={active("/search")} href="/search">帳票検索</a>
      {#if isAdmin}
        <a class:active={active("/members")} href="/members">メンバー</a>
      {/if}

      <div class="sec">レポート・会計</div>
      <a class:active={active("/monthly")} href="/monthly">月次入出金</a>
      <a class:active={active("/reports/tax")} href="/reports/tax">消費税集計表</a>
      <a class:active={active("/reports/aging")} href="/reports/aging">売掛金年齢表</a>
      <a href="/reports/export" data-sveltekit-reload>CSVエクスポート</a>
      <a href="/reports/yayoi" data-sveltekit-reload>弥生 仕訳CSV</a>

      {#if isAdmin}
        <div class="sec">設定</div>
        <a class:active={settingsActive} href="/settings">設定一覧</a>
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
    color: var(--sidebar-ink);
    text-decoration: none;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 13.5px;
    font-weight: 500;
    margin: 1px 0;
    transition: background-color 0.12s ease, color 0.12s ease;
  }
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
