<script>
  const groups = [
    {
      title: "テンプレート",
      items: [
        { href: "/settings/templates/document", label: "帳票テンプレート", desc: "アクセント色・種別ごとの既定備考" },
        { href: "/settings/templates/notes", label: "備考テンプレート", desc: "よく使う備考文・既定の自動表示" },
        { href: "/settings/templates/email", label: "メールテンプレート", desc: "送付・催促メールの件名と本文" },
        { href: "/settings/assets", label: "社印・ロゴ", desc: "帳票に表示する社印とロゴ画像" },
      ],
    },
    {
      title: "会社・税",
      items: [
        { href: "/settings/issuer", label: "自社情報・振込先", desc: "発行元・発行者名・住所・振込先" },
        { href: "/settings/tax", label: "課税・表示項目設定", desc: "外税内税・源泉徴収・端数・日付形式" },
        { href: "/settings/divisions", label: "計上区分（部門）", desc: "会社ごとの部門・事業部" },
      ],
    },
    {
      title: "履歴・データ",
      items: [
        { href: "/settings/audit", label: "監査ログ", desc: "操作履歴・改ざん検知（電帳法）" },
        { href: "/settings/email-log", label: "送信履歴", desc: "メール送付の成否ログ" },
        { href: "/settings/backup", label: "バックアップ", desc: "全データのJSON入出力" },
      ],
    },
    {
      title: "連携",
      items: [
        { href: "/settings/api", label: "API / AI連携(MCP)", desc: "APIトークン発行・Claude等からの操作" },
      ],
    },
  ];
</script>

<div class="page-head"><h1 class="page-title">設定</h1></div>

<div class="groups">
  {#each groups as g}
    <section class="group">
      <h2 class="gtitle">{g.title}</h2>
      <div class="cards">
        {#each g.items as it}
          <a class="card scard" href={it.href}>
            <span class="lbl">{it.label}</span>
            <span class="desc">{it.desc}</span>
          </a>
        {/each}
      </div>
    </section>
  {/each}
</div>

<style>
  .groups { display: flex; flex-direction: column; gap: 22px; }
  .gtitle { font-size: 14px; margin: 0 0 10px; color: var(--ink-2); }
  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
  .scard { display: flex; flex-direction: column; gap: 4px; padding: 16px; text-decoration: none; transition: border-color 0.12s, box-shadow 0.12s; }
  .scard:hover { border-color: var(--primary); box-shadow: var(--shadow); }
  .scard .lbl { font-weight: 700; color: var(--ink); }
  .scard .desc { font-size: 12px; color: var(--muted); line-height: 1.5; }
</style>
