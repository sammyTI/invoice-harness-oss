<script>
  import { onMount } from "svelte";
  export let data;
  export let form;

  let clientSel = data.clients[0]?.id ?? "__new__";
  let issuerId = data.issuers[0]?.id ?? "";
  // 選んだ会社の区分＋全社共通の区分だけ表示
  $: divs = data.divisions.filter((d) => !d.issuer_id || d.issuer_id === issuerId);
  let dirty = false;
  onMount(() => {
    const h = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  });

  let lines = [
    { name: "", qty: 1, unit: "式", price: 0, rate: 10 },
    { name: "", qty: 1, unit: "式", price: 0, rate: 10 },
    { name: "", qty: 1, unit: "式", price: 0, rate: 10 },
  ];
  function addLine() { lines = [...lines, { name: "", qty: 1, unit: "式", price: 0, rate: 10 }]; }
  function removeLine(i) { lines = lines.filter((_, idx) => idx !== i); }
  // 単価入力を3桁区切りで見やすく。表示はカンマ付きテキスト、送信は hidden の生数値。
  function onPrice(e, i) {
    const digits = String(e.target.value).replace(/[^0-9]/g, "");
    lines[i].price = digits ? parseInt(digits, 10) : 0;
    lines = lines;
  }
  function fillFromItem(i) {
    const hit = data.items.find((it) => it.name === lines[i].name);
    if (hit) {
      lines[i] = { ...lines[i], price: hit.unit_price, unit: hit.unit, rate: hit.tax_rate };
      lines = lines;
    }
  }
  const today = new Date().toISOString().slice(0, 10);
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
  <a class="btn btn-quiet" href={`/docs/${data.type}`}>一覧へ</a>
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
      <div class="field"><span class="lab">発行元</span>
        <select class="input" name="issuer_id" bind:value={issuerId} required>
          {#each data.issuers as iss}<option value={iss.id}>{iss.name}</option>{/each}
        </select>
      </div>
      <div class="field"><span class="lab">取引先</span>
        <select class="input" name="client_id" bind:value={clientSel} required>
          {#each data.clients as c}<option value={c.id}>{c.name} {c.honorific}</option>{/each}
          <option value="__new__">＋ 新規取引先を登録…</option>
        </select>
      </div>
      <div class="field"><span class="lab">発行日</span><input class="input" type="date" name="issue_date" value={today} required /></div>
      <div class="field"><span class="lab">支払期限</span><input class="input" type="date" name="due_date" /></div>
      {#if divs.length}
        <div class="field"><span class="lab">計上区分（部門）</span>
          <select class="input" name="division_id">
            <option value="">（未設定）</option>
            {#each divs as dv}<option value={dv.id}>{dv.name}</option>{/each}
          </select>
        </div>
      {/if}
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
    <div class="litems">
      <div class="lihead"><span>品目</span><span>数量</span><span>単位</span><span>単価</span><span>税率</span><span></span></div>
      {#each lines as line, i}
        <div class="litem">
          <label class="f name"><span class="flab">品目</span><input class="input" name="line_name" list="itemlist" bind:value={line.name} on:change={() => fillFromItem(i)} placeholder="品目名" /></label>
          <label class="f qty"><span class="flab">数量</span><input class="input r" name="line_qty" type="number" step="any" bind:value={line.qty} /></label>
          <label class="f unit"><span class="flab">単位</span><input class="input" name="line_unit" bind:value={line.unit} /></label>
          <label class="f price"><span class="flab">単価</span>
            <input class="input r" inputmode="numeric" value={line.price ? line.price.toLocaleString() : ""} on:input={(e) => onPrice(e, i)} placeholder="0" />
            <input type="hidden" name="line_price" value={line.price} />
          </label>
          <label class="f rate"><span class="flab">税率</span>
            <select class="input" name="line_rate" bind:value={line.rate}><option value={10}>10%</option><option value={8}>8%</option></select>
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

<style>
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
  .grid2 > .field { min-width: 0; }
  @media (max-width: 640px) { .grid2 { grid-template-columns: 1fr; } }
  /* 明細エディタ（デスクトップ=表組み風 / モバイル=カード積み） */
  .litems { display: flex; flex-direction: column; gap: 6px; }
  .lihead, .litem { display: grid; grid-template-columns: 1fr 84px 76px 120px 88px 36px; gap: 8px; align-items: center; }
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
</style>
