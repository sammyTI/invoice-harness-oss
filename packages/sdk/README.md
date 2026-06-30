# @invoice-harness/sdk

[invoice-harness](https://github.com/sammyTI/invoice-harness-oss) の REST API を型付きで叩く公式 SDK。
**ゼロ依存** / **ESM + CJS** / ブラウザ・Node・Cloudflare Workers で動作。

> 日々の操作は **AI（同梱の MCP サーバー）** か **ブラウザUI** で完結します。
> この SDK は「自分のコードから invoice-harness を自動操作したい開発者」向けです。

## インストール

```bash
npm i @invoice-harness/sdk
```

## 使い方

```ts
import { InvoiceHarness } from "@invoice-harness/sdk";

const ih = new InvoiceHarness({
  baseUrl: "https://your-instance.pages.dev",
  token: process.env.IH_API_TOKEN!, // 設定 ▸ API/AI連携 で発行
});

// 請求書を作成 → 発行 → 共有リンク発行 → メール送付
const inv = await ih.documents.create({
  type: "invoice",
  client_name: "○○商事 御中",
  issuer_name: "サンプル株式会社",
  subject: "6月分 制作費",
  lines: [{ name: "Webサイト制作", quantity: 1, unit_price: 300000, tax_rate: 10 }],
});
await ih.documents.issue(inv.id);
const { url } = await ih.documents.share(inv.id);
await ih.documents.send(inv.id);
```

## API

すべて `Promise` を返します。失敗時は `InvoiceHarnessError`（`.status` / `.body`）を throw。

| グループ | メソッド |
|---|---|
| `documents` | `list(type?)` `get(id)` `search(filters)` `create(input)` `issue(id)` `cancel(id)` `correct(id)` `convert(id, target)` `pay(id, payment?)` `send(id)` `remove(id)` `share(id)` `unshare(id)` |
| `issuers` | `list()` `create(input)` `update(id, input)` |
| `clients` | `list()` `create(input)` `update(id, input)` |
| `items` | `list()` `create(input)` `update(id, input)` `remove(id)` |
| `divisions` | `list()` `create(input)` `remove(id)` |
| `settings` | `get()` `update(input)` |
| `summary` | `summary({ fy?, issuer? })` |

### Node 18 未満 / 独自 fetch

```ts
import { InvoiceHarness } from "@invoice-harness/sdk";
import nodeFetch from "node-fetch";
const ih = new InvoiceHarness({ baseUrl, token, fetch: nodeFetch as any });
```

## ライセンス

MIT
