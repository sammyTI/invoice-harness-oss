<script>
  export let data;
  export let form;
  $: s = data.settings;
</script>

<div class="page-head"><h1 class="page-title">課税・表示項目設定</h1></div>
{#if form?.ok}<p class="flash-ok">設定を保存しました。</p>{/if}

<form method="POST">
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

  <button type="submit" class="btn btn-primary">設定を保存</button>
</form>

<style>
  form { max-width: 680px; }
  .field-set { margin-bottom: 18px; }
  .field-set:last-child { margin-bottom: 0; }
  .lab { display: block; font-size: 13px; font-weight: 700; color: var(--ink-2); margin-bottom: 8px; }
  .opt { display: inline-flex; align-items: center; gap: 6px; margin-right: 18px; font-size: 14px; }
  .check { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; }
  .help { font-size: 12px; color: var(--muted); margin: 8px 0 0; }
</style>
