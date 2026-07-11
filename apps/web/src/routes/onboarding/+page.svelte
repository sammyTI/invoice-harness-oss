<script>
  export let data;
  export let form;

  // 現在のステップ（1-2-3）。フォーム送信の成否で自動的に次へ進む。
  let step = 1;
  // 事業形態: Step2 の源泉徴収の推奨表示に使う（個人事業主なら「あり」を推奨）。
  let entityType = data.issuer?.entity_type ?? "corporate";

  // Step1 成功で Step2 へ、Step2 成功で Step3 へ自動遷移。
  $: if (form?.ok1) step = 2;
  $: if (form?.ok2) step = 3;

  const STEPS = [
    { n: 1, label: "自社情報" },
    { n: 2, label: "帳票の基本設定" },
    { n: 3, label: "完了" },
  ];

  const s = data.settings;

  // 個人事業主の推奨: 源泉徴収「あり」。表示ヒントの出し分けにのみ使用（強制はしない）。
  $: recommendWithholding = entityType === "individual";
</script>

<div class="page-head"><h1 class="page-title">初期セットアップ</h1></div>
<p class="lead">3ステップで、帳票の発行に必要な最小限の設定を済ませます。いつでもスキップして後から設定できます。</p>

<!-- ステップインジケータ 1-2-3 -->
<ol class="steps" aria-label="セットアップの進捗">
  {#each STEPS as st}
    <li class="step" class:active={step === st.n} class:done={step > st.n}>
      <span class="dot">
        {#if step > st.n}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
        {:else}
          {st.n}
        {/if}
      </span>
      <span class="steplabel">{st.label}</span>
    </li>
  {/each}
</ol>

<div class="card wizcard">
  {#if step === 1}
    <!-- Step1: 事業形態と自社情報 -->
    <h2 class="wiztitle">事業形態と自社情報</h2>
    {#if form?.error && form?.step === 1}<p class="flash-err">{form.error}</p>{/if}
    <form method="POST" action="?/step1">
      <div class="field-set">
        <span class="lab">事業形態</span>
        <label class="radio">
          <input type="radio" name="entity_type" value="corporate" bind:group={entityType} />
          <span class="radio-body"><b>法人</b><span class="radio-sub">株式会社・合同会社など。決算月を任意で設定できます。</span></span>
        </label>
        <label class="radio">
          <input type="radio" name="entity_type" value="individual" bind:group={entityType} />
          <span class="radio-body"><b>個人事業主・フリーランス</b><span class="radio-sub">屋号・個人名で発行。決算月は暦年（12月締め）で自動設定します。</span></span>
        </label>
      </div>

      <div class="field">
        <span class="lab">事業者名 <span class="req">必須</span></span>
        <input class="input" name="name" value={data.issuer?.name ?? ""} required placeholder="株式会社サンプル / 山田太郎" />
      </div>

      <div class="field">
        <span class="lab">インボイス登録番号（任意）</span>
        <input class="input" name="registration_number" value={data.issuer?.registration_number ?? ""} placeholder="T1234567890123" />
        <span class="sub">免税事業者は空欄でOKです。</span>
      </div>

      {#if entityType === "corporate"}
        <div class="field">
          <span class="lab">決算月</span>
          <select class="input" name="fiscal_month" style="max-width:180px">
            <option value="" selected={!data.issuer?.fiscal_month}>（全体設定に従う）</option>
            {#each Array(12) as _, i}
              <option value={i + 1} selected={data.issuer?.fiscal_month === i + 1}>{i + 1}月</option>
            {/each}
          </select>
          <span class="sub">決算月の翌月が会計年度の開始月になります（例: 3月決算なら4月〜翌3月）。</span>
        </div>
      {:else}
        <div class="field">
          <span class="lab">決算月</span>
          <p class="fixedval">12月（暦年）<span class="sub inline">個人事業主は暦年締めのため自動設定します。</span></p>
        </div>
      {/if}

      <div class="field">
        <span class="lab">振込先（任意）</span>
        <textarea class="input" name="bank_info" rows="2" placeholder="みずほ銀行 ○○支店 普通 1234567&#10;カ）サンプル">{data.issuer?.bank_info ?? ""}</textarea>
        <span class="sub">請求書に表示されます。複数行で入力できます。</span>
      </div>

      <div class="wizfoot">
        <a class="skip" href="/onboarding" on:click|preventDefault={() => (step = 2)}>スキップ</a>
        <button type="submit" class="btn btn-primary">保存して次へ</button>
      </div>
    </form>
  {:else if step === 2}
    <!-- Step2: 帳票の基本設定 -->
    <h2 class="wiztitle">帳票の基本設定</h2>
    <form method="POST" action="?/step2">
      <div class="field-set">
        <span class="lab">消費税の表示</span>
        <label class="opt"><input type="radio" name="tax_display" value="exclusive" checked={s.tax_display === "exclusive"} /> 税抜表示（外税）</label>
        <label class="opt"><input type="radio" name="tax_display" value="inclusive" checked={s.tax_display === "inclusive"} /> 税込表示（内税）</label>
      </div>

      <div class="field-set">
        <span class="lab">源泉徴収 {#if recommendWithholding}<span class="rec">個人事業主は「あり」を推奨</span>{/if}</span>
        <label class="opt"><input type="radio" name="withholding" value="none" checked={recommendWithholding ? false : s.withholding === "none"} /> なし</label>
        <label class="opt"><input type="radio" name="withholding" value="standard" checked={recommendWithholding ? true : s.withholding === "standard"} /> あり（10.21% 復興税込）</label>
      </div>

      <div class="field-set">
        <span class="lab">端数処理（消費税・金額）</span>
        <label class="opt"><input type="radio" name="amount_rounding" value="floor" checked={s.amount_rounding === "floor"} /> 切り捨て</label>
        <label class="opt"><input type="radio" name="amount_rounding" value="round" checked={s.amount_rounding === "round"} /> 四捨五入</label>
        <label class="opt"><input type="radio" name="amount_rounding" value="ceil" checked={s.amount_rounding === "ceil"} /> 切り上げ</label>
        <p class="help">数量×単価や消費税計算で小数点が出たときの処理です。後から帳票・税設定で個別に変更できます。</p>
      </div>

      <div class="wizfoot">
        <a class="skip" href="/onboarding" on:click|preventDefault={() => (step = 3)}>スキップ</a>
        <div class="foot-right">
          <button type="button" class="btn btn-ghost" on:click={() => (step = 1)}>← 戻る</button>
          <button type="submit" class="btn btn-primary">保存して次へ</button>
        </div>
      </div>
    </form>
  {:else}
    <!-- Step3: 完了 + 次の導線 -->
    <div class="done-head">
      <span class="done-mark">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
      </span>
      <h2 class="wiztitle">セットアップ完了</h2>
      <p class="done-sub">基本設定が整いました。次のアクションから始めましょう。</p>
    </div>

    <div class="nextgrid">
      <a class="card nextcard" href="/new?type=invoice">
        <svg class="nicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6M9 15h6"/></svg>
        <b>最初の請求書を作る</b>
        <span class="nsub">取引先と明細を入力して発行します。</span>
      </a>
      <a class="card nextcard" href="/clients">
        <svg class="nicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <b>取引先を登録</b>
        <span class="nsub">請求先の会社・担当者をあらかじめ登録します。</span>
      </a>
      <a class="card nextcard" href="/settings/api">
        <svg class="nicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg>
        <b>メール連携<span class="opt-tag">（任意）</span></b>
        <span class="nsub">Resend連携で帳票をそのままメール送信できます。</span>
      </a>
    </div>

    <div class="wizfoot single">
      <a class="btn btn-primary" href="/">ダッシュボードへ</a>
    </div>
  {/if}
</div>

<style>
  .lead { color: var(--ink-2); font-size: 14px; margin: -6px 0 20px; max-width: 640px; }
  /* ステップインジケータ */
  .steps { display: flex; align-items: center; gap: 8px; list-style: none; padding: 0; margin: 0 0 20px; max-width: 640px; }
  .step { display: flex; align-items: center; gap: 8px; flex: 1; }
  .step:not(:last-child)::after { content: ""; flex: 1; height: 2px; background: var(--line); border-radius: 2px; }
  .step.done:not(:last-child)::after { background: var(--primary); }
  .dot { display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: 999px; background: var(--surface-2); color: var(--muted); font-size: 13px; font-weight: 800; flex: none; border: 2px solid var(--line); }
  .dot svg { width: 15px; height: 15px; }
  .step.active .dot { background: var(--primary); border-color: var(--primary); color: #fff; }
  .step.done .dot { background: var(--primary-soft); border-color: var(--primary); color: var(--primary-d); }
  .steplabel { font-size: 13px; font-weight: 700; color: var(--muted); white-space: nowrap; }
  .step.active .steplabel { color: var(--ink); }
  .step.done .steplabel { color: var(--ink-2); }
  @media (max-width: 560px) { .steplabel { display: none; } }

  .wizcard { max-width: 640px; padding: 24px 26px; }
  .wiztitle { font-size: 17px; margin: 0 0 18px; }
  .field, .field-set { margin-bottom: 18px; }
  .field:last-child, .field-set:last-child { margin-bottom: 0; }
  .lab { display: block; font-size: 13px; font-weight: 700; color: var(--ink-2); margin-bottom: 8px; }
  .req { display: inline-block; font-size: 10px; font-weight: 800; color: var(--red); background: var(--red-soft); border-radius: 5px; padding: 1px 6px; margin-left: 4px; vertical-align: middle; }
  .rec { display: inline-block; font-size: 11px; font-weight: 700; color: var(--primary-d); background: var(--primary-soft); border-radius: 5px; padding: 2px 8px; margin-left: 6px; }
  .sub { color: var(--muted); font-size: 11px; margin-top: 4px; display: block; }
  .sub.inline { display: inline; margin-left: 8px; }
  .help { font-size: 12px; color: var(--muted); margin: 8px 0 0; }
  .fixedval { font-size: 14px; font-weight: 700; color: var(--ink); margin: 0; }
  .opt { display: inline-flex; align-items: center; gap: 6px; margin-right: 18px; font-size: 14px; }

  /* 事業形態のリッチラジオ */
  .radio { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border: 1px solid var(--line); border-radius: 10px; margin-bottom: 10px; cursor: pointer; transition: border-color 0.15s ease, background 0.15s ease; }
  .radio:hover { border-color: var(--primary); }
  .radio:has(input:checked) { border-color: var(--primary); background: var(--primary-soft); }
  .radio input { margin-top: 3px; }
  .radio-body { display: flex; flex-direction: column; gap: 2px; }
  .radio-body b { font-size: 14px; }
  .radio-sub { font-size: 12px; color: var(--muted); }

  .wizfoot { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--line); }
  .wizfoot.single { justify-content: flex-end; }
  .foot-right { display: flex; gap: 8px; }
  .skip { font-size: 13px; color: var(--muted); text-decoration: none; }
  .skip:hover { color: var(--ink-2); text-decoration: underline; }

  /* Step3 完了 */
  .done-head { text-align: center; padding: 8px 0 4px; }
  .done-mark { display: inline-grid; place-items: center; width: 52px; height: 52px; border-radius: 999px; background: var(--green-soft); color: var(--green); margin-bottom: 12px; }
  .done-mark svg { width: 26px; height: 26px; }
  .done-sub { color: var(--ink-2); font-size: 13px; margin: 4px 0 0; }
  .nextgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 20px 0 4px; }
  @media (max-width: 640px) { .nextgrid { grid-template-columns: 1fr; } }
  .nextcard { display: flex; flex-direction: column; gap: 6px; padding: 16px; text-decoration: none; color: inherit; transition: border-color 0.15s ease, transform 0.15s ease; }
  .nextcard:hover { border-color: var(--primary); transform: translateY(-1px); }
  .nextcard b { font-size: 14px; }
  .nicon { width: 22px; height: 22px; color: var(--primary); margin-bottom: 2px; }
  .nsub { font-size: 12px; color: var(--muted); line-height: 1.5; }
  .opt-tag { font-size: 11px; font-weight: 700; color: var(--muted); }
</style>
