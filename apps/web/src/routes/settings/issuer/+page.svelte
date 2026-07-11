<script>
  import { onMount } from "svelte";
  export let data;
  export let form;

  let addDlg;
  let editDlg;
  // 編集対象の発行元（行データはすべて data.issuers に載っているのでクライアント側で保持する）
  let editing = null;

  onMount(() => {
    // 追加モーダルはバリデーションエラー時に開いたままにする
    if (form?.error && form?.mode === "create") addDlg?.showModal();
  });

  function openEdit(iss) {
    editing = iss;
    // {#if editing} でDOMが生成された直後に開くため次tickで showModal
    queueMicrotask(() => editDlg?.showModal());
  }

  // 事業形態が「個人事業主」に変わったら決算月を12（暦年）に自動セットする。
  // 手動変更は妨げないため、以後の決算月操作は上書きしない。
  function onEntityChange(e) {
    const formEl = e.target.closest("form");
    if (!formEl) return;
    if (e.target.value === "individual") {
      const fm = formEl.querySelector('select[name="fiscal_month"]');
      if (fm) fm.value = "12";
    }
  }

  const fiscalLabel = (m) => (m ? `${m}月` : "全体設定に従う");
</script>

<div class="page-head">
  <h1 class="page-title">自社情報</h1>
  <button class="btn btn-primary" type="button" on:click={() => addDlg.showModal()} title="発行元を追加">＋ 新規作成</button>
</div>
<p class="hint">帳票に表示される発行元（事業者名・登録番号・住所・<b>振込先</b>）を設定します。社印・ロゴは<a href="/settings/assets">社印・ロゴ設定</a>で登録します。</p>
{#if form?.error && form?.mode !== "create"}<p class="flash-err">{form.error}</p>{/if}
{#if form?.ok}<p class="flash-ok">保存しました。</p>{/if}

{#if data.issuers.length === 0}
  <div class="empty">発行元がまだありません。<div style="margin-top:12px"><button class="btn btn-primary btn-sm" type="button" on:click={() => addDlg.showModal()}>＋ 新規作成</button></div></div>
{:else}
  <div class="table-wrap">
    <table class="table">
      <thead><tr><th>事業者名</th><th>形態</th><th>登録番号</th><th>決算月</th><th>ロゴ / 社印</th><th></th></tr></thead>
      <tbody>
        {#each data.issuers as iss}
          <tr>
            <td><b>{iss.name}</b>{#if iss.person_name}<span class="sub2">{iss.person_name}</span>{/if}</td>
            <td>
              {#if iss.entity_type === "individual"}<span class="chip chip-indiv">個人</span>{:else}<span class="chip chip-corp">法人</span>{/if}
            </td>
            <td>{#if iss.registration_number}<span class="reg" title={iss.registration_number}>登録あり</span>{:else}<span class="muted">—</span>{/if}</td>
            <td>{fiscalLabel(iss.fiscal_month)}</td>
            <td>
              <span class={iss.logo_key ? "flag on" : "flag"}>ロゴ</span>
              <span class={iss.seal_key ? "flag on" : "flag"}>社印</span>
            </td>
            <td class="r"><button class="mini" type="button" on:click={() => openEdit(iss)}>編集</button></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<!-- 追加モーダル -->
<dialog class="modal" bind:this={addDlg}>
  <div class="modal-head">
    <h2>発行元を追加</h2>
    <button class="modal-x" type="button" on:click={() => addDlg.close()} aria-label="閉じる">×</button>
  </div>
  <form class="modal-body" method="POST" action="?/create">
    {#if form?.error && form?.mode === "create"}<p class="flash-err">{form.error}</p>{/if}
    <div class="grid2">
      <div class="field"><span class="lab">事業形態</span>
        <select class="input" name="entity_type" on:change={onEntityChange}>
          <option value="corporate" selected>法人</option>
          <option value="individual">個人事業主・フリーランス</option>
        </select>
      </div>
      <div class="field"><span class="lab">事業者名</span><input class="input" name="name" required /><span class="sub">法人名、または屋号・氏名（例: 山田太郎 / デザイン事務所ヤマダ）</span></div>
      <div class="field"><span class="lab">発行者名（担当者名）</span><input class="input" name="person_name" placeholder="営業部 山田太郎" /></div>
      <div class="field"><span class="lab">登録番号</span><input class="input" name="registration_number" placeholder="T1234567890123" /><span class="sub">免税事業者の場合は空欄で構いません。</span></div>
      <div class="field"><span class="lab">郵便番号</span><input class="input" name="postal_code" /></div>
      <div class="field"><span class="lab">TEL</span><input class="input" name="tel" /></div>
      <div class="field"><span class="lab">メール</span><input class="input" name="email" /></div>
      <div class="field"><span class="lab">決算月</span>
        <select class="input" name="fiscal_month">
          <option value="" selected>（全体設定に従う）</option>
          {#each Array(12) as _, i}
            <option value={i + 1}>{i + 1}月</option>
          {/each}
        </select>
        <span class="sub">個人事業主は暦年（12月締め）です。</span>
      </div>
    </div>
    <div class="field"><span class="lab">住所</span><textarea class="input" name="address" rows="2" placeholder="〒100-0001 東京都千代田区千代田1-1-1&#10;サンプルビル10F"></textarea><span class="sub">長い住所は改行できます（市区町村・建物名で改行など）。</span></div>
    <div class="field"><span class="lab">振込先</span><textarea class="input" name="bank_info" rows="2" placeholder="みずほ銀行 ○○支店 普通 1234567&#10;カ）○○"></textarea><span class="sub">複数行で入力できます。</span></div>
    <button class="btn btn-primary" type="submit" style="width:100%">追加する</button>
  </form>
</dialog>

<!-- 編集モーダル -->
{#if editing}
  <dialog class="modal" bind:this={editDlg} on:close={() => (editing = null)}>
    <div class="modal-head">
      <h2>発行元を編集</h2>
      <button class="modal-x" type="button" on:click={() => editDlg.close()} aria-label="閉じる">×</button>
    </div>
    <form class="modal-body" method="POST" action="?/update">
      <input type="hidden" name="id" value={editing.id} />
      <div class="grid2">
        <div class="field"><span class="lab">事業形態</span>
          <select class="input" name="entity_type" on:change={onEntityChange}>
            <option value="corporate" selected={(editing.entity_type ?? "corporate") !== "individual"}>法人</option>
            <option value="individual" selected={editing.entity_type === "individual"}>個人事業主・フリーランス</option>
          </select>
        </div>
        <div class="field"><span class="lab">事業者名</span><input class="input" name="name" value={editing.name} required /><span class="sub">法人名、または屋号・氏名（例: 山田太郎 / デザイン事務所ヤマダ）</span></div>
        <div class="field"><span class="lab">発行者名（担当者名）</span><input class="input" name="person_name" value={editing.person_name ?? ""} placeholder="営業部 山田太郎" /></div>
        <div class="field"><span class="lab">登録番号（インボイス）</span><input class="input" name="registration_number" value={editing.registration_number ?? ""} placeholder="T1234567890123" /><span class="sub">免税事業者の場合は空欄で構いません。</span></div>
        <div class="field"><span class="lab">郵便番号</span><input class="input" name="postal_code" value={editing.postal_code ?? ""} /></div>
        <div class="field"><span class="lab">TEL</span><input class="input" name="tel" value={editing.tel ?? ""} /></div>
        <div class="field"><span class="lab">メール</span><input class="input" name="email" value={editing.email ?? ""} /></div>
        <div class="field"><span class="lab">決算月</span>
          <select class="input" name="fiscal_month">
            <option value="" selected={!editing.fiscal_month}>（全体設定に従う）</option>
            {#each Array(12) as _, i}
              <option value={i + 1} selected={editing.fiscal_month === i + 1}>{i + 1}月</option>
            {/each}
          </select>
          {#if editing.entity_type === "individual"}
            <span class="sub">個人事業主は暦年（12月締め）です。</span>
          {:else}
            <span class="sub">この会社の年度区切り。複数社あるとトップは暦年で集計し、会社を選ぶとその会社の年度で表示します。</span>
          {/if}
        </div>
      </div>
      <div class="field"><span class="lab">住所</span><textarea class="input" name="address" rows="2" placeholder="〒100-0001 東京都千代田区千代田1-1-1&#10;サンプルビル10F">{editing.address ?? ""}</textarea><span class="sub">長い住所は改行できます（市区町村・建物名で改行など）。</span></div>
      <div class="field"><span class="lab">振込先</span><textarea class="input" name="bank_info" rows="2" placeholder="みずほ銀行 ○○支店 普通 1234567&#10;カ）○○">{editing.bank_info ?? ""}</textarea><span class="sub">複数行で入力できます。</span></div>
      <div class="modal-foot">
        <a class="assetlink" href="/settings/assets">社印・ロゴを編集</a>
        <button class="btn btn-primary" type="submit">更新する</button>
      </div>
    </form>
  </dialog>
{/if}

<style>
  .hint { color: var(--ink-2); font-size: 13px; margin-top: -8px; }
  .hint a { color: var(--primary); }
  .sub { color: var(--muted); font-size: 11px; margin-top: 4px; display: block; }
  .sub2 { display: block; color: var(--muted); font-size: 12px; margin-top: 2px; }
  .muted { color: var(--muted); }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
  @media (max-width: 640px) { .grid2 { grid-template-columns: 1fr; } }
  .mini { font-size: 13px; background: none; border: none; color: var(--primary); cursor: pointer; padding: 0; }
  .chip { display: inline-block; border-radius: 999px; padding: 2px 10px; font-size: 12px; font-weight: 700; }
  .chip-corp { background: var(--primary-soft); color: var(--primary-d); }
  .chip-indiv { background: var(--slate-soft); color: var(--ink-2); }
  .reg { font-size: 12px; color: var(--ink-2); }
  .flag { display: inline-block; font-size: 11px; font-weight: 700; color: var(--muted); background: var(--slate-soft); border-radius: 6px; padding: 2px 7px; margin-right: 4px; }
  .flag.on { color: var(--primary-d); background: var(--primary-soft); }
  .modal-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 6px; }
  .modal-foot .assetlink { font-size: 13px; color: var(--primary); }
</style>
