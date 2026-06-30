<script>
  export let data;
  export let form;
</script>

<div class="page-head"><h1 class="page-title">連携設定</h1></div>

<section class="section">
  <div class="section-head"><h2>メール送付（Resend）</h2>
    {#if data.mailEnabled}<span class="chip chip-paid">連携済み</span>{:else}<span class="chip chip-draft">未連携</span>{/if}
  </div>
  {#if data.mailEnabled}
    <p class="desc">メール送付が有効です。差出人：<code>{data.mailFrom || "(既定)"}</code></p>
  {:else}
    <p class="desc">メール送付は<b>任意</b>です。未連携でも帳票の作成・PDF・招待リンク発行は使えます。請求書のメール自動送付・催促メールを使う場合のみ、無料の <a href="https://resend.com" target="_blank" rel="noopener">Resend</a>（3,000通/月）を連携してください。</p>
    <div class="howto">
      <h3>連携手順</h3>
      <ol>
        <li>Resend に登録し、API キーを取得（独自ドメインを認証すると任意の宛先に送れます）</li>
        <li><b>ローカル開発</b>：<code>apps/web/.dev.vars</code> に記入
          <pre>RESEND_API_KEY="re_xxxxx"
MAIL_FROM="会社名 &lt;billing@yourdomain.com&gt;"</pre>
        </li>
        <li><b>本番(Cloudflare Pages)</b>：<code>wrangler pages secret put RESEND_API_KEY</code> と <code>MAIL_FROM</code> を設定</li>
        <li>催促メールの自動送信を使う場合は <code>apps/worker</code> にも同じシークレットを設定</li>
      </ol>
      <p class="note-warn">未認証ドメインでは差出人 <code>onboarding@resend.dev</code> 固定・宛先は自分のResend登録メールのみになります。</p>
    </div>
  {/if}
</section>

<h2 class="sub">API / AI連携（MCP）</h2>
<p class="hint">APIトークンを発行すると、MCPサーバ経由でAI（Claude等）から自然言語で操作したり、外部ソフトから連携できます。トークンは発行時のみ表示されます。</p>

{#if form?.created}
  <div class="flash-ok">
    新しいトークンを発行しました。今だけ表示されます。安全な場所に保存してください：<br>
    <code class="token">{form.created}</code>
  </div>
{/if}

<div class="layout">
  <div class="main">
    {#if data.tokens.length === 0}
      <div class="empty">トークンはまだありません。</div>
    {:else}
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>名前</th><th>作成日</th><th>最終利用</th><th></th></tr></thead>
          <tbody>
            {#each data.tokens as t}
              <tr>
                <td><b>{t.name ?? "—"}</b></td>
                <td class="num">{t.created_at.slice(0, 10)}</td>
                <td class="num">{t.last_used_at ? t.last_used_at.slice(0, 16).replace("T", " ") : "未使用"}</td>
                <td class="r"><form method="POST" action="?/delete"><input type="hidden" name="id" value={t.id} /><button class="del" type="submit">失効</button></form></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}

    <div class="card howto">
      <h3>MCPの使い方</h3>
      <p>Claude Code 等の MCP 設定に、同梱の <code>@invoice-harness/mcp-server</code> を登録します：</p>
      <pre>{`{
  "mcpServers": {
    "invoice-harness": {
      "command": "node",
      "args": ["packages/mcp-server/dist/index.js"],
      "env": {
        "IH_API_URL": "https://your-app.pages.dev",
        "IH_API_TOKEN": "発行したトークン"
      }
    }
  }
}`}</pre>
      <p>これで「6月分の請求書を作って」「未入金を一覧して」等をAIから指示できます。</p>
    </div>
  </div>

  <form class="section" method="POST" action="?/create">
    <div class="section-head"><h2>トークンを発行</h2></div>
    <div class="field"><span class="lab">名前（用途）</span><input class="input" name="name" placeholder="Claude Code 等" /></div>
    <button class="btn btn-primary" type="submit" style="width:100%">発行する</button>
  </form>
</div>

<style>
  .hint { color: var(--ink-2); font-size: 13px; margin-top: -8px; }
  .desc { color: var(--ink-2); font-size: 13px; }
  .sub { font-size: 16px; margin: 24px 0 4px; }
  .howto ol { font-size: 13px; color: var(--ink-2); line-height: 1.9; padding-left: 18px; }
  .note-warn { background: var(--amber-soft); border: 1px solid #f0dcae; color: #8a5a13; padding: 8px 12px; border-radius: 8px; font-size: 12px; }
  .token { display: inline-block; margin-top: 6px; background: #fff; border: 1px solid var(--line); padding: 6px 10px; border-radius: 6px; word-break: break-all; }
  .layout { display: grid; grid-template-columns: minmax(0,1fr) 300px; gap: 20px; align-items: start; }
  @media (max-width: 860px) { .layout { grid-template-columns: 1fr; } }
  .del { background: var(--red-soft); color: var(--red); border: none; border-radius: 6px; padding: 5px 10px; cursor: pointer; font-size: 13px; }
  .howto { padding: 18px; margin-top: 16px; }
  .howto h3 { font-size: 14px; margin: 0 0 8px; }
  .howto p { font-size: 13px; color: var(--ink-2); }
  pre { background: var(--surface-2); border: 1px solid var(--line); border-radius: 8px; padding: 12px; font-size: 12px; overflow-x: auto; }
  code { background: var(--slate-soft); padding: 1px 6px; border-radius: 5px; font-size: 12px; }
</style>
