# invoice-harness

**Cloudflare 無料枠で動くセルフホスト請求書・会計ツール。Misoca 代替＋AI 操作対応。**
見積・発注・納品・請求・領収・支払通知の 6 帳票の作成から、入金管理・部門別収支・損益計算書（PL）まで。データはすべて自分の Cloudflare アカウント内に置かれ、月額課金はありません。

デモ: https://invoice-harness.pages.dev/
ライセンス: MIT

> _A self-hostable invoicing & accounting tool that runs entirely on the Cloudflare free tier. A Misoca alternative with AI (natural-language) operation via MCP. MIT licensed._

<!-- TODO: screenshot — ダッシュボード（収支一覧） docs/screenshots/dashboard.png -->

---

## 特徴 (Features)

**帳票 (Documents)**
- 見積・発注・納品・請求・領収・支払通知の **6 帳票**を作成／複製／編集
- 取引フロー変換（見積 → 発注／納品／請求、請求 → 領収／支払通知）をワンクリック。元帳票と親子リンク
- **インボイス制度対応**: 適格請求書発行事業者 登録番号（T+13 桁）・税率別（10%／8%）の内訳と消費税・取引年月日（明細ごと）。取引先の登録番号有無から免税事業者の経過措置も把握
- **源泉徴収**（10.21%・税抜／税込基礎の切替）・**収入印紙**の自動判定・横向き領収書・アクセントカラー・社印／ロゴ
- 会社（発行元）ごとに独立採番。端数処理（切捨／切上／四捨五入）を消費税・金額それぞれ設定可

**階層管理と粗利 (Clients / Projects / Margin)**
- 取引先 → プロジェクト（案件）→ 帳票の階層管理。案件ごとに請求合計・支払合計・**粗利**を集計
- 取引先・品目マスタ（作成画面からインライン登録可）・顧客区分タグ

**収支ダッシュボード (Finance)**
- 会社 × 部門（計上区分）× 月の収支を一覧。**売上目標と達成率**を目標ラインで可視化
- **月次入出金**（計上ベース／入出金ベースの切替）

**会計・レポート (Accounting)**
- 経費・給与を月次記録 → **損益計算書（PL）** を会社別・会計年度別に生成
- 消費税集計表・売掛金年齢表
- 入金記録（部分入金・複数回入金・決済手数料の差引）と、銀行明細 CSV 取込による入金消込

**権限 (Roles & Access)**
- ロール: owner / member / viewer（税理士など）
- **会社別アクセス**（メンバーを会社ごとに割り当て）
- **給与閲覧権限**・**経営数値閲覧権限**をロールと独立に付与（実務ダッシュボードの数字を見せる相手を絞る）

**AI 操作 (AI-operable)**
- **MCP サーバ同梱**。Claude 等から自然言語で請求書発行・入金記録・集計を実行
- **REST API**（Bearer トークン・スコープ付き）と型付き **SDK**（`@invoice-harness/sdk`）

**メール・共有 (Mail & Share)**
- Resend 連携で帳票をメール送付（メール文面テンプレート・テスト送信）
- ログイン不要の公開共有リンク・ブラウザ印刷による PDF 出力

**エクスポート・監査 (Export & Audit)**
- CSV エクスポート（画面のフィルタと連動）・**弥生 仕訳 CSV**
- バックアップ／復元・操作履歴の監査ログ（ハッシュチェーンによる改ざん検知）

**セキュリティ (Security)**
- ログイン試行回数の制限・API トークンのスコープ（full / readonly）・セキュリティヘッダ

**その他 (Others)**
- 複数社・個人事業主（暦年決算）の両対応
- 税率マスタ（適用開始日つき）。将来の税率変更に日付ベースで対応し、発行日に応じて作成画面の税率が切り替わる

<!-- TODO: screenshot — 請求書の作成画面 docs/screenshots/invoice-editor.png -->

---

## 必要なもの (Requirements)

- **Cloudflare アカウント**（無料枠でOK）
- **Node.js 22+** と **pnpm**、**git**
- （任意）**Resend** アカウント — メール送付・未入金の催促メールを使う場合

作られるもの（Pages / D1 / R2 / Worker）はすべて自分の Cloudflare アカウント内・無料枠で動き、いつでも削除できます。

---

## セットアップ (Setup)

### コマンド一発（推奨）

```bash
npm create invoice-harness@latest
```

リポジトリの取得 → 依存インストール → 対話式セットアップまで自動で進みます。対話では次を順に行います。

1. **進め方の選択**: Cloudflare に公開（本番）／まずローカルで試す
2. **プロジェクト名の入力**: 公開 URL `<名前>.pages.dev` になります（既定はランダム名。短い名前は世界で衝突するため）
3. （任意）**Resend の APIキー・差出人**、**管理者アカウント**のメール／パスワード
4. **Cloudflare ログイン** → **D1（DB）・R2（画像）作成** → **本番マイグレーション適用**
5. **Pages（画面）と Worker（催促 Cron）のデプロイ**
6. 完了。表示された **`<名前>.pages.dev/login`** に、作成済みの管理者アカウントでログイン

> ログイン後、**設定 ▸ 自社情報** で会社名・登録番号・住所・振込先を登録すると帳票を作れます（AI からも登録可）。管理者を自動作成できなかった場合は **`/setup`** から作成し、続けてオンボーディングウィザードに従ってください。

セットアップの最後に、AI 連携（MCP）用のトークンが自動発行され、登録用コマンドが表示されます（後述）。

### 手動セットアップ（自動が詰まったとき）

```bash
git clone https://github.com/sammyTI/invoice-harness-oss.git
cd invoice-harness-oss
pnpm install

# 1) Cloudflare ログイン
pnpm --filter @invoice-harness/web exec wrangler login

# 2) D1 作成 → 出力された database_id を
#    apps/web/wrangler.toml と apps/worker/wrangler.toml に貼り付け
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

### メール送付・催促（任意）

Resend の無料枠を使います。未設定でもアプリは動作します（送付は「送付済み」記録のみ）。催促は `apps/worker` が Cron で毎日実行し、`apps/worker/wrangler.toml` の `APP_URL` を自分の公開 URL に設定します。

```bash
pnpm --filter @invoice-harness/web exec wrangler pages secret put RESEND_API_KEY
pnpm --filter @invoice-harness/worker exec wrangler secret put RESEND_API_KEY
```

---

## AI 連携（MCP） (AI Integration)

1. **設定 ▸ API / AI連携** で API トークンを発行（スコープ: full=全操作 / readonly=参照のみ）
2. MCP クライアント（Claude 等）に同梱の MCP サーバを登録。環境変数は 2 つ:
   - `IH_API_URL` … 自分の公開 URL（例 `https://your-name.pages.dev`）
   - `IH_API_TOKEN` … 発行したトークン

`.mcp.json` の設定例:

```json
{
  "mcpServers": {
    "invoice-harness": {
      "command": "node",
      "args": ["packages/mcp-server/dist/index.js"],
      "env": {
        "IH_API_URL": "https://your-name.pages.dev",
        "IH_API_TOKEN": "＜設定▸API/連携 で発行したトークン＞"
      }
    }
  }
}
```

Claude Code なら次の 1 行でも登録できます（セットアップ完了時に URL・トークン埋め込み済みで表示されます）。

```bash
claude mcp add invoice-harness --env IH_API_URL=https://your-name.pages.dev --env IH_API_TOKEN=... -- node packages/mcp-server/dist/index.js
```

登録後は自然言語で操作できます。例:

- 「先月の売上を集計して」
- 「◯◯商事に制作費 30 万円で請求書を発行して」
- 「INV-2026-0001 に入金を記録して」
- 「今期の会社別の利益は？」

帳票の一覧・検索・作成、発行・取消・訂正・フロー変換、入金記録、財務サマリー取得、取引先・品目・部門・売上目標・メンバーの管理などを MCP ツールとして提供します。

### コードから操作（SDK）

自分のシステムから自動操作したい場合は型付き SDK（ゼロ依存・ESM/CJS）を使います。

```bash
npm i @invoice-harness/sdk
```

```ts
import { InvoiceHarness } from "@invoice-harness/sdk";

const ih = new InvoiceHarness({
  baseUrl: "https://your-name.pages.dev",
  token: process.env.IH_API_TOKEN!,
});
const inv = await ih.documents.create({
  type: "invoice",
  client_name: "◯◯商事 御中",
  lines: [{ name: "制作費", unit_price: 300000, tax_rate: 10 }],
});
await ih.documents.issue(inv.id);
```

詳細は [`packages/sdk/README.md`](packages/sdk/README.md)。

---

## アップデート方法 (Updating)

既存インスタンスを最新版に更新するには、リポジトリを更新 → マイグレーション → 再デプロイします。

```bash
git pull
pnpm install
pnpm build
pnpm db:migrate:remote   # 追加スキーマを本番 D1 に適用
pnpm --filter @invoice-harness/web exec wrangler pages deploy .svelte-kit/cloudflare --project-name <あなたのプロジェクト名>
pnpm --filter @invoice-harness/worker exec wrangler deploy
```

マイグレーションは追記式で、適用済みのものはスキップされます。既存データは保持されます。

---

## 開発 (Development)

```bash
pnpm install
pnpm db:migrate:local          # ローカル D1 にスキーマ適用
pnpm db:seed:local             # 任意: サンプルデータ投入
pnpm dev                       # http://localhost:5179
pnpm test                      # 税計算・採番・会計年度ロジックのテスト（vitest）
```

モノレポ構成（pnpm）:

```
apps/web            SvelteKit ダッシュボード（Cloudflare Pages）
apps/worker         Workers（Cron で未入金の催促メール）
packages/shared     型・税計算・採番・会計年度ロジック（vitest）
packages/db         D1 スキーマ / マイグレーション / seed
packages/templates  6 帳票の印刷用 HTML テンプレート
packages/mcp-server AI 操作用 MCP サーバ
packages/sdk        型付き SDK（@invoice-harness/sdk）
```

- フロント / SSR: SvelteKit（Cloudflare Pages）
- DB: Cloudflare D1（SQLite）／ ファイル: Cloudflare R2（社印・ロゴ）
- バッチ: Cloudflare Workers（Cron）／ メール: Resend（任意）

---

## ライセンス (License)

MIT
