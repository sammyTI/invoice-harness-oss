<script>
  import { DOCUMENT_FLOW, DOCUMENT_LABELS, formatDate, formatYen, lifecycle } from "@invoice-harness/shared";
  export let data;
  export let form;

  $: ({ doc, issuer, client, lines, totals, settings, payments, paid_total, balance } = data.full);
  $: fmt = (d) => formatDate(d, settings.date_format);
  const today = new Date().toISOString().slice(0, 10);
  $: canPay = doc.type === "invoice" && balance > 0;
  $: locked = !!doc.locked;
  $: canceled = doc.status === "canceled";
  $: flow = DOCUMENT_FLOW[doc.type] ?? [];
  $: related = data.related;
  $: st = lifecycle(doc);
  $: editHref = `/doc/${doc.id}/edit`;
  $: shareUrl = data.shareUrl;

  let copied = false;
  async function copyShare() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      copied = true;
      setTimeout(() => (copied = false), 1800);
    } catch {
      copied = false;
    }
  }
</script>

<div class="bar">
  <div class="bar-l">
    <a class="back" href={`/docs/${doc.type}`} aria-label="一覧へ戻る">←</a>
    <h1 class="page-title">{DOCUMENT_LABELS[doc.type]}</h1>
    <span class="chip {st.cls}">{st.label}</span>
    <span class="docno num">{doc.number}</span>
    {#if data.divisionName}<span class="chip chip-div">{data.divisionName}</span>{/if}
  </div>
  <div class="bar-r">
    {#if !locked}
      <a class="btn btn-ghost btn-sm" href={editHref}>修正編集</a>
    {/if}
    <form method="POST" action="?/duplicate">
      <button class="btn btn-ghost btn-sm" type="submit">複製</button>
    </form>
    {#each flow as t}
      <form method="POST" action="?/convert" on:submit={(e) => { if (!confirm(`この${DOCUMENT_LABELS[doc.type]}（${doc.number}）はそのまま残ります。内容をコピーして新しい${DOCUMENT_LABELS[t]}を作成します。よろしいですか？`)) e.preventDefault(); }}>
        <input type="hidden" name="target" value={t} />
        <button class="btn btn-ghost btn-sm" type="submit">{DOCUMENT_LABELS[t]}を作成</button>
      </form>
    {/each}
    {#if data.mailEnabled && !canceled}
      <form method="POST" action="?/send">
        <button class="btn btn-ghost btn-sm" type="submit">メール送付</button>
      </form>
    {:else if !canceled}
      <span class="mailoff" title="メール送付には Resend 連携が必要です。設定 ▸ API/連携 から有効化できます。">
        <button class="btn btn-ghost btn-sm" type="button" disabled>メール送付</button>
        <a class="setup-link" href="/settings/api">設定</a>
      </span>
    {/if}
    {#if locked}
      <form method="POST" action="?/correct" on:submit={(e) => { if (!confirm(`発行済みは直接修正できません。内容をコピーした「訂正版」の下書きを新しく作成します（元帳票（${doc.number}）は記録として残ります）。よろしいですか？`)) e.preventDefault(); }}>
        <button class="btn btn-primary btn-sm" type="submit" title="内容をコピーした訂正版の下書きを作成します">訂正版を作成</button>
      </form>
    {/if}
    {#if locked && !canceled}
      <form method="POST" action="?/cancel" on:submit={(e) => { if (!confirm(`この${DOCUMENT_LABELS[doc.type]}（${doc.number}）を取消（無効化）します。原本は記録として残りますが、入金・送付の対象外になります。よろしいですか？`)) e.preventDefault(); }}>
        <button class="btn btn-danger btn-sm" type="submit">取消</button>
      </form>
    {/if}
    {#if !locked}
      <form method="POST" action="?/lock" on:submit={(e) => { if (!confirm("発行（確定）すると正式な書類として確定し、以後は訂正できません。よろしいですか？")) e.preventDefault(); }}>
        <button class="btn btn-primary btn-sm" type="submit" title="発行すると正式な書類として確定します">発行（確定）</button>
      </form>
      <form method="POST" action="?/remove" on:submit={(e) => { if (!confirm("この下書きを削除します。よろしいですか？")) e.preventDefault(); }}>
        <button class="btn btn-danger btn-sm" type="submit">削除</button>
      </form>
    {/if}
    <a class="btn btn-ghost btn-sm" href={`/doc/${doc.id}/print`} target="_blank" rel="noopener">プレビュー / PDF</a>
  </div>
</div>

{#if canceled}
  <p class="banner canceled">この帳票は<strong>取消済み</strong>です。原本は記録として保持されますが、無効です。修正するには「<strong>訂正版を作成</strong>」から再発行してください。{#if related.parent}（訂正版はこちら：<a href={`/doc/${related.parent.id}`}>元帳票</a>）{/if}</p>
{:else if !locked}
  <p class="banner draft">この帳票は<strong>下書き（未発行）</strong>です。まだ正式な書類ではありません。内容を確定したら「<strong>発行（確定）</strong>」を押してください。</p>
{:else}
  <p class="banner issued">この帳票は<strong>発行済み</strong>（確定・訂正不可・改ざん検知の対象）です。{#if doc.status !== "sent" && doc.status !== "paid"}取引先へ送付できます。{/if} 修正が必要な場合は「<strong>訂正版を作成</strong>」または「<strong>取消</strong>」を使ってください。<span class="num hashnote">hash {doc.content_hash?.slice(0, 12)}…</span></p>
{/if}
{#if form?.locked === "ok"}<p class="flash-ok">発行（確定）しました。正式な書類として記録されました。</p>{/if}
{#if form?.canceled === "ok"}<p class="flash-ok">取消しました。原本は記録として保持されます。</p>{/if}
{#if form?.sent === "ok"}<p class="flash-ok">メールを送付しました。</p>{/if}
{#if form?.sent === "marked"}<p class="flash-ok">送付済みにしました（{form.reason}）。メール設定後は自動送信されます。</p>{/if}
{#if form?.paid === "ok"}<p class="flash-ok">入金を記録しました。</p>{/if}
{#if form?.error}<p class="flash-err">{form.error}</p>{/if}
{#if form?.shared === "ok"}<p class="flash-ok">共有リンクを発行しました。取引先に渡すとログインなしで閲覧できます。</p>{/if}
{#if form?.shared === "off"}<p class="flash-ok">共有を解除しました。以前のリンクは無効になりました。</p>{/if}

<section class="share">
  <div class="share-head">
    <svg class="share-ico" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
    <div>
      <h2>共有リンク</h2>
      <p class="share-note">取引先にこのリンクを渡すと、ログインなしで帳票PDFを開けます（推測されにくいトークン・印刷もこの画面から）。</p>
    </div>
  </div>
  {#if shareUrl}
    <div class="share-row">
      <input class="input share-input" type="text" readonly value={shareUrl} on:focus={(e) => e.currentTarget.select()} />
      <button class="btn btn-primary btn-sm" type="button" on:click={copyShare}>{copied ? "コピーしました" : "コピー"}</button>
      <a class="btn btn-ghost btn-sm" href={shareUrl} target="_blank" rel="noopener">開く</a>
      <form method="POST" action="?/unshare" on:submit={(e) => { if (!confirm("共有を解除すると、このリンクは開けなくなります。よろしいですか？")) e.preventDefault(); }}>
        <button class="btn btn-danger btn-sm" type="submit">共有を解除</button>
      </form>
    </div>
  {:else}
    <form method="POST" action="?/share">
      <button class="btn btn-primary btn-sm" type="submit">共有リンクを発行</button>
    </form>
  {/if}
</section>

<div class="grid">
  <div class="col-info">
    {#if doc.type === "invoice"}
      <section class="section paybox">
        <div class="section-head"><h2>入金</h2><span class="bal">残額 {formatYen(balance)}</span></div>
        {#if payments.length}
          <ul class="paylist">
            {#each payments as p}
              <li>
                <span class="num">{p.paid_date ?? "—"}</span>
                <span class="num amt">{formatYen(p.amount)}</span>
                <span class="muted">{p.method ?? ""}{p.reference ? ` / ${p.reference}` : ""}</span>
                <form method="POST" action="?/delpay"><input type="hidden" name="payment_id" value={p.id} /><button class="x" type="submit" aria-label="取消">×</button></form>
              </li>
            {/each}
            <li class="ptotal"><span>入金合計</span><span class="num">{formatYen(paid_total)}</span></li>
          </ul>
        {/if}
        {#if balance > 0}
          <form method="POST" action="?/pay" class="payform">
            <label>入金日<input class="input" type="date" name="paid_date" value={today} /></label>
            <label>入金額<input class="input" type="number" name="amount" value={balance} /></label>
            <label>方法
              <select class="input" name="method">
                <option value="銀行振込">銀行振込</option>
                <option value="現金">現金</option>
                <option value="クレジットカード">クレジットカード</option>
                <option value="口座振替">口座振替</option>
                <option value="相殺">相殺</option>
                <option value="その他">その他</option>
              </select>
            </label>
            <label>入金伝票番号 / 摘要<input class="input" name="reference" placeholder="振込番号・摘要（合算入金は同じ番号で各請求に）" /></label>
            <button class="btn btn-primary" type="submit">入金を記録</button>
          </form>
        {:else}
          <p class="fullpaid">全額入金済み</p>
        {/if}
      </section>
    {/if}

    <section class="section">
      <div class="section-head"><h2>{DOCUMENT_LABELS[doc.type]}情報</h2>{#if !locked}<a class="edit" href={editHref}>編集</a>{/if}</div>
      <dl class="dl">
        <dt>件名</dt><dd>{doc.subject || "—"}</dd>
        <dt>{DOCUMENT_LABELS[doc.type]}番号</dt><dd class="num">{doc.number}</dd>
        <dt>発行日</dt><dd class="num">{fmt(doc.issue_date)}</dd>
        <dt>支払期限</dt><dd class="num">{doc.due_date ? fmt(doc.due_date) : "—"}</dd>
      </dl>
    </section>

    <section class="section">
      <div class="section-head"><h2>取引先情報</h2>{#if !locked}<a class="edit" href={editHref}>編集</a>{/if}</div>
      <dl class="dl">
        <dt>宛名</dt><dd>{client.name} {client.honorific}</dd>
        <dt>担当</dt><dd>{client.contact || "—"}</dd>
        <dt>住所</dt><dd>{client.postal_code ? `〒${client.postal_code} ` : ""}{client.address || "—"}</dd>
      </dl>
    </section>

    <section class="section">
      <div class="section-head"><h2>自社情報</h2><a class="edit" href="/settings/issuer">編集</a></div>
      <dl class="dl">
        <dt>自社名</dt><dd>{issuer.name}</dd>
        <dt>登録番号</dt><dd class="num">{issuer.registration_number || "未設定"}</dd>
        <dt>住所</dt><dd>{issuer.postal_code ? `〒${issuer.postal_code} ` : ""}{issuer.address || "—"}</dd>
        <dt>振込先</dt><dd>{issuer.bank_info || "—"}</dd>
      </dl>
    </section>

    <section class="section">
      <div class="section-head"><h2>明細</h2>{#if !locked}<a class="edit" href={editHref}>編集</a>{/if}</div>
      <div class="lines-scroll">
        <table class="lines">
          <thead><tr><th>品目</th><th class="r">数量</th><th class="r">単価</th><th class="r">税率</th><th class="r">金額</th></tr></thead>
          <tbody>
            {#each lines as l}
              <tr>
                <td>{l.name}</td>
                <td class="r num">{l.quantity} {l.unit}</td>
                <td class="r num">{formatYen(l.unit_price)}</td>
                <td class="r num">{l.tax_rate}%</td>
                <td class="r num">{formatYen(l.amount)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <div class="sumbox">
        <div class="row"><span>小計（税抜）</span><span class="num">{formatYen(totals.subtotal)}</span></div>
        <div class="row"><span>消費税</span><span class="num">{formatYen(totals.tax_total)}</span></div>
        {#each totals.tax_by_rate as t}
          <div class="row sub"><span>{t.rate}% 対象 {formatYen(t.net)}</span><span class="num">消費税 {formatYen(t.tax)}</span></div>
        {/each}
        {#if settings.withholding === "standard"}
          <div class="row wh"><span>源泉徴収 (10.21%)</span><span class="num">▲ {formatYen(totals.withholding)}</span></div>
        {/if}
        <div class="row grand"><span>{settings.withholding === "standard" ? "差引請求額（税込）" : "合計（税込）"}</span><span class="num">{formatYen(settings.withholding === "standard" ? totals.payable : totals.total)}</span></div>
      </div>
    </section>

    {#if doc.notes}
      <section class="section">
        <div class="section-head"><h2>備考</h2>{#if !locked}<a class="edit" href={editHref}>編集</a>{/if}</div>
        <p class="notes">{doc.notes}</p>
      </section>
    {/if}

    {#if related.parent || related.children.length}
      <section class="section">
        <div class="section-head"><h2>関連帳票</h2></div>
        <ul class="rel">
          {#if related.parent}
            <li><span class="rk">変換元</span> <a href={`/doc/${related.parent.id}`}>{DOCUMENT_LABELS[related.parent.type]} {related.parent.number}</a></li>
          {/if}
          {#each related.children as ch}
            <li><span class="rk">派生</span> <a href={`/doc/${ch.id}`}>{DOCUMENT_LABELS[ch.type]} {ch.number}</a></li>
          {/each}
        </ul>
      </section>
    {/if}
  </div>

  <div class="col-preview">
    <div class="preview card">
      <div class="preview-head">プレビュー</div>
      <div class="preview-body">
        <iframe title="帳票プレビュー" src={`/doc/${doc.id}/print`}></iframe>
      </div>
    </div>
  </div>
</div>

<style>
  .bar {
    display: flex; align-items: center; justify-content: space-between;
    gap: 14px; flex-wrap: wrap; margin-bottom: 18px;
  }
  .bar-l { display: flex; align-items: center; gap: 12px; min-width: 0; flex-wrap: wrap; }
  .bar-r { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .bar-r form { margin: 0; }
  .back {
    display: inline-grid; place-items: center; width: 32px; height: 32px;
    border: 1px solid var(--line); border-radius: var(--radius-sm);
    color: var(--ink-2); background: var(--surface);
  }
  .back:hover { background: var(--surface-2); text-decoration: none; }
  .docno { color: var(--muted); font-size: 13px; }
  .banner { padding: 11px 14px; border-radius: var(--radius-sm); font-size: 13px; margin: 0 0 16px; line-height: 1.6; }
  .banner.draft { background: var(--amber-soft); border: 1px solid #f0dcae; color: #8a5a13; }
  .banner.issued { background: var(--green-soft); border: 1px solid #bfe6cf; color: #136c41; }
  .banner.canceled { background: var(--red-soft); border: 1px solid #f0c2c2; color: #9c2a2a; }
  .banner .hashnote { color: var(--muted); font-size: 11px; }
  .chip-div { background: var(--slate-soft); color: var(--ink-2); font-weight: 700; }

  .share { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); box-shadow: var(--shadow); padding: 14px 16px; margin: 0 0 16px; }
  .share-head { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 12px; }
  .share-ico { color: var(--primary); flex: none; margin-top: 2px; }
  .share-head h2 { font-size: 14px; margin: 0; }
  .share-note { font-size: 12px; color: var(--muted); margin: 3px 0 0; line-height: 1.6; }
  .share-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .share-input { flex: 1 1 280px; min-width: 0; font-size: 13px; }
  .share-row form { margin-left: auto; }

  .grid { display: grid; grid-template-columns: minmax(0, 1fr) 440px; gap: 20px; align-items: start; }
  @media (max-width: 1080px) { .grid { grid-template-columns: 1fr; } }

  .edit:hover { text-decoration: underline; }

  .lines-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .lines { width: 100%; border-collapse: collapse; min-width: 420px; }
  .lines th { font-size: 12px; color: var(--muted); text-align: left; padding: 6px 6px; border-bottom: 1px solid var(--line); font-weight: 700; }
  .lines td { padding: 9px 6px; border-bottom: 1px solid var(--line-2); font-size: 14px; }
  .lines .r { text-align: right; }

  .sumbox { margin-top: 14px; margin-left: auto; max-width: 340px; }
  .sumbox .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed var(--line); font-size: 14px; }
  .sumbox .row.sub { color: var(--muted); font-size: 12px; border: none; padding: 1px 0; }
  .sumbox .row.wh { color: var(--red); }
  .sumbox .row.grand { border: none; font-size: 18px; font-weight: 800; color: var(--primary-d); margin-top: 6px; }

  .notes { white-space: pre-wrap; margin: 0; color: var(--ink-2); font-size: 14px; line-height: 1.7; }

  .mailoff { display: inline-flex; align-items: center; gap: 4px; }
  .mailoff button[disabled] { opacity: 0.5; cursor: not-allowed; }
  .mailoff .setup-link { font-size: 12px; color: var(--primary); }
  .flash-lock { background: var(--slate-soft); color: var(--ink-2); padding: 10px 14px; border-radius: var(--radius-sm); font-size: 13px; }
  .rel { list-style: none; margin: 0; padding: 0; }
  .rel li { padding: 6px 0; border-bottom: 1px dashed var(--line); font-size: 14px; }
  .rel .rk { display: inline-block; font-size: 11px; font-weight: 700; color: var(--muted); background: var(--slate-soft); border-radius: 6px; padding: 2px 7px; margin-right: 8px; }
  .paybox { background: var(--primary-soft); border-color: #cfe0fb; }
  .paybox .bal { font-weight: 800; color: var(--primary-d); }
  .payform { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
  .payform label { display: flex; flex-direction: column; gap: 5px; font-size: 12px; font-weight: 700; color: var(--ink-2); }
  .payform .input { width: 160px; }
  .paylist { list-style: none; margin: 0 0 12px; padding: 0; }
  .paylist li { display: flex; align-items: center; gap: 12px; padding: 5px 0; border-bottom: 1px dashed var(--line); font-size: 13px; }
  .paylist .amt { font-weight: 700; margin-left: auto; }
  .paylist .ptotal { font-weight: 800; border: none; }
  .paylist .ptotal span:last-child { margin-left: auto; }
  .paylist .x { background: var(--red-soft); color: var(--red); border: none; border-radius: 6px; padding: 2px 8px; cursor: pointer; }
  .fullpaid { color: var(--green); font-weight: 700; margin: 0; }

  .col-preview { position: sticky; top: 22px; min-width: 0; }
  .preview { overflow: hidden; }
  .preview-head { padding: 11px 16px; border-bottom: 1px solid var(--line); font-size: 13px; font-weight: 700; color: var(--ink-2); }
  .preview-body { height: 760px; background: #e9eaec; max-width: 100%; overflow: hidden; }
  .preview-body iframe { display: block; width: 100%; height: 100%; border: 0; }
  @media (max-width: 1080px) {
    .col-preview { position: static; }
    .preview-body { height: 560px; }
  }
  @media (max-width: 560px) {
    .sumbox { max-width: 100%; }
    .bar-l .page-title { font-size: 18px; }
  }
</style>
