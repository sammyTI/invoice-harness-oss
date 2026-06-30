import {
  DOCUMENT_TITLES,
  formatDate,
  formatYen,
  isValidRegistrationNumber,
  stampDuty,
  type Client,
  type DocumentLine,
  type DocumentRecord,
  type Issuer,
  type Settings,
  type Totals,
} from "@invoice-harness/shared";

export interface RenderInput {
  doc: DocumentRecord;
  issuer: Issuer;
  client: Client;
  lines: DocumentLine[];
  totals: Totals;
  settings: Settings;
}

function esc(s: string | null | undefined): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function nl2br(s: string | null | undefined): string {
  return esc(s).replace(/\n/g, "<br>");
}

/** アクセント色の上に乗せる文字色を明度から自動判定（明るい色→黒、暗い色→白）。 */
function readableInk(hex: string): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec((hex || "").trim());
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#1a1a1a" : "#ffffff";
}

// 一般的（標準的）な日本のビジネス帳票デザイン。モノクロ基調＋細罫線。
const STYLES = `
  *{box-sizing:border-box;}
  body{font-family:'Noto Sans JP','Hiragino Kaku Gothic ProN','Yu Gothic',sans-serif;color:#222;background:#e9eaec;margin:0;line-height:1.6;font-size:12px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .page{width:210mm;min-height:297mm;margin:20px auto;padding:12mm 16mm 16mm;background:#fff;box-shadow:0 2px 14px rgba(0,0,0,.1);position:relative;}
  .page.landscape{width:297mm;min-height:auto;padding:12mm 18mm 14mm;}
  @media print{
    body{background:#fff;}
    .page{box-shadow:none;margin:0;}
    .no-print{display:none!important;}
    /* 複数ページにまたがる場合：明細ヘッダを各ページ先頭に繰り返し、行・合計の途中改ページを防ぐ */
    table.items{page-break-inside:auto;}
    table.items thead{display:table-header-group;}
    table.items tr{page-break-inside:avoid;break-inside:avoid;}
    .amount-box,.bottom,.notes,table.sum,.issuer{page-break-inside:avoid;break-inside:avoid;}
  }
  .toolbar{position:sticky;top:0;z-index:50;background:#222;color:#fff;padding:9px 16px;display:flex;justify-content:space-between;align-items:center;font-size:12px;}
  .toolbar button{background:#444;color:#fff;border:1px solid #666;padding:6px 16px;border-radius:5px;cursor:pointer;}
  .title{text-align:center;font-size:28px;font-weight:700;letter-spacing:.4em;margin:0 0 22px;padding-left:.4em;}
  .title-underline{border-bottom:2.5px solid var(--accent);width:220px;margin:-16px auto 24px;}
  .top{display:flex;justify-content:space-between;gap:18px;margin-bottom:18px;align-items:flex-start;}
  /* 左列：請求先＋（下記の通り〜/件名/御請求金額）。請求先の下の余白を活用する。 */
  .client-col{flex:1 1 auto;min-width:0;}
  .client .cname{font-size:18px;font-weight:700;border-bottom:1.5px solid #222;padding-bottom:5px;display:inline-block;max-width:100%;}
  .client .caddr{font-size:11px;color:#555;margin-top:6px;line-height:1.7;overflow-wrap:break-word;}
  /* 右列（番号・発行元）は固定幅。長い建物名（例：サンシャインシティワールドインポートマートビル5階）が1行に収まる幅＋やや小さめの文字。 */
  .meta-col{flex:0 0 70mm;max-width:70mm;}
  .docmeta{font-size:11px;color:#555;text-align:right;line-height:1.9;}
  .docmeta b{color:#222;}
  .issuer{position:relative;margin-top:10px;font-size:10.5px;color:#444;text-align:right;line-height:1.7;overflow-wrap:break-word;}
  .issuer .iname{font-size:14px;font-weight:700;color:#222;}
  .issuer .iaddr{margin-top:2px;}
  .issuer .icontact{margin-top:1px;}
  .issuer .reg{font-weight:600;}
  .issuer .warn{color:#c0392b;}
  /* 社印は住所・会社情報に重ねて押印（被せる）。 */
  .seal-img{position:absolute;right:2mm;bottom:0;margin:0;pointer-events:none;}
  .seal-img img{width:21mm;height:21mm;object-fit:contain;mix-blend-mode:multiply;}
  .amount-box{border:2px solid var(--accent);margin:14px 0 0;display:flex;}
  .amount-box .lab{background:var(--accent);color:var(--accent-ink);padding:12px 18px;font-size:13px;font-weight:700;display:flex;align-items:center;white-space:nowrap;}
  .amount-box .val{flex:1;padding:12px 18px;font-size:22px;font-weight:700;text-align:right;}
  .subject{font-size:12px;margin:10px 0 0;}
  .subject b{font-weight:700;}
  .intro{font-size:12px;margin:12px 0 0;color:#333;}
  /* 領収書（横向き） */
  .rc-grid{display:grid;grid-template-columns:1.5fr 1fr;gap:34px;align-items:start;margin-top:14px;}
  .rc-amount{border:2.5px solid var(--accent);border-radius:6px;text-align:center;padding:20px 16px;margin:6px 0 18px;}
  .rc-amount .v{font-size:38px;font-weight:800;letter-spacing:.04em;}
  .rc-but{font-size:13px;margin:14px 0;border-bottom:1px solid #ccc;padding-bottom:10px;}
  .rc-ack{font-size:13px;margin:14px 0 18px;}
  .rc-side{display:flex;flex-direction:column;align-items:flex-end;gap:16px;}
  /* 収入印紙（5万円以上で必要なときのみ）。グレーの押印枠は廃止し、控えめな枠で表示。 */
  .rc-stamp-note{width:74px;border:1px dashed #b08;color:#a06;font-size:10px;text-align:center;padding:7px 6px;line-height:1.45;margin-bottom:12px;}
  table.items{width:100%;border-collapse:collapse;font-size:11.5px;}
  table.items th{background:#f0f0f0;border:1px solid #bbb;border-bottom:2px solid var(--accent);padding:7px 8px;font-weight:700;}
  table.items td{border:1px solid #ccc;padding:7px 8px;vertical-align:top;}
  table.items tbody tr:nth-child(even) td{background:#f5f7fa;}
  table.items td.r{text-align:right;white-space:nowrap;}
  table.items td.c{text-align:center;white-space:nowrap;}
  table.items .desc{font-size:10px;color:#777;margin-top:2px;}
  .bottom{display:flex;justify-content:space-between;gap:24px;margin-top:14px;}
  .left{flex:1;font-size:11px;}
  .bank{border:1px solid #ccc;border-radius:4px;padding:9px 12px;margin-bottom:10px;}
  .bank b{display:block;margin-bottom:2px;}
  .notes{white-space:pre-wrap;color:#444;line-height:1.7;}
  table.sum{border-collapse:collapse;font-size:12px;min-width:280px;}
  table.sum td{border:1px solid #ccc;padding:7px 12px;}
  table.sum td.lab{background:#f6f6f6;font-weight:700;color:#444;}
  table.sum td.r{text-align:right;white-space:nowrap;}
  table.sum tr.grand td{background:var(--accent);color:var(--accent-ink);font-weight:700;font-size:14px;}
  table.sum tr.wh td{color:#c0392b;}
  .logo-img{margin-bottom:6px;}
  .logo-img img{max-width:160px;max-height:46px;object-fit:contain;}
`;

// PDF保存名（ブラウザの「PDFに保存」が <title> をファイル名に使う）。
// 形式: 【請求書】会社名御中_発行年月日_管理番号
function pdfTitle(typeTitle: string, clientName: string, honorific: string, issueDate: string, number: string): string {
  const date = (issueDate || "").replace(/-/g, "");
  return `【${typeTitle}】${clientName}${honorific || ""}_${date}_${number}`;
}

function shell(title: string, number: string, accent: string, inner: string, landscape = false, fileTitle?: string): string {
  const pageRule = landscape ? `<style>@media print{@page{size:A4 landscape;margin:0;}}</style>` : "";
  return `<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(fileTitle ?? `${title} ｜ ${number}`)}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
<style>${STYLES}</style>
<style>:root{--accent:${esc(accent)};--accent-ink:${readableInk(accent)};}</style>${pageRule}</head>
<body>
<div class="toolbar no-print"><span>${esc(title)} ／ ${esc(number)}</span><button onclick="window.print()">PDFに変換</button></div>
${inner}
<script>
  (function () {
    var page = document.querySelector('.page'); if (!page) return;
    var embedded = window.self !== window.top;
    function fit() {
      if (embedded) {
        // 詳細画面のプレビュー(iframe)：枠幅にA4を全幅フィット
        var bar = document.querySelector('.toolbar'); if (bar) bar.style.display = 'none';
        document.documentElement.style.background = '#fff'; document.body.style.background = '#fff';
        document.body.style.margin = '0'; page.style.margin = '0'; page.style.transform = 'none';
        var scale = document.documentElement.clientWidth / (page.offsetWidth || 794);
        page.style.transformOrigin = 'top left'; page.style.transform = 'scale(' + scale + ')';
        document.body.style.height = (page.offsetHeight * scale) + 'px';
        return;
      }
      // 直接表示(共有リンク/印刷画面)：スマホ等の狭い画面だけ zoom で全体を縮小（印刷は解除）
      page.style.zoom = '';
      var avail = document.documentElement.clientWidth;
      var pw = page.offsetWidth || 794;
      if (avail < pw) page.style.zoom = avail / pw;
    }
    window.addEventListener('beforeprint', function () { if (!embedded) page.style.zoom = ''; });
    window.addEventListener('afterprint', fit);
    window.addEventListener('load', fit); window.addEventListener('resize', fit); fit();
  })();
</script>
</body></html>`;
}

function renderReceipt(input: RenderInput): string {
  const { doc, issuer, client, totals, settings } = input;
  const fmt = (d: string | null | undefined) => formatDate(d, settings.date_format);
  const taxLines = totals.tax_by_rate
    .map((t) => `${t.rate}%対象 ${formatYen(t.net)}（税 ${formatYen(t.tax)}）`)
    .join("　");
  const stamp = stampDuty(totals.subtotal);
  // 社印は発行元の住所・会社情報に重ねて押印（グレーの押印枠は廃止）。
  const sealOverlay = issuer.seal_key
    ? `<div class="seal-img"><img src="${esc(issuer.seal_key)}" alt="社印"></div>`
    : "";
  // 収入印紙は課税額（5万円以上）で必要なときのみ、控えめに表示。
  const stampNote =
    stamp > 0
      ? `<div class="rc-stamp-note">収入印紙<br>¥${stamp.toLocaleString("ja-JP")}<br><span style="font-size:8px">紙発行時に貼付</span></div>`
      : "";
  const inner = `<div class="page landscape">
  <h1 class="title">領収書</h1>
  <div class="title-underline"></div>
  <div class="top">
    <div class="client"><div class="cname">${esc(client.name)} ${esc(client.honorific)}</div></div>
    <div class="docmeta">
      <div>No. <b>${esc(doc.number)}</b></div>
      <div>発行日：<b>${fmt(doc.issue_date)}</b></div>
    </div>
  </div>

  <div class="rc-grid">
    <div class="rc-left">
      ${stampNote}
      <div class="rc-amount">
        <div style="font-size:12px;color:#555;margin-bottom:4px">領収金額（税込）</div>
        <div class="v">${formatYen(totals.total)} −</div>
      </div>
      <div class="rc-but">但し　${esc(doc.subject || "お品代")}　として</div>
      <div class="rc-ack">上記正に領収いたしました。</div>
      <div style="font-size:11px;color:#444;margin-top:8px">
        内訳：小計 ${formatYen(totals.subtotal)}／消費税 ${formatYen(totals.tax_total)}<br>${taxLines}
      </div>
    </div>
    <div class="rc-side">
      <div class="issuer" style="text-align:right;border:0;padding:0;background:none">
        ${issuer.logo_key ? `<div class="logo-img"><img src="${esc(issuer.logo_key)}" alt="ロゴ"></div>` : ""}
        <div class="iname">${esc(issuer.name)}</div>
        ${(doc.issuer_person || issuer.person_name) ? `<div>担当：${esc((doc.issuer_person || issuer.person_name) as string)}</div>` : ""}
        ${issuer.registration_number ? `<div class="reg">登録番号：${esc(issuer.registration_number)}</div>` : ""}
        ${issuer.address ? `<div class="iaddr">〒${esc(issuer.postal_code)} ${nl2br(issuer.address)}</div>` : ""}
        <div class="icontact">${issuer.tel ? `TEL ${esc(issuer.tel)}　` : ""}${issuer.email ? esc(issuer.email) : ""}</div>
        ${sealOverlay}
      </div>
    </div>
  </div>
</div>`;
  return shell(
    "領収書",
    doc.number,
    settings.accent_color || "#1b59b0",
    inner,
    true,
    pdfTitle("領収書", client.name, client.honorific, doc.issue_date, doc.number)
  );
}

export function renderDocument(input: RenderInput): string {
  if (input.doc.type === "receipt") return renderReceipt(input);
  const { doc, issuer, client, lines, totals, settings } = input;
  const title = DOCUMENT_TITLES[doc.type];
  const inclusive = settings.tax_display === "inclusive";
  const amountHeader = inclusive ? "金額（税込）" : "金額（税抜）";
  const showReg = doc.type === "invoice" || doc.type === "receipt";
  // 振込先は「お金を受け取る側」が出す請求書のみ。支払通知書は支払う側が出すため自社口座は載せない。
  const showBank = doc.type === "invoice";
  const AMOUNT_LABEL: Record<string, string> = {
    estimate: "御見積金額",
    delivery_note: "納品金額",
    order: "御発注金額",
    invoice: "御請求金額",
    receipt: "領収金額",
    payment_notice: "お支払金額",
  };
  const INTRO: Record<string, string> = {
    estimate: "下記の通りお見積り申し上げます。",
    delivery_note: "下記の通り納品いたします。",
    order: "下記の通り発注いたします。",
    invoice: "下記の通りご請求申し上げます。",
    receipt: "",
    payment_notice: "下記の通りお支払いいたします。",
  };
  const amountLabel = AMOUNT_LABEL[doc.type] ?? "合計金額";
  const intro = INTRO[doc.type] ?? "";
  const fmt = (d: string | null | undefined) => formatDate(d, settings.date_format);

  const rows = lines
    .map(
      (l) => `
      <tr>
        <td>${esc(l.name)}${l.description ? `<div class="desc">${nl2br(l.description)}</div>` : ""}</td>
        <td class="c">${l.quantity}</td>
        <td class="c">${esc(l.unit)}</td>
        <td class="r">${formatYen(l.unit_price)}</td>
        <td class="c">${l.tax_rate}%</td>
        <td class="r">${formatYen(l.amount)}</td>
      </tr>`
    )
    .join("");

  // 明細が少ない場合の空行（体裁）
  const fillerCount = Math.max(0, 5 - lines.length);
  const fillers = Array.from({ length: fillerCount })
    .map(
      () =>
        `<tr><td>&nbsp;</td><td class="c"></td><td class="c"></td><td class="r"></td><td class="c"></td><td class="r"></td></tr>`
    )
    .join("");

  const taxRows = totals.tax_by_rate
    .map(
      (t) =>
        `<tr><td class="lab">${t.rate}% 対象 (税抜)</td><td class="r">${formatYen(t.net)}</td></tr>
         <tr><td class="lab">　消費税 ${t.rate}%</td><td class="r">${formatYen(t.tax)}</td></tr>`
    )
    .join("");

  const whRows =
    settings.withholding === "standard"
      ? `<tr class="wh"><td class="lab">源泉徴収 (10.21%)</td><td class="r">▲ ${formatYen(totals.withholding)}</td></tr>`
      : "";

  // 帳票種別ごとの金額の呼び方（源泉徴収ありの差引ラベルに使う）
  const TYPE_AMOUNT_WORD: Record<string, string> = {
    estimate: "見積",
    delivery_note: "納品",
    order: "発注",
    invoice: "請求",
    receipt: "領収",
    payment_notice: "支払",
  };
  const withheld = settings.withholding === "standard";
  const typeWord = TYPE_AMOUNT_WORD[doc.type] ?? "合計";
  const grandLabel = withheld ? `差引${typeWord}額（源泉徴収後）` : "合計（税込）";
  const grandValue = withheld ? totals.payable : totals.total;
  const grandSuffix = withheld ? "（源泉徴収後）" : "（税込）";

  const regLine = showReg
    ? `<div class="reg">登録番号：${esc(issuer.registration_number) || "（未登録）"}${
        issuer.registration_number && !isValidRegistrationNumber(issuer.registration_number)
          ? ` <span class="warn">※形式不正(T+13桁)</span>`
          : ""
      }</div>`
    : "";

  const txnRow =
    doc.type === "invoice" && settings.invoice_show_transaction_date
      ? `<div>取引日：<b>${fmt(doc.issue_date)}</b></div>`
      : "";

  const dueRow = doc.due_date ? `<div>お支払期限：<b>${fmt(doc.due_date)}</b></div>` : "";

  return `<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(pdfTitle(title, client.name, client.honorific, doc.issue_date, doc.number))}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
<style>${STYLES}</style>
<style>:root{--accent:${esc(settings.accent_color || "#1b59b0")};--accent-ink:${readableInk(settings.accent_color || "#1b59b0")};}</style></head>
<body>
<div class="toolbar no-print">
  <span>${esc(title)} ／ ${esc(doc.number)}</span>
  <button onclick="window.print()">PDFに変換</button>
</div>
<div class="page">
  <h1 class="title">${esc(title)}</h1>
  <div class="title-underline"></div>

  <div class="top">
    <div class="client-col">
      <div class="client">
        <div class="cname">${esc(client.name)} ${esc(client.honorific)}</div>
        <div class="caddr">
          ${client.contact ? `${esc(client.contact)}<br>` : ""}
          ${client.address ? `〒${esc(client.postal_code)}　${esc(client.address)}` : ""}
        </div>
      </div>
      ${intro ? `<p class="intro">${esc(intro)}</p>` : ""}
      ${doc.subject ? `<div class="subject"><b>件名：</b>${esc(doc.subject)}</div>` : ""}
      <div class="amount-box">
        <div class="lab">${amountLabel}</div>
        <div class="val">${formatYen(grandValue)}<span style="font-size:11px;font-weight:400;color:#666;">${grandSuffix}</span></div>
      </div>
    </div>
    <div class="meta-col">
      <div class="docmeta">
        <div>${esc(title)}番号：<b>${esc(doc.number)}</b></div>
        <div>発行日：<b>${fmt(doc.issue_date)}</b></div>
        ${txnRow}
        ${dueRow}
      </div>
      <div class="issuer">
        ${issuer.logo_key ? `<div class="logo-img"><img src="${esc(issuer.logo_key)}" alt="ロゴ"></div>` : ""}
        <div class="iname">${esc(issuer.name)}</div>
        ${(doc.issuer_person || issuer.person_name) ? `<div>担当：${esc((doc.issuer_person || issuer.person_name) as string)}</div>` : ""}
        ${regLine}
        ${issuer.address ? `<div class="iaddr">〒${esc(issuer.postal_code)} ${nl2br(issuer.address)}</div>` : ""}
        <div class="icontact">${issuer.tel ? `TEL ${esc(issuer.tel)}　` : ""}${issuer.email ? `${esc(issuer.email)}` : ""}</div>
        ${issuer.seal_key ? `<div class="seal-img"><img src="${esc(issuer.seal_key)}" alt="社印"></div>` : ""}
      </div>
    </div>
  </div>

  <table class="items">
    <thead>
      <tr>
        <th style="width:42%">品目</th>
        <th style="width:9%">数量</th>
        <th style="width:9%">単位</th>
        <th style="width:16%">単価</th>
        <th style="width:8%">税率</th>
        <th style="width:16%">${amountHeader}</th>
      </tr>
    </thead>
    <tbody>${rows}${fillers}</tbody>
  </table>

  <div class="bottom">
    <div class="left">
      ${showBank && issuer.bank_info ? `<div class="bank"><b>お振込先</b>${nl2br(issuer.bank_info)}</div>` : ""}
      ${doc.notes ? `<div class="notes">${nl2br(doc.notes)}</div>` : ""}
    </div>
    <table class="sum">
      <tr><td class="lab">小計（税抜）</td><td class="r">${formatYen(totals.subtotal)}</td></tr>
      ${taxRows}
      <tr><td class="lab">消費税合計</td><td class="r">${formatYen(totals.tax_total)}</td></tr>
      ${whRows}
      <tr class="grand"><td class="lab" style="color:var(--accent-ink)">${grandLabel}</td><td class="r">${formatYen(grandValue)}</td></tr>
    </table>
  </div>
</div>
<script>
  (function () {
    var page = document.querySelector('.page'); if (!page) return;
    var embedded = window.self !== window.top;
    function fit() {
      if (embedded) {
        // 詳細画面のプレビュー(iframe)：枠幅にA4を全幅フィット
        var bar = document.querySelector('.toolbar'); if (bar) bar.style.display = 'none';
        document.documentElement.style.background = '#fff';
        document.body.style.background = '#fff';
        document.body.style.margin = '0';
        page.style.margin = '0';
        page.style.transform = 'none';
        var scale = document.documentElement.clientWidth / (page.offsetWidth || 794);
        page.style.transformOrigin = 'top left';
        page.style.transform = 'scale(' + scale + ')';
        document.body.style.height = (page.offsetHeight * scale) + 'px';
        return;
      }
      // 直接表示(共有リンク/印刷画面)：スマホ等の狭い画面だけ zoom で全体を縮小（印刷は解除）
      page.style.zoom = '';
      var avail = document.documentElement.clientWidth;
      var pw = page.offsetWidth || 794;
      if (avail < pw) page.style.zoom = avail / pw;
    }
    window.addEventListener('beforeprint', function () { if (!embedded) page.style.zoom = ''; });
    window.addEventListener('afterprint', fit);
    window.addEventListener('load', fit);
    window.addEventListener('resize', fit);
    fit();
  })();
</script>
</body></html>`;
}
