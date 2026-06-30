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
  .userbox { margin-top: auto; padding: 12px; border-top: 1px solid var(--line); display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .userbox .uname { font-size: 13px; font-weight: 700; }
  .userbox .urole { font-size: 11px; color: var(--muted); }
  .userbox .logout { background: var(--slate-soft); color: var(--ink-2); border: none; border-radius: 6px; padding: 6px 10px; font-size: 12px; cursor: pointer; }
  .shell { min-height: 100vh; }
  .sidebar {
    width: 236px;
    display: flex;
    flex-direction: column;
    background: var(--surface);
    border-right: 1px solid var(--line);
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    height: 100dvh; /* モバイルのアドレスバー込みで切れないよう実ビューポート高に */
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 30px;
    z-index: 30;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 9px;
    font-weight: 800;
    font-size: 15px;
    color: var(--ink);
    padding: 16px 18px;
    border-bottom: 1px solid var(--line);
  }
  .brand .mark {
    display: inline-grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border-radius: 7px;
    background: var(--primary);
    color: #fff;
    font-size: 12px;
    font-weight: 800;
  }
  nav { display: flex; flex-direction: column; padding: 8px 10px; }
  nav a {
    color: var(--ink-2);
    text-decoration: none;
    padding: 9px 12px;
    border-radius: var(--radius-sm);
    font-size: 14px;
    margin: 1px 0;
    border-left: 3px solid transparent;
  }
  nav a.sub { font-size: 13px; padding-left: 18px; color: var(--muted); }
  nav a:hover { background: var(--surface-2); color: var(--ink); text-decoration: none; }
  nav a.active {
    background: var(--primary-soft);
    color: var(--primary-d);
    font-weight: 700;
    border-left-color: var(--primary);
  }
  .sec {
    font-size: 11px;
    color: var(--muted);
    font-weight: 700;
    padding: 15px 12px 5px;
    letter-spacing: 0.03em;
  }
  main { margin-left: 236px; padding: 26px 34px; max-width: 1180px; min-width: 0; }

  /* モバイル用トップバー（デフォルト非表示） */
  .topbar { display: none; }
  .scrim { display: none; }
  .hamburger { background: none; border: none; cursor: pointer; padding: 8px; display: flex; flex-direction: column; gap: 5px; }
  .hamburger span { display: block; width: 22px; height: 2px; background: var(--ink); border-radius: 2px; }
  .tb-brand { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 15px; color: var(--ink); text-decoration: none; }
  .tb-brand .mark { display: inline-grid; place-items: center; width: 24px; height: 24px; border-radius: 6px; background: var(--primary); color: #fff; font-size: 11px; }

  @media (max-width: 820px) {
    .topbar {
      display: flex; align-items: center; gap: 12px;
      position: sticky; top: 0; z-index: 40;
      background: var(--surface); border-bottom: 1px solid var(--line);
      padding: 10px 14px;
    }
    .scrim { display: block; position: fixed; inset: 0; z-index: 45; background: rgba(0,0,0,.35); border: none; }
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
