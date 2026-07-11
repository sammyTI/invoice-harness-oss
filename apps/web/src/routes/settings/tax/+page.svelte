<script>
  import { onMount } from "svelte";
  export let data;
  export let form;
  $: s = data.settings;
  const today = new Date().toISOString().slice(0, 10);

  let taxDlg;
  onMount(() => {
    // 税率追加のバリデーションエラー時はモーダルを開いたままにする
    if (form?.taxError) taxDlg?.showModal();
  });
</script>

<div class="page-head"><h1 class="page-title">課税・表示項目設定</h1></div>
{#if form?.ok}<p class="flash-ok">設定を保存しました。</p>{/if}

<form method="POST" action="?/default">
  <section class="section">
    <div class="section-head"><h2>会計年度</h2></div>
    <div class="field-set">
      <span class="lab">決算月</span>
      <select class="input" name="fiscal_month" style="max-width:160px">
        {#each Array(12) as _, i}
          <option value={i + 1} selected={s.fiscal_month === i + 1}>{i + 1}月</option>
        {/each}
      </select>
      <p class="help">決算月の翌月が会計年度の開始月になります（例：3月決算なら4月〜翌3月）。収支一覧のPLはこの設定で集計します。</p>
    </div>
  </section>

  <section class="section">
    <div class="section-head"><h2>表示項目設定</h2></div>
    <div class="field-set">
      <span class="lab">日付表示形式</span>
      <label class="opt"><input type="radio" name="date_format" value="iso" checked={s.date_format === "iso"} /> yyyy-mm-dd（2000-01-01）</label>
      <label class="opt"><input type="radio" name="date_format" value="jp" checked={s.date_format === "jp"} /> yyyy年mm月dd日（2000年01月01日）</label>
    </div>
  </section>

  <section class="section">
    <div class="section-head"><h2>課税設定</h2></div>

    <div class="field-set">
      <span class="lab">消費税</span>
      <label class="opt"><input type="radio" name="tax_display" value="exclusive" checked={s.tax_display === "exclusive"} /> 税抜表示（外税）</label>
      <label class="opt"><input type="radio" name="tax_display" value="inclusive" checked={s.tax_display === "inclusive"} /> 税込表示（内税）</label>
    </div>

    <div class="field-set">
      <span class="lab">消費税端数の計算方法</span>
      <label class="opt"><input type="radio" name="tax_rounding" value="floor" checked={s.tax_rounding === "floor"} /> 切り捨て</label>
      <label class="opt"><input type="radio" name="tax_rounding" value="ceil" checked={s.tax_rounding === "ceil"} /> 切り上げ</label>
      <label class="opt"><input type="radio" name="tax_rounding" value="round" checked={s.tax_rounding === "round"} /> 四捨五入</label>
      <p class="help">金額に消費税を掛けた結果、小数点が発生した場合の端数処理の設定です。</p>
    </div>

    <div class="field-set">
      <span class="lab">金額端数の計算方法</span>
      <label class="opt"><input type="radio" name="amount_rounding" value="floor" checked={s.amount_rounding === "floor"} /> 切り捨て</label>
      <label class="opt"><input type="radio" name="amount_rounding" value="ceil" checked={s.amount_rounding === "ceil"} /> 切り上げ</label>
      <label class="opt"><input type="radio" name="amount_rounding" value="round" checked={s.amount_rounding === "round"} /> 四捨五入</label>
      <p class="help">数量に単価を掛けた結果、小数点が発生した場合の端数処理の設定です。</p>
    </div>

    <div class="field-set">
      <span class="lab">源泉徴収</span>
      <label class="opt"><input type="radio" name="withholding" value="none" checked={s.withholding === "none"} /> なし</label>
      <label class="opt"><input type="radio" name="withholding" value="standard" checked={s.withholding === "standard"} /> あり（10.21% 復興税）</label>
    </div>

    <div class="field-set">
      <span class="lab">源泉徴収の計算方法</span>
      <label class="opt"><input type="radio" name="withholding_basis" value="exclusive" checked={s.withholding_basis === "exclusive"} /> 税抜金額で計算</label>
      <label class="opt"><input type="radio" name="withholding_basis" value="inclusive" checked={s.withholding_basis === "inclusive"} /> 税込金額で計算</label>
    </div>
  </section>

  <section class="section">
    <div class="section-head"><h2>請求書だけの表示項目設定</h2></div>
    <label class="check">
      <input type="checkbox" name="invoice_show_transaction_date" checked={s.invoice_show_transaction_date} />
      取引日を表示する
    </label>
  </section>

  <section class="section">
    <div class="section-head"><h2>プロジェクト（案件）管理</h2></div>
    <label class="check">
      <input type="checkbox" name="require_project" checked={s.require_project} />
      帳票にプロジェクト（案件）を必須にする
    </label>
    <p class="help">オンにすると、帳票の新規作成時にプロジェクトの選択が必須になります（顧客→プロジェクト→帳票の階層で管理）。</p>
  </section>

  <button type="submit" class="btn btn-primary">設定を保存</button>
</form>

<section class="section taxmaster">
  <div class="section-head taxhead">
    <h2>税率マスタ</h2>
    <button class="btn btn-primary btn-sm" type="button" on:click={() => taxDlg.showModal()} title="税率を追加">＋ 新規作成</button>
  </div>
  <p class="help">
    税率が変わるときは、新しい適用開始日で行を追加してください（例: 標準 12% 2027-04-01）。
    帳票の発行日に応じた税率が作成画面の選択肢・既定になります。確定済みの過去帳票には影響しません。
  </p>

  {#if form?.taxOk}<p class="flash-ok">税率マスタを更新しました。</p>{/if}

  <table class="taxtable">
    <thead>
      <tr><th>ラベル</th><th class="r">税率</th><th>適用開始日</th><th></th></tr>
    </thead>
    <tbody>
      {#each data.taxRates as t}
        <tr>
          <td>{t.label}</td>
          <td class="r">{t.rate}%</td>
          <td>{t.valid_from}</td>
          <td class="r">
            <form method="POST" action="?/deleteTaxRate">
              <input type="hidden" name="id" value={t.id} />
              <button type="submit" class="del" aria-label="削除">削除</button>
            </form>
          </td>
        </tr>
      {/each}
      {#if data.taxRates.length === 0}
        <tr><td colspan="4" class="empty">税率がありません。下のフォームから追加してください。</td></tr>
      {/if}
    </tbody>
  </table>

</section>

<!-- 税率追加モーダル -->
<dialog class="modal" bind:this={taxDlg}>
  <div class="modal-head">
    <h2>税率を追加</h2>
    <button class="modal-x" type="button" on:click={() => taxDlg.close()} aria-label="閉じる">×</button>
  </div>
  <form class="modal-body" method="POST" action="?/addTaxRate">
    {#if form?.taxError}<p class="flash-err">{form.taxError}</p>{/if}
    <div class="field"><span class="lab">ラベル</span><input class="input" name="label" placeholder="標準 / 軽減 など" required /></div>
    <div class="field"><span class="lab">税率(%)</span><input class="input" name="rate" type="number" min="0" max="100" step="1" placeholder="10" required /></div>
    <div class="field"><span class="lab">適用開始日</span><input class="input" name="valid_from" type="date" value={today} required /></div>
    <button type="submit" class="btn btn-primary" style="width:100%">追加する</button>
  </form>
</dialog>

<style>
  form { max-width: 680px; }
  .field-set { margin-bottom: 18px; }
  .field-set:last-child { margin-bottom: 0; }
  .lab { display: block; font-size: 13px; font-weight: 700; color: var(--ink-2); margin-bottom: 8px; }
  .opt { display: inline-flex; align-items: center; gap: 6px; margin-right: 18px; font-size: 14px; }
  .check { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; }
  .help { font-size: 12px; color: var(--muted); margin: 8px 0 0; }
  /* 税率マスタ */
  .taxmaster { max-width: 680px; margin-top: 24px; }
  .taxhead { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .taxtable { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 14px; }
  .taxtable th, .taxtable td { padding: 8px 10px; border-bottom: 1px solid var(--line); text-align: left; }
  .taxtable th { font-size: 12px; color: var(--muted); font-weight: 700; }
  .taxtable .r { text-align: right; }
  .taxtable .empty { color: var(--muted); text-align: center; }
  .taxtable .del { background: var(--red-soft); color: var(--red); border: none; border-radius: 6px; padding: 4px 12px; cursor: pointer; font-size: 13px; }
  .btn-sm { padding: 8px 16px; font-size: 13px; }
</style>
