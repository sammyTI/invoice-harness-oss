<script>
  import { onMount } from "svelte";
  import SettingsGear from "$lib/SettingsGear.svelte";
  import { ratesForDate } from "$lib/tax";
  export let data;
  export let form;

  // プロジェクト指定あり: 売上側は案件の顧客をプリセット。支払側（発注/支払通知）は支払先を選ぶので固定しない。
  const isCostType = data.type === "order" || data.type === "payment_notice";
  let projectSel = data.project?.id ?? "";
  let clientSel = (data.project && !isCostType ? data.project.client_id : "") || data.clients[0]?.id || "__new__";
  let issuerId = data.project?.issuer_id || data.issuers[0]?.id || "";
  let divisionSel = data.project?.division_id ?? "";
  // 選んだ会社の区分＋全社共通の区分だけ表示
  $: divs = data.divisions.filter((d) => !d.issuer_id || d.issuer_id === issuerId);

  // 顧客→プロジェクト連動（クライアント側リアクティブ）
  // 選択中の取引先の案件のみ表示。取引先未選択/該当0件でも「＋ 新規」は常に出す（テンプレ側）。
  $: projectOptions = data.projects.filter((pr) => pr.client_id === clientSel);
  // 取引先を変えて、選択中の案件がその顧客のものでなくなったら選択をリセット（誤請求防止）。
  $: if (clientSel && projectSel && projectSel !== "__new__" && !data.projects.some((pr) => pr.id === projectSel && pr.client_id === clientSel)) {
    projectSel = "";
  }
  // プロジェクトを選んだら、その案件の発行元・計上区分を自動セット（手動変更は可能）。
  function onProjectChange() {
    const pr = data.projects.find((p) => p.id === projectSel);
    if (pr) {
      if (pr.issuer_id) issuerId = pr.issuer_id;
      divisionSel = pr.division_id ?? "";
    }
  }
  let dirty = false;
  onMount(() => {
    const h = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  });

  let lines = [
    { name: "", qty: 1, unit: "式", price: 0, rate: 10, priceStr: "", txnDate: "" },
    { name: "", qty: 1, unit: "式", price: 0, rate: 10, priceStr: "", txnDate: "" },
    { name: "", qty: 1, unit: "式", price: 0, rate: 10, priceStr: "", txnDate: "" },
  ];
  function addLine() { lines = [...lines, { name: "", qty: 1, unit: "式", price: 0, rate: 10, priceStr: "", txnDate: "" }]; }
  function removeLine(i) { lines = lines.filter((_, idx) => idx !== i); }
  // 単価は割引(マイナス)も入力可。入力中は自由、フォーカスを外すと3桁区切りに整形。送信は hidden の生数値。
  function parsePrice(s) {
    const v = String(s).replace(/[^0-9-]/g, "").replace(/(?!^)-/g, "");
    return v === "" || v === "-" ? 0 : parseInt(v, 10);
  }
  function onPrice(e, i) {
    lines[i].priceStr = e.target.value;
    lines[i].price = parsePrice(e.target.value);
    lines = lines;
  }
  function onPriceBlur(i) {
    lines[i].priceStr = lines[i].price ? lines[i].price.toLocaleString() : "";
    lines = lines;
  }
  function fillFromItem(i) {
    const hit = data.items.find((it) => it.name === lines[i].name);
    if (hit) {
      lines[i] = { ...lines[i], price: hit.unit_price, unit: hit.unit, rate: hit.tax_rate, priceStr: hit.unit_price ? hit.unit_price.toLocaleString() : "" };
      lines = lines;
    }
  }
  // 取引先はページ遷移せずその場で追加できるよう、loadの配列をローカルコピーして扱う。
  let clients = [...data.clients];
  let clientDlg;
  let ncName = "";
  let ncHonorific = "御中";
  let ncContact = "";
  let ncEmail = "";
  let ncError = "";
  let ncBusy = false;
  function openClientDlg() {
    ncName = "";
    ncHonorific = "御中";
    ncContact = "";
    ncEmail = "";
    ncError = "";
    clientDlg.showModal();
  }
  // ページ遷移・フォーム送信を発生させず、fetchだけで取引先を追加する（入力中の明細・件名・日付を保持）。
  async function addClient() {
    ncError = "";
    if (!ncName.trim()) { ncError = "取引先名を入力してください。"; return; }
    ncBusy = true;
    try {
      const res = await fetch("/new/quick-client", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: ncName, honorific: ncHonorific, contact: ncContact, email: ncEmail }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        ncError = j.error || "追加に失敗しました";
        return;
      }
      const { id, name } = await res.json();
      clients = [...clients, { id, name, honorific: ncHonorific }];
      clientSel = id; // 追加した取引先を選択状態にする
      clientDlg.close();
    } catch {
      ncError = "追加に失敗しました";
    } finally {
      ncBusy = false;
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  // 発行日。税率の選択肢は発行日に応じて ratesForDate で切り替える。
  let issueDate = today;
  // 発行日に有効な税率（label順）。先頭が既定（標準系列）。
  $: taxOptions = ratesForDate(data.taxRates ?? [], issueDate);
  // 発行日を変えて選択肢が変わったとき、選択肢に無い率だけ既定（先頭）に寄せる。
  // 既存行が有効な率を選んでいればそのまま維持する。
  $: if (taxOptions.length) {
    const valid = new Set(taxOptions.map((o) => o.rate));
    const def = taxOptions[0].rate;
    let changed = false;
    for (const l of lines) {
      if (!valid.has(l.rate)) { l.rate = def; changed = true; }
    }
    if (changed) lines = lines;
  }
  let notes = data.defaultNotes ?? "";
  let insertSel = "";
  function insertNote() {
    const tpl = data.noteTemplates.find((t) => t.id === insertSel);
    if (tpl) notes = tpl.body; // 選んだテンプレートで置き換え（押すたびに積み重ならない）
    insertSel = "";
  }
</script>

<div class="page-head">
  <h1 class="page-title">{data.label}を作成</h1>
  <div class="head-acts">
    <a class="btn btn-quiet" href={`/docs/${data.type}`}>一覧へ</a>
    <SettingsGear
      links={[
        { href: "/settings/tax", label: "帳票・税（取引日/プロジェクト必須など）" },
        { href: "/settings/issuer", label: "自社情報（振込先・社印）" },
        { href: "/settings/templates/notes", label: "備考テンプレ" },
      ]}
    />
  </div>
</div>

{#if form?.error}<p class="flash-err">{form.error}</p>{/if}

<datalist id="itemlist">
  {#each data.items as it}<option value={it.name}></option>{/each}
</datalist>

<form method="POST" on:input={() => (dirty = true)} on:submit={() => (dirty = false)}>
  <input type="hidden" name="type" value={data.type} />

  <section class="section">
    <div class="section-head"><h2>基本情報</h2></div>
    <div class="grid2">
      <!-- ①取引先（顧客）→②プロジェクト→③発行元→④計上区分 の順（顧客起点のメンタルモデル） -->
      <div class="field"><span class="lab">{isCostType ? "支払先（外注先・仕入先）" : "取引先"}</span>
        <div class="clientrow">
          <select class="input" name="client_id" bind:value={clientSel} required>
            {#each clients as c}<option value={c.id}>{c.name} {c.honorific}</option>{/each}
            <option value="__new__">＋ 新規取引先を登録…</option>
          </select>
          <button type="button" class="btn btn-quiet btn-sm" on:click={openClientDlg}>＋ 新規</button>
        </div>
      </div>
      <div class="field"><span class="lab">プロジェクト{#if data.requireProject}<span class="req">必須</span>{/if}</span>
        {#if data.project}
          <input type="hidden" name="project_id" value={data.project.id} />
          <div class="prjfixed"><span class="prjchip">{data.project.name}</span><a class="mini" href={`/projects/${data.project.id}`}>案件へ</a></div>
        {:else}
          <select class="input" name="project_id" bind:value={projectSel} on:change={onProjectChange} required={data.requireProject}>
            <option value="">{data.requireProject ? "選択してください" : "（未割当）"}</option>
            <!-- 選んだ取引先の案件のみ表示（表示は案件名のみ・顧客名は括弧不要） -->
            {#each projectOptions as pr}<option value={pr.id}>{pr.name}</option>{/each}
            <option value="__new__">＋ 新規プロジェクトを作る…</option>
          </select>
          {#if projectSel === "__new__"}
            <input class="input newprj" name="project_new_name" placeholder="新規プロジェクト名（案件名）" required />
          {/if}
          <span class="hint">選んだ取引先の案件が表示されます</span>
        {/if}
      </div>
      <div class="field"><span class="lab">発行元</span>
        <select class="input" name="issuer_id" bind:value={issuerId} required>
          {#each data.issuers as iss}<option value={iss.id}>{iss.name}</option>{/each}
        </select>
      </div>
      {#if divs.length}
        <div class="field"><span class="lab">計上区分（部門）</span>
          <select class="input" name="division_id" bind:value={divisionSel}>
            <option value="">（未設定）</option>
            {#each divs as dv}<option value={dv.id}>{dv.name}</option>{/each}
          </select>
        </div>
      {/if}
      <div class="field"><span class="lab">発行日</span><input class="input" type="date" name="issue_date" bind:value={issueDate} required /></div>
      <div class="field"><span class="lab">支払期限</span><input class="input" type="date" name="due_date" /></div>
    </div>

    {#if clientSel === "__new__"}
      <div class="newclient">
        <div class="nc-head">新規取引先の登録（この帳票の宛先になります）</div>
        <div class="grid2">
          <div class="field"><span class="lab">取引先名 *</span><input class="input" name="new_client_name" required /></div>
          <div class="field"><span class="lab">敬称</span>
            <select class="input" name="new_client_honorific"><option>御中</option><option>様</option></select>
          </div>
          <div class="field"><span class="lab">担当</span><input class="input" name="new_client_contact" placeholder="総務部 ご担当者様" /></div>
          <div class="field"><span class="lab">メール</span><input class="input" type="email" name="new_client_email" /></div>
          <div class="field"><span class="lab">郵便番号</span><input class="input" name="new_client_postal" placeholder="100-0001" /></div>
          <div class="field"><span class="lab">住所</span><input class="input" name="new_client_address" /></div>
        </div>
      </div>
    {/if}

    <div class="field"><span class="lab">件名</span><input class="input" type="text" name="subject" placeholder="例: 2026年6月分 ご請求" /></div>
  </section>

  <section class="section">
    <div class="section-head"><h2>明細</h2><button type="button" class="btn btn-quiet btn-sm" on:click={addLine}>＋ 明細を追加</button></div>
    <div class="litems" class:withtxn={data.showTxn}>
      <div class="lihead">{#if data.showTxn}<span>取引日</span>{/if}<span>品目</span><span>数量</span><span>単位</span><span>単価</span><span>税率</span><span></span></div>
      {#each lines as line, i}
        <div class="litem">
          {#if data.showTxn}<label class="f txn"><span class="flab">取引日</span><input class="input" type="date" name="line_txn_date" bind:value={line.txnDate} /></label>{/if}
          <label class="f name"><span class="flab">品目</span><input class="input" name="line_name" list="itemlist" bind:value={line.name} on:change={() => fillFromItem(i)} placeholder="品目名" /></label>
          <label class="f qty"><span class="flab">数量</span><input class="input r" name="line_qty" type="number" step="any" bind:value={line.qty} /></label>
          <label class="f unit"><span class="flab">単位</span><input class="input" name="line_unit" bind:value={line.unit} /></label>
          <label class="f price"><span class="flab">単価</span>
            <input class="input r" inputmode="text" value={line.priceStr} on:input={(e) => onPrice(e, i)} on:blur={() => onPriceBlur(i)} placeholder="0（割引は -100）" />
            <input type="hidden" name="line_price" value={line.price} />
          </label>
          <label class="f rate"><span class="flab">税率</span>
            <select class="input" name="line_rate" bind:value={line.rate}>
              {#each taxOptions as o}<option value={o.rate}>{o.label} {o.rate}%</option>{/each}
            </select>
          </label>
          <button type="button" class="del" on:click={() => removeLine(i)} aria-label="行を削除">×</button>
        </div>
      {/each}
    </div>
  </section>

  <section class="section">
    <div class="section-head">
      <h2>備考</h2>
      {#if data.noteTemplates.length}
        <select class="input insert" bind:value={insertSel} on:change={insertNote}>
          <option value="">テンプレートを適用…</option>
          {#each data.noteTemplates as t}<option value={t.id}>{t.name}</option>{/each}
        </select>
      {/if}
    </div>
    <textarea class="input" name="notes" rows="3" bind:value={notes} placeholder="お振込手数料は貴社にてご負担ください 等"></textarea>
  </section>

  <div class="actions">
    <button type="submit" class="btn btn-primary">作成してプレビュー</button>
    <a class="btn btn-quiet" href={`/docs/${data.type}`}>キャンセル</a>
  </div>
</form>

<!-- 取引先のインライン追加モーダル。formはmethod="dialog"、追加ボタンはtype="button"でfetch完結。ページ遷移・送信を起こさない。 -->
<dialog class="modal" bind:this={clientDlg}>
  <div class="modal-head">
    <h2>取引先を追加</h2>
    <button class="modal-x" type="button" on:click={() => clientDlg.close()} aria-label="閉じる">×</button>
  </div>
  <form class="modal-body" method="dialog" on:submit|preventDefault={addClient}>
    {#if ncError}<p class="flash-err">{ncError}</p>{/if}
    <div class="grid2">
      <div class="field"><span class="lab">取引先名 *</span><input class="input" bind:value={ncName} required /></div>
      <div class="field"><span class="lab">敬称</span>
        <select class="input" bind:value={ncHonorific}><option>御中</option><option>様</option></select>
      </div>
      <div class="field"><span class="lab">担当</span><input class="input" bind:value={ncContact} placeholder="総務部 ご担当者様" /></div>
      <div class="field"><span class="lab">メール</span><input class="input" type="email" bind:value={ncEmail} /></div>
    </div>
    <div class="actions" style="margin-top:14px">
      <button type="button" class="btn btn-primary" on:click={addClient} disabled={ncBusy}>{ncBusy ? "追加中…" : "追加する"}</button>
      <button type="button" class="btn btn-quiet" on:click={() => clientDlg.close()}>閉じる</button>
    </div>
  </form>
</dialog>

<style>
  .head-acts { display: flex; gap: 8px; align-items: center; }
  /* 取引先select＋「＋ 新規」ボタンを同じ行に。ボタンは折り返さない。 */
  .clientrow { display: flex; gap: 8px; align-items: center; }
  .clientrow > .input { min-width: 0; flex: 1; }
  .clientrow > .btn { white-space: nowrap; flex: none; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
  .grid2 > .field { min-width: 0; }
  @media (max-width: 640px) { .grid2 { grid-template-columns: 1fr; } }
  /* 明細エディタ（デスクトップ=表組み風 / モバイル=カード積み） */
  .litems { display: flex; flex-direction: column; gap: 6px; }
  .lihead, .litem { display: grid; grid-template-columns: 1fr 84px 76px 120px 88px 36px; gap: 8px; align-items: center; }
  .litems.withtxn .lihead, .litems.withtxn .litem { grid-template-columns: 140px 1fr 66px 62px 110px 74px 32px; }
  .lihead { font-size: 12px; color: var(--muted); font-weight: 700; padding: 0 2px; }
  .litem .f { display: flex; flex-direction: column; gap: 0; min-width: 0; }
  .flab { display: none; }
  .litem .input.r { text-align: right; }
  .del { background: var(--red-soft); color: var(--red); border: none; border-radius: 6px; padding: 8px 0; cursor: pointer; font-size: 16px; line-height: 1; }
  @media (max-width: 640px) {
    .lihead { display: none; }
    .litem { grid-template-columns: 1fr 1fr; gap: 8px 10px; border: 1px solid var(--line); border-radius: 10px; padding: 12px; background: var(--surface-2); }
    .litem .name { grid-column: 1 / -1; }
    .litem .del { grid-column: 1 / -1; padding: 9px; }
    .flab { display: block; font-size: 11px; color: var(--muted); font-weight: 700; margin-bottom: 4px; }
  }
  .actions { display: flex; gap: 12px; align-items: center; margin-top: 4px; }
  .insert { width: auto; font-size: 13px; padding: 6px 10px; }
  .newclient { background: var(--primary-soft); border: 1px solid #cfe0fb; border-radius: 10px; padding: 14px 16px; margin: 4px 0 14px; }
  .nc-head { font-size: 12px; font-weight: 700; color: var(--primary-d); margin-bottom: 10px; }
  .prjfixed { display: flex; align-items: center; gap: 10px; min-height: 38px; }
  .prjchip { display: inline-block; background: var(--primary-soft); color: var(--primary-d); border-radius: 999px; padding: 4px 12px; font-size: 13px; font-weight: 700; }
  .mini { font-size: 12px; }
  .req { display: inline-block; margin-left: 6px; background: var(--red-soft); color: var(--red); border-radius: 4px; padding: 1px 6px; font-size: 11px; font-weight: 700; }
  .newprj { margin-top: 8px; }
  .hint { display: block; margin-top: 4px; font-size: 11px; color: var(--muted); }
</style>
