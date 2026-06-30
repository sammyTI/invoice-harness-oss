# invoice-harness

**見積・発注・請求・領収・支払通知・納品の6帳票を作って管理できる、Cloudflare 無料枠で完全セルフホストできる帳票ツール。**
インボイス制度対応・複数社運用・AI（自然言語）操作までこなす、Misoca / freee のオープンソース代替です。月額0円・データは自分の Cloudflare アカウント内。

> _A self-hostable invoicing suite (estimate / order / invoice / receipt / payment notice / delivery note) that runs entirely on the Cloudflare free tier. Japanese-invoice (インボイス) compliant, multi-company, AI-operable. MIT licensed._

---

## なぜ invoice-harness？

| | invoice-harness | Misoca / freee 等のSaaS |
|---|---|---|
| 料金 | **月額0円**（CF無料枠） | 月額課金 |
| データの所有 | **自分のCFアカウント内** | ベンダー預け |
| カスタマイズ | ソース改変自由（MIT） | 不可 |
| 複数社運用 | **1インスタンスに複数の発行元** | プラン依存 |
| AI操作 | **MCP / API で自然言語操作** | 限定的 |
| インボイス対応 | ✅ 登録番号・税率別・端数処理 | ✅ |
| 電子帳簿保存法 | ✅ 検索要件・改ざん検知・確定ロック | ✅ |

---

## クイックスタート

前提: **Node.js 22+ / pnpm / Cloudflare アカウント（無料枠でOK）**

```bash
git clone https://github.com/sammyTI/invoice-harness-oss.git
cd invoice-harness-oss
pnpm install

# 一発セットアップ（CFログイン → D1作成 → R2作成 → マイグレ → デプロイ）
pnpm setup
```

`pnpm setup` が完了すると公開URL（`https://invoice-harness.pages.dev` など）が表示されます。

1. その URL を開く
2. **`/setup`** でオーナー（管理者）アカウントを作成
3. **設定 ▸ 自社情報** で会社名・登録番号・住所・振込先を登録 → 帳票作成開始

> 自動セットアップが詰まったら、下の「手動セットアップ」で1ステップずつ進められます。

---

## 主な機能

**帳票**
- 6帳票（見積 / 発注 / 納品 / 請求 / 領収 / 支払通知）の作成・複製・編集
- 取引フロー変換（見積 → 発注 / 納品 / 請求 → 領収 / 支払通知 をワンクリック・親子リンク）
- インボイス制度対応（適格請求書 登録番号・税率別合計・税率ごとの消費税・端数処理・源泉徴収10.21%）
- 横向き領収書・収入印紙の自動判定・アクセントカラー・社印/ロゴ・備考テンプレート
- 会社（発行元）ごとに独立採番

**取引先・品目・部門**
- 取引先 / 品目マスタ（作成画面からインライン登録も可）
- 計上区分（部門・事業部）＝**会社ごとの部門別損益**をダッシュボードで可視化

**入金・会計**
- 入金記録（部分入金・複数回入金・入金方法・伝票番号）
- 入金消込（銀行明細CSV取込→自動マッチ）
- FY対応PLダッシュボード（決算月設定・会社切替）
- レポート: 消費税集計表 / 売掛金年齢表 / 会計CSV / 弥生 仕訳CSV

**発行・訂正（電帳法）**
- 発行（確定ロック）＝SHA-256ハッシュチェーン監査ログ＋改ざん検知
- 取消（無効化・原本保持）＋訂正版の作成・再発行

**メール**
- Resend で帳票送付＋公開共有リンク／Workers Cron で未入金の催促メール自動化

**複数社・権限**
- 1インスタンスに複数の発行元（会社）。**会社別の閲覧権限**（メンバーを会社ごとに登録・税理士は複数社）
- オーナーは全社、メンバーは割り当てた会社のみ

**AI（自然言語）操作**
- MCP サーバ＋REST API（Bearer）で Claude 等から「○○社に請求書を作って」「今期の利益は？」を実行

---

## アーキテクチャ

すべて Cloudflare 無料枠で完結（pnpm モノレポ）。

```
apps/web            SvelteKit ダッシュボード（Cloudflare Pages）
apps/worker         Workers（毎日Cronで未入金催促メール）
packages/shared     型・税計算・採番・会計年度ロジック（vitest）
packages/db         D1 スキーマ / マイグレーション / seed
packages/templates  6帳票の印刷用HTMLテンプレ
packages/mcp-server AI操作用 MCP サーバ
```

- フロント/SSR: SvelteKit（CF Pages）
- バッチ: Cloudflare Workers（Cron）
- DB: Cloudflare D1（SQLite）
- ファイル: Cloudflare R2（社印・ロゴ）
- メール: Resend（任意）

---

## 手動セットアップ（`pnpm setup` を使わない場合）

```bash
pnpm install

# 1) Cloudflare ログイン
pnpm --filter @invoice-harness/web exec wrangler login

# 2) D1 作成 → 出力された database_id を
#    apps/web/wrangler.toml と apps/worker/wrangler.toml の database_id に貼り付け
pnpm --filter @invoice-harness/web exec wrangler d1 create invoice_harness

# 3) R2 バケット作成（社印・ロゴ保存用）
pnpm --filter @invoice-harness/web exec wrangler r2 bucket create invoice-harness-assets

# 4) ビルド → 本番マイグレーション
pnpm build
pnpm db:migrate:remote

# 5) デプロイ
pnpm --filter @invoice-harness/web exec wrangler pages deploy .svelte-kit/cloudflare --project-name invoice-harness
pnpm --filter @invoice-harness/worker exec wrangler deploy
```

## ローカル開発

```bash
pnpm install
pnpm db:migrate:local          # ローカルD1にスキーマ適用
pnpm db:seed:local             # 任意: 架空のサンプルデータ投入
pnpm --filter @invoice-harness/web exec vite dev --port 5179 --host
```

## メール送付・催促（任意）

Resend の無料枠（3,000通/月）を使います。未設定でもアプリは動作します（送付は「送付済み」記録のみ）。

```bash
# 送付用（apps/web）
pnpm --filter @invoice-harness/web exec wrangler pages secret put RESEND_API_KEY
# 催促バッチ用（apps/worker）
pnpm --filter @invoice-harness/worker exec wrangler secret put RESEND_API_KEY
```
催促は `apps/worker` が毎日0:00(UTC)に実行。`apps/worker/wrangler.toml` の `APP_URL` を自分の公開URLに設定してください。

## AI（自然言語）操作

1. **設定 ▸ API / AI連携(MCP)** でトークンを発行
2. `packages/mcp-server` を Claude 等のMCPクライアントに登録（環境変数 `IH_API_URL`＝自分のpages.dev / `IH_API_TOKEN`＝発行したトークン）

帳票の一覧/検索/作成、発行・取消・訂正・変換、入金記録、財務サマリー取得などを自然言語で操作できます。

## 既知の制限

- 取引先・品目マスタは全社共通（会社制限メンバーも名称は見えます。**財務文書は会社ごとに隔離**）
- ログイン試行回数制限はアプリ側に未実装（Cloudflare 側の Rate Limiting ルール推奨）
- API（Bearerトークン）は組織レベル（会社スコープ対象外＝連携用）
- PDFはブラウザ印刷（サーバー側PDF生成は未対応）

## ライセンス

MIT
