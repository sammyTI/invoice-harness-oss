<script>
  export let data;
  export let form;

  // 使用率(%)からバーの塗り色を決める。80%以上=amber・100%以上=red・通常=grad。
  function barColor(used, limit) {
    const pct = limit > 0 ? (used / limit) * 100 : 0;
    if (pct >= 100) return "var(--red)";
    if (pct >= 80) return "var(--amber)";
    return "var(--grad)";
  }
  // バー幅(%)。上限は100%でクランプ。
  function barWidth(used, limit) {
    const pct = limit > 0 ? (used / limit) * 100 : 0;
    return Math.min(100, Math.max(0, pct));
  }
</script>

<div class="page-head"><h1 class="page-title">連携設定</h1></div>

<section class="section">
  <div class="section-head"><h2>メール送付（Resend）</h2>
    {#if data.mail.configured}<span class="chip chip-paid">連携済み</span>{:else}<span class="chip chip-draft">未連携</span>{/if}
  </div>

  {#if form?.mailSaved}
    <div class="flash-ok">保存しました。メール送付が有効になりました。</div>
  {/if}
  {#if form?.mailCleared}
    <div class="flash-ok">メール連携を解除しました。</div>
  {/if}
  {#if form?.mailError}
    <div class="flash-err">{form.mailError}</div>
  {/if}
  {#if form?.mailTest === "ok"}
    <div class="flash-ok">テストメールを {form.to} に送信しました。受信箱を確認してください（届かない場合は迷惑メールも）</div>
  {/if}
  {#if form?.mailTestError}
    <div class="flash-err">送信失敗: {form.mailTestError}</div>
  {/if}

  {#if data.mail.configured}
    <p class="desc">
      連携済み（キー：<code>{data.mail.maskedKey}</code>・差出人：<code>{data.mail.from || "(既定)"}</code>・保存場所：<b>{data.mail.source === "db" ? "アプリ設定" : "環境変数"}</b>）
    </p>
    {#if data.mail.source === "env"}
      <p class="note-warn">APIキーは<b>環境変数</b>で設定されています。この画面から入力すると、アプリ設定の値が優先されます。</p>
    {:else}
      <form method="POST" action="?/clearMail" class="inline-form">
        <button class="del" type="submit">解除</button>
      </form>
    {/if}

    <div class="usage">
      <span class="lab">送信数（無料枠の目安）</span>
      <div class="usage-row">
        <span class="usage-label">今日 {data.usage.today} / 100通</span>
        <div class="usage-track">
          <div class="usage-fill" style="width:{barWidth(data.usage.today, 100)}%; background:{barColor(data.usage.today, 100)};"></div>
        </div>
      </div>
      <div class="usage-row">
        <span class="usage-label">今月 {data.usage.month} / 3,000通</span>
        <div class="usage-track">
          <div class="usage-fill" style="width:{barWidth(data.usage.month, 3000)}%; background:{barColor(data.usage.month, 3000)};"></div>
        </div>
      </div>
      <p class="usage-note">このアプリから送信した成功数の集計です。Resendアカウント全体の正確な使用量は resend.com のダッシュボードで確認してください。</p>
    </div>

    <div class="test-mail">
      <span class="lab">テスト送信</span>
      <form method="POST" action="?/testMail" class="test-form">
        <input class="input" type="email" name="to" value={data.myEmail} placeholder="test@example.com" autocomplete="off" />
        <button class="btn btn-quiet btn-sm" type="submit">テストメールを送る</button>
      </form>
    </div>
  {:else}
    <p class="desc">メール送付は<b>任意</b>です。未連携でも帳票の作成・PDF・招待リンク発行は使えます。請求書のメール自動送付・催促メールを使う場合のみ、無料の <a href="https://resend.com" target="_blank" rel="noopener">Resend</a>（3,000通/月）を連携してください。</p>
  {/if}

  <form method="POST" action="?/saveMail" class="mail-form">
    <div class="field">
      <span class="lab">Resend APIキー</span>
      <input class="input" type="password" name="resend_api_key" placeholder="re_..." autocomplete="off" />
      {#if data.mail.configured && data.mail.source === "db"}
        <span class="fieldhint">空のまま保存すると現在のキーを保持します。</span>
      {/if}
    </div>
    <div class="field">
      <span class="lab">差出人（任意）</span>
      <input class="input" name="mail_from" placeholder="Extrahands &lt;meishi@example.co.jp&gt;" value={data.mail.from ?? ""} />
    </div>
    <button class="btn btn-primary" type="submit">保存する</button>
  </form>

  <div class="howto">
    <h3>連携手順</h3>
    <ol>
      <li>Resend に登録し、API キーを取得（独自ドメインを認証すると任意の宛先に送れます）</li>
      <li>上のフォームに API キーと差出人を入力して保存（この画面での設定が環境変数より優先されます）</li>
      <li>環境変数で設定する場合は <code>apps/web/.dev.vars</code>（ローカル）または <code>wrangler pages secret put RESEND_API_KEY</code>（本番）も利用できます</li>
      <li>催促メールの自動送信を使う場合は <code>apps/worker</code> にも同じシークレットを設定</li>
    </ol>
    <p class="note-warn">未認証ドメインでは差出人 <code>onboarding@resend.dev</code> 固定・宛先は自分のResend登録メールのみになります。</p>
  </div>
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
          <thead><tr><th>名前</th><th>スコープ</th><th>作成日</th><th>最終利用</th><th></th></tr></thead>
          <tbody>
            {#each data.tokens as t}
              <tr>
                <td><b>{t.name ?? "—"}</b></td>
                <td>
                  {#if t.scope === "readonly"}
                    <span class="chip chip-draft">読み取り専用</span>
                  {:else}
                    <span class="chip chip-paid">フル</span>
                  {/if}
                </td>
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
    <div class="field">
      <span class="lab">スコープ（権限）</span>
      <label class="scope-opt">
        <input type="radio" name="scope" value="full" checked />
        <span><b>フルアクセス（AI操作用・全機能）</b><br><span class="scope-desc">帳票の作成・発行、メンバー/設定変更まで全操作。</span></span>
      </label>
      <label class="scope-opt">
        <input type="radio" name="scope" value="readonly" />
        <span><b>読み取り専用（参照・集計のみ）</b><br><span class="scope-desc">帳票・顧客などの参照のみ。メンバー/設定/監査は不可。</span></span>
      </label>
    </div>
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
  .inline-form { display: inline-block; margin: 4px 0 8px; }
  .mail-form { display: grid; gap: 12px; max-width: 480px; margin: 12px 0 4px; }
  .fieldhint { color: var(--ink-2); font-size: 12px; margin-top: 2px; }
  .usage { margin: 12px 0 4px; max-width: 480px; }
  .usage .lab { display: block; margin-bottom: 8px; }
  .usage-row { display: grid; gap: 4px; margin-bottom: 10px; }
  .usage-label { font-size: 13px; color: var(--ink-2); }
  .usage-track { height: 8px; background: var(--surface-2); border-radius: 999px; overflow: hidden; }
  .usage-fill { height: 100%; border-radius: 999px; min-width: 2px; transition: width 0.4s ease; }
  .usage-note { font-size: 12px; color: var(--ink-2); margin: 4px 0 0; }
  .test-mail { margin: 12px 0 4px; }
  .test-mail .lab { display: block; margin-bottom: 6px; }
  .test-form { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; max-width: 480px; }
  .test-form .input { flex: 1 1 220px; }
  .flash-err { background: var(--red-soft); color: var(--red); border: 1px solid #f0c4c4; padding: 8px 12px; border-radius: 8px; font-size: 13px; margin: 8px 0; }
  .howto { padding: 18px; margin-top: 16px; }
  .howto h3 { font-size: 14px; margin: 0 0 8px; }
  .howto p { font-size: 13px; color: var(--ink-2); }
  pre { background: var(--surface-2); border: 1px solid var(--line); border-radius: 8px; padding: 12px; font-size: 12px; overflow-x: auto; }
  code { background: var(--slate-soft); padding: 1px 6px; border-radius: 5px; font-size: 12px; }
  .scope-opt { display: flex; gap: 8px; align-items: flex-start; font-size: 13px; padding: 6px 0; cursor: pointer; }
  .scope-opt input { margin-top: 3px; }
  .scope-desc { color: var(--ink-2); font-size: 12px; }
</style>
