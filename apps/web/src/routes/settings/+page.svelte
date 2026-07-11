<script>
  // カテゴリ + 項目定義。
  // kw = 検索用の同義語・別名（項目名・説明に無い言い回しでもヒットさせる）。
  const categories = [
    {
      title: "会社・帳票",
      items: [
        {
          href: "/settings/issuer",
          label: "自社情報・振込先",
          desc: "発行元の会社名・発行者名・住所・事業形態、振込先口座を登録",
          kw: "発行元 発行者 会社名 屋号 住所 事業形態 個人事業主 法人 振込先 口座 銀行 インボイス 登録番号 適格請求書",
          icon: "building",
        },
        {
          href: "/settings/assets",
          label: "社印・ロゴ",
          desc: "帳票に表示する社印（角印）とロゴ画像をアップロード",
          kw: "社印 角印 印鑑 はんこ ハンコ 判子 ロゴ 画像 印影 スタンプ",
          icon: "stamp",
        },
        {
          href: "/settings/tax",
          label: "帳票・税",
          desc: "税率マスタ・源泉徴収・端数処理・取引日表示・プロジェクト必須化・決算月",
          kw: "税率 消費税 外税 内税 課税 源泉 源泉徴収 端数 切り捨て 切り上げ 四捨五入 丸め 取引日 日付形式 プロジェクト 案件 必須 会計年度 決算月",
          icon: "percent",
        },
        {
          href: "/settings/divisions",
          label: "計上区分（部門）",
          desc: "会社ごとの部門・事業部を登録し、売上を部門別に集計",
          kw: "部門 事業部 計上区分 セクション 課 チーム 集計単位 セグメント",
          icon: "layers",
        },
        {
          href: "/settings/targets",
          label: "売上目標",
          desc: "会社・部門ごとの年間売上目標を設定し、達成率を表示",
          kw: "売上 目標 予算 年間 達成率 ノルマ KPI ターゲット",
          icon: "target",
        },
      ],
    },
    {
      title: "文面テンプレート",
      items: [
        {
          href: "/settings/templates/document",
          label: "帳票テンプレート",
          desc: "帳票種別ごとのアクセント色と既定の備考文を設定",
          kw: "帳票 テンプレート 見積書 請求書 納品書 領収書 発注書 色 アクセント 既定 備考 デザイン レイアウト",
          icon: "file-text",
        },
        {
          href: "/settings/templates/email",
          label: "メールテンプレート",
          desc: "送付・催促・招待メールの件名と本文をテンプレ化",
          kw: "メール テンプレート 件名 本文 送付 催促 リマインド 招待 文面 定型文 差し込み",
          icon: "mail-open",
        },
        {
          href: "/settings/templates/notes",
          label: "備考テンプレート",
          desc: "よく使う備考文を登録し、帳票作成時に既定表示",
          kw: "備考 テンプレート 定型文 注意書き コメント メモ 既定文 フレーズ",
          icon: "sticky-note",
        },
      ],
    },
    {
      title: "連携・AI",
      items: [
        {
          href: "/settings/api",
          label: "メール連携（Resend）",
          desc: "Resend APIキーを連携してメール自動送付、テスト送信・送信数を確認",
          kw: "メール 連携 Resend リセンド APIキー 送信 テスト送信 送信数 無料枠 SMTP 配信 差出人 ドメイン認証",
          icon: "plug",
        },
        {
          href: "/settings/api",
          label: "APIトークン（AI操作・MCP）",
          desc: "トークンを発行してAI（Claude等）やMCP・外部ソフトから操作。スコープで権限指定",
          kw: "API トークン AI Claude クロード MCP 連携 自然言語 自動化 スコープ 権限 認証 キー アクセストークン 外部連携",
          icon: "key",
        },
      ],
    },
    {
      title: "データ・履歴",
      items: [
        {
          href: "/settings/backup",
          label: "バックアップ",
          desc: "全データをJSONでエクスポート／復元（インポート）",
          kw: "バックアップ エクスポート インポート 復元 JSON ダウンロード 書き出し 移行 保存 データ",
          icon: "download",
        },
        {
          href: "/settings/audit",
          label: "操作履歴（監査ログ）",
          desc: "操作の履歴と改ざん検知を記録（電子帳簿保存法対応）",
          kw: "監査 ログ 操作履歴 履歴 改ざん 検知 電帳法 電子帳簿保存法 証跡 記録 変更履歴",
          icon: "shield-check",
        },
        {
          href: "/settings/email-log",
          label: "メール送信ログ",
          desc: "メール送付の成否・宛先・日時のログを確認",
          kw: "メール 送信 ログ 履歴 送付 成否 失敗 エラー 宛先 配信結果 送信履歴",
          icon: "history",
        },
      ],
    },
    {
      title: "メンバー・権限",
      items: [
        {
          href: "/members",
          label: "メンバー・権限",
          desc: "利用メンバーの招待・権限（ロール）を管理",
          kw: "メンバー 権限 ロール 招待 ユーザー アカウント 管理者 閲覧 編集 チーム",
          icon: "users",
        },
      ],
    },
  ];

  let q = "";

  // 正規化（前後空白除去・小文字化）してマッチ。項目名 + 説明 + キーワードを対象。
  function matches(item, query) {
    if (!query) return true;
    const hay = (item.label + " " + item.desc + " " + item.kw).toLowerCase();
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .every((t) => hay.includes(t));
  }

  $: filtered = categories
    .map((c) => ({ ...c, items: c.items.filter((it) => matches(it, q.trim())) }))
    .filter((c) => c.items.length > 0);

  $: hitCount = filtered.reduce((n, c) => n + c.items.length, 0);
</script>

<div class="page-head"><h1 class="page-title">設定</h1></div>

<!-- 検索: 項目名・説明・キーワード同義語を横断してインクリメンタル絞り込み -->
<div class="search">
  <svg class="search-ic" width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
  <input
    class="search-in"
    type="search"
    bind:value={q}
    placeholder="設定を検索（例: 印鑑 / 税率 / メール / AI トークン）"
    aria-label="設定を検索"
  />
  {#if q}
    <button class="search-clear" type="button" on:click={() => (q = "")} aria-label="検索をクリア">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  {/if}
</div>

{#if hitCount === 0}
  <div class="empty">
    <p class="empty-title">見つかりません。</p>
    <p class="empty-sub">キーワードを変えてお試しください。</p>
  </div>
{:else}
  <div class="groups">
    {#each filtered as g (g.title)}
      <section class="group">
        <h2 class="gtitle">{g.title}</h2>
        <div class="cards">
          {#each g.items as it (it.label)}
            <a class="card scard" href={it.href}>
              <span class="ic" aria-hidden="true">
                {#if it.icon === "building"}
                  <svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="1"/><line x1="9" y1="7" x2="9" y2="7.01"/><line x1="15" y1="7" x2="15" y2="7.01"/><line x1="9" y1="11" x2="9" y2="11.01"/><line x1="15" y1="11" x2="15" y2="11.01"/><line x1="9" y1="15" x2="9" y2="15.01"/><line x1="15" y1="15" x2="15" y2="15.01"/><line x1="10" y1="21" x2="14" y2="21"/></svg>
                {:else if it.icon === "stamp"}
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M8 12c-1.5 1-2 2.5-2 4h12c0-1.5-.5-3-2-4"/><line x1="4" y1="21" x2="20" y2="21"/></svg>
                {:else if it.icon === "percent"}
                  <svg viewBox="0 0 24 24"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
                {:else if it.icon === "layers"}
                  <svg viewBox="0 0 24 24"><polygon points="12 2 22 8.5 12 15 2 8.5 12 2"/><polyline points="2 15.5 12 22 22 15.5"/></svg>
                {:else if it.icon === "target"}
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>
                {:else if it.icon === "file-text"}
                  <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>
                {:else if it.icon === "mail-open"}
                  <svg viewBox="0 0 24 24"><path d="M3 9l9-6 9 6v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="3 9 12 15 21 9"/></svg>
                {:else if it.icon === "sticky-note"}
                  <svg viewBox="0 0 24 24"><path d="M4 4h16v11l-5 5H4z"/><polyline points="20 15 15 15 15 20"/></svg>
                {:else if it.icon === "plug"}
                  <svg viewBox="0 0 24 24"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8H6v4a6 6 0 0 0 12 0z"/></svg>
                {:else if it.icon === "key"}
                  <svg viewBox="0 0 24 24"><circle cx="7.5" cy="15.5" r="4.5"/><line x1="10.5" y1="12.5" x2="21" y2="2"/><line x1="18" y1="5" x2="21" y2="8"/><line x1="15" y1="8" x2="18" y2="11"/></svg>
                {:else if it.icon === "download"}
                  <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                {:else if it.icon === "shield-check"}
                  <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                {:else if it.icon === "history"}
                  <svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><polyline points="3 3 3 8 8 8"/><polyline points="12 8 12 12 15 14"/></svg>
                {:else if it.icon === "users"}
                  <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                {/if}
              </span>
              <span class="txt">
                <span class="lbl">{it.label}</span>
                <span class="desc">{it.desc}</span>
              </span>
            </a>
          {/each}
        </div>
      </section>
    {/each}
  </div>
{/if}

<style>
  /* 検索ボックス: ページ上部・大きめ */
  .search {
    position: relative;
    display: flex;
    align-items: center;
    margin-bottom: 26px;
  }
  .search-ic {
    position: absolute;
    left: 16px;
    color: var(--muted);
    pointer-events: none;
  }
  .search-in {
    width: 100%;
    font-size: 16px;
    padding: 14px 44px 14px 46px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--ink);
    box-shadow: var(--shadow);
  }
  .search-in::placeholder { color: var(--muted); }
  .search-in:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(46, 91, 255, 0.14);
  }
  .search-clear {
    position: absolute;
    right: 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border: none;
    border-radius: 6px;
    background: var(--slate-soft);
    color: var(--ink-2);
    cursor: pointer;
  }
  .search-clear:hover { background: #e3e8f1; color: var(--ink); }

  .groups { display: flex; flex-direction: column; gap: 26px; }
  .gtitle { font-size: 14px; margin: 0 0 12px; color: var(--ink-2); }
  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(268px, 1fr));
    gap: 12px;
  }

  .scard {
    display: flex;
    align-items: flex-start;
    gap: 13px;
    padding: 16px;
    text-decoration: none;
    transition: border-color 0.12s, box-shadow 0.12s, transform 0.12s;
  }
  .scard:hover {
    border-color: var(--primary);
    box-shadow: var(--shadow-pop);
    transform: translateY(-2px);
  }

  /* 薄い線画アイコン */
  .ic {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: 9px;
    background: var(--primary-soft);
    color: var(--primary-d);
  }
  .ic :global(svg) {
    width: 20px;
    height: 20px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .txt { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .scard .lbl { font-weight: 700; color: var(--ink); }
  .scard .desc { font-size: 12px; color: var(--muted); line-height: 1.55; }

  /* ヒット0件 */
  .empty {
    text-align: center;
    padding: 48px 20px;
    color: var(--muted);
  }
  .empty-title { font-weight: 700; color: var(--ink-2); margin: 0 0 6px; }
  .empty-sub { font-size: 13px; margin: 0; }
</style>
