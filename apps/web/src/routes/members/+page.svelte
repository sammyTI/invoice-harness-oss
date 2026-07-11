<script>
  import { enhance } from "$app/forms";
  import { onMount } from "svelte";
  import SettingsGear from "$lib/SettingsGear.svelte";
  export let data;
  export let form;

  let inviteDlg;
  onMount(() => { if (form?.error) inviteDlg?.showModal(); });

  let editId = null;
  let copied = false;
  let inviteRole = "member";

  // ロールバッジの表示ラベルとチップ配色
  const ROLE_BADGE = {
    owner: { label: "オーナー", cls: "chip-issued" },
    member: { label: "メンバー", cls: "chip-paid" },
    viewer: { label: "閲覧のみ", cls: "chip-draft" },
    demo: { label: "デモ", cls: "chip-sent" },
  };
  const roleBadge = (r) => ROLE_BADGE[r] ?? { label: r, cls: "chip-draft" };
  // アバターの頭文字（名前の先頭1字）
  const initial = (name) => (name ?? "").trim().charAt(0) || "?";
  function credText(c) {
    return `Invoice Harness ログイン情報\nログインURL: ${c.loginUrl}\nメール: ${c.email}\n初期パスワード: ${c.password}\n※初回ログイン後にパスワードを変更してください。`;
  }
  async function copy(c) {
    try {
      await navigator.clipboard.writeText(credText(c));
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      copied = false;
    }
  }
</script>

<div class="page-head">
  <h1 class="page-title">メンバー</h1>
  <div class="head-acts">
    <button class="btn btn-primary" type="button" on:click={() => inviteDlg.showModal()} title="メンバーを招待">＋ 新規作成</button>
    <SettingsGear links={[
      { href: "/settings/api", label: "メール連携（Resend）" },
      { href: "/settings/templates/email", label: "メールテンプレ（招待文面）" },
    ]} />
  </div>
</div>

<p class="note">
  招待すると<b>初期パスワード</b>を発行します。{#if data.mailEnabled}メール連携済みのため本人にメール送信されます。{:else}メール未連携なので、表示される<b>ログイン情報をコピー</b>して本人にお渡しください。{/if}
  本人は初回ログイン後にパスワードを自分で設定します。owner のみがこの画面を操作できます。
</p>
{#if form?.error}<p class="flash-err">{form.error}</p>{/if}

{#if form?.cred}
  <div class="cred">
    <div class="cred-h">
      <b>ログイン情報を発行しました</b>
      {#if form.emailed}<span class="chip chip-paid">メール送信済み</span>
      {:else if form.mailError}<span class="chip chip-canceled">メール送信失敗: {form.mailError}</span>
      {:else}<span class="chip chip-sent">本人へ手動で共有してください</span>{/if}
    </div>
    {#if form.mailError}<p class="cred-note">下記を手動で共有してください。</p>{/if}
    {#if data.issuers.length > 1}
      <p class="cred-access">アクセス: {form.accessNames && form.accessNames.length > 0 ? form.accessNames.join("・") : "全社"}</p>
    {/if}
    <pre class="cred-box">{credText(form.cred)}</pre>
    <button class="btn btn-primary btn-sm" on:click={() => copy(form.cred)}>{copied ? "コピーしました ✓" : "コピー"}</button>
  </div>
{/if}

<div class="layout">
  <div class="main">
    {#if data.members.length === 0}
      <div class="empty">メンバーがまだいません。</div>
    {:else}
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>メンバー</th><th>権限</th><th>状態</th><th></th></tr></thead>
          <tbody>
            {#each data.members as m}
              {#if editId === m.id}
                <tr class="editrow">
                  <td colspan="4">
                    <form method="POST" action="?/update" class="eform" use:enhance={() => async ({ update }) => { await update({ reset: false }); editId = null; }}>
                      <input type="hidden" name="id" value={m.id} />
                      <label class="ef"><span>名前</span><input class="input" name="name" value={m.name} required /></label>
                      <label class="ef"><span>メール</span><input class="input" type="email" name="email" value={m.email ?? ""} /></label>
                      <label class="ef"><span>権限</span>
                        <select class="input" name="role">
                          <option value="member" selected={m.role === "member"}>member</option>
                          <option value="viewer" selected={m.role === "viewer"}>viewer（閲覧のみ）</option>
                          <option value="owner" selected={m.role === "owner"}>owner</option>
                        </select>
                      </label>
                      {#if m.role === "owner"}
                        <label class="ef payroll"><span>給与閲覧</span><span class="always">常に可（オーナー）</span></label>
                      {:else}
                        <label class="ef payroll pchk">
                          <input type="checkbox" name="can_view_payroll" checked={m.can_view_payroll === 1} />
                          <span>給与・人件費の閲覧を許可（PL全体・経費の給与系が見える）</span>
                        </label>
                      {/if}
                      <div class="ef-act">
                        <button class="btn btn-primary btn-sm" type="submit">保存</button>
                        <button class="btn btn-quiet btn-sm" type="button" on:click={() => (editId = null)}>キャンセル</button>
                      </div>
                    </form>
                  </td>
                </tr>
              {:else}
                <tr>
                  <td>
                    <div class="mcell">
                      <span class="avatar" aria-hidden="true">{initial(m.name)}</span>
                      <span class="minfo">
                        <span class="mname">{m.name}</span>
                        <span class="memail">{m.email ?? "—"}</span>
                      </span>
                    </div>
                  </td>
                  <td>
                    <span class="chip {roleBadge(m.role).cls}">{roleBadge(m.role).label}</span>
                    {#if m.role !== "owner" && m.role !== "demo" && m.can_view_payroll === 1}
                      <span class="chip chip-payroll" title="給与・人件費（PL・経費の給与系）を閲覧できます">給与閲覧可</span>
                    {/if}
                  </td>
                  <td class="statecell">
                    {#if m.status === "active"}<span class="chip chip-paid">有効</span>
                    {:else}<span class="chip chip-draft">停止</span>{/if}
                    {#if m.must_change_password}<span class="chip chip-sent">初期PW</span>{/if}
                  </td>
                  <td class="r rowacts">
                    <button class="btn btn-quiet btn-sm" type="button" on:click={() => (editId = m.id)}>編集</button>
                    {#if m.id !== data.me?.id}
                      <form method="POST" action="?/delete" on:submit={(e) => { if (!confirm(`${m.name} を削除します。よろしいですか？`)) e.preventDefault(); }}><input type="hidden" name="id" value={m.id} /><button class="del" type="submit">削除</button></form>
                    {/if}
                  </td>
                </tr>
              {/if}
            {/each}
          </tbody>
        </table>
      </div>
    {/if}

    {#if data.issuers.length > 1}
      <section class="section access">
        <div class="section-head"><h2>会社別アクセス権限</h2></div>
        <p class="ahint">会社ごとに、閲覧を許可するメンバーを登録します。オーナーは常に全社。<b>どの会社にも未登録のメンバーは全社閲覧可</b>（後方互換）。税理士など複数社は各会社に登録してください。</p>
        {#each data.issuers as iss}
          {@const assigned = data.members.filter((m) => m.role !== "owner" && m.role !== "demo" && data.assign[m.id]?.includes(iss.id))}
          {@const addable = data.members.filter((m) => m.role !== "owner" && m.role !== "demo" && !data.assign[m.id]?.includes(iss.id))}
          <div class="acompany">
            <div class="acomp-name">{iss.name}</div>
            <div class="amembers">
              {#each assigned as m}
                <span class="achip">{m.name}
                  <form method="POST" action="?/removeAccess">
                    <input type="hidden" name="member_id" value={m.id} />
                    <input type="hidden" name="issuer_id" value={iss.id} />
                    <button class="achip-x" type="submit" aria-label="解除">×</button>
                  </form>
                </span>
              {:else}
                <span class="muted">登録メンバーなし</span>
              {/each}
            </div>
            <form method="POST" action="?/addAccess" class="aadd">
              <input type="hidden" name="issuer_id" value={iss.id} />
              <select class="input" name="member_id">
                <option value="">メンバーを追加…</option>
                {#each addable as m}<option value={m.id}>{m.name}</option>{/each}
              </select>
              <button class="btn btn-quiet btn-sm" type="submit">追加</button>
            </form>
          </div>
        {/each}
        {#if data.members.filter((m) => m.role !== "owner" && m.role !== "demo").length === 0}
          <p class="muted">オーナー以外のメンバーがいません。招待後にここで会社へ登録できます。</p>
        {/if}
      </section>
    {/if}
  </div>
</div>

<dialog class="modal" bind:this={inviteDlg}>
  <div class="modal-head">
    <h2>メンバーを招待</h2>
    <button class="modal-x" type="button" on:click={() => inviteDlg.close()} aria-label="閉じる">×</button>
  </div>
  <form class="modal-body" method="POST" action="?/invite">
    {#if form?.error}<p class="flash-err">{form.error}</p>{/if}
    <div class="field"><span class="lab">名前</span><input class="input" name="name" required /></div>
    <div class="field"><span class="lab">メール</span><input class="input" type="email" name="email" required /></div>
    <div class="field"><span class="lab">権限</span>
      <div class="rolecards">
        <label class="rolecard" class:sel={inviteRole === "member"}>
          <input type="radio" name="role" value="member" bind:group={inviteRole} />
          <span class="rc-body">
            <span class="rc-title">メンバー</span>
            <span class="rc-desc">帳票の作成・編集、入出金の記録ができます。設定とメンバー管理は不可。</span>
          </span>
        </label>
        <label class="rolecard" class:sel={inviteRole === "viewer"}>
          <input type="radio" name="role" value="viewer" bind:group={inviteRole} />
          <span class="rc-body">
            <span class="rc-title">閲覧のみ</span>
            <span class="rc-desc">閲覧とPDF・CSV出力のみ。税理士・監査など外部関係者の招待に。数字の確認はすべて可能で、変更は一切できません。</span>
          </span>
        </label>
        <label class="rolecard" class:sel={inviteRole === "owner"}>
          <input type="radio" name="role" value="owner" bind:group={inviteRole} />
          <span class="rc-body">
            <span class="rc-title">オーナー</span>
            <span class="rc-desc">すべての機能＋設定・メンバー管理。</span>
          </span>
        </label>
      </div>
    </div>
    <p class="rolehint">税理士に入出金の消込や修正まで任せる場合は member を選んでください。viewer は入力が必要になったら後から変更できます。</p>
    {#if data.issuers.length > 1 && inviteRole !== "owner"}
      <div class="field">
        <span class="lab">アクセスを許可する会社</span>
        <div class="acc-list">
          {#each data.issuers as iss}
            <label class="acc-item">
              <input type="checkbox" name="access_issuers" value={iss.id} />
              <span>{iss.name}</span>
            </label>
          {/each}
        </div>
        <p class="acc-hint">未選択の場合は全社にアクセスできます。外部関係者（税理士など）には見せたい会社だけを選んでください。</p>
      </div>
    {/if}
    {#if data.mailEnabled}
      <label class="sendmail"><input type="checkbox" name="send_mail" checked /><span>招待メールを本人に送る（ログイン情報を記載）</span></label>
    {:else}
      <p class="sendmail-muted">メール未連携のため、発行されるログイン情報をコピーして本人に共有してください。（設定 ▸ API/連携 で連携できます）</p>
    {/if}
    <button class="btn btn-primary" type="submit" style="width:100%">初期パスワードを発行</button>
  </form>
</dialog>

<style>
  .head-acts { display: flex; align-items: center; gap: 8px; }
  .note { background: var(--primary-soft); border: 1px solid #cfe0fb; color: var(--primary-d); padding: 10px 14px; border-radius: var(--radius-sm); font-size: 13px; }
  .cred { background: var(--surface); border: 1px solid var(--green); border-radius: var(--radius); padding: 16px; margin-bottom: 16px; }
  .cred-h { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .cred-box { background: var(--surface-2); border: 1px solid var(--line); border-radius: 8px; padding: 12px; font-size: 13px; white-space: pre-wrap; margin: 0 0 10px; }
  .layout { display: block; }

  /* メンバーセル: アバター＋名前＋メール */
  .mcell { display: flex; align-items: center; gap: 12px; }
  .avatar {
    width: 32px; height: 32px; flex: none; border-radius: 50%;
    background: var(--grad); color: #fff; font-weight: 800; font-size: 14px;
    display: grid; place-items: center; text-transform: uppercase; line-height: 1;
  }
  .minfo { display: flex; flex-direction: column; line-height: 1.35; min-width: 0; }
  .mname { font-weight: 700; }
  .memail { font-size: 12px; color: var(--muted); }
  /* td自体をflexにするとtable-cellでなくなり縦がズレるので、tdは素のまま中身で整える */
  .statecell { white-space: nowrap; }
  .statecell .chip { vertical-align: middle; }
  .statecell .chip + .chip { margin-left: 6px; }
  /* 行の高さを締める＋全セルを垂直中央に */
  .table tbody td { padding-top: 8px; padding-bottom: 8px; vertical-align: middle; }

  /* 招待モーダル: ロール選択のラジオカード */
  .rolecards { display: flex; flex-direction: column; gap: 8px; }
  .rolecard {
    display: flex; align-items: flex-start; gap: 10px;
    border: 1px solid var(--line); border-radius: 10px; padding: 11px 12px;
    cursor: pointer; transition: border-color 0.12s, background 0.12s;
  }
  .rolecard.sel { border-color: var(--primary); background: var(--primary-soft); }
  .rolecard input[type="radio"] { width: 15px; height: 15px; margin-top: 2px; flex: none; }
  .rc-body { display: flex; flex-direction: column; gap: 3px; }
  .rc-title { font-weight: 700; font-size: 14px; }
  .rc-desc { font-size: 12px; color: var(--muted); line-height: 1.5; }
  .rolehint { font-size: 12px; color: var(--muted); line-height: 1.6; margin: 4px 0 4px; }
  /* 招待メール送信チェック */
  .sendmail { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: var(--ink); cursor: pointer; margin: 2px 0 6px; }
  .sendmail input[type="checkbox"] { width: 15px; height: 15px; margin-top: 2px; flex: none; }
  .sendmail-muted { font-size: 12px; color: var(--muted); line-height: 1.6; margin: 2px 0 6px; }
  .cred-note { font-size: 12px; color: var(--muted); margin: 0 0 8px; }
  .cred-access { font-size: 13px; color: var(--ink); margin: 0 0 8px; }
  /* 招待モーダル: アクセスを許可する会社 */
  .acc-list { display: flex; flex-direction: column; gap: 6px; }
  .acc-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--ink); cursor: pointer; }
  .acc-item input[type="checkbox"] { width: 15px; height: 15px; flex: none; }
  .acc-hint { font-size: 12px; color: var(--muted); line-height: 1.6; margin: 6px 0 0; }

  .del { background: var(--red-soft); color: var(--red); border: none; border-radius: 6px; padding: 5px 10px; cursor: pointer; font-size: 13px; vertical-align: middle; }
  .rowacts { white-space: nowrap; text-align: right; }
  .rowacts .btn { vertical-align: middle; }
  .rowacts form { display: inline-block; margin: 0 0 0 8px; vertical-align: middle; }
  .eform { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; padding: 4px 0; }
  .ef { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--muted); }
  .ef .input { font-size: 13px; }
  .ef-act { display: flex; gap: 8px; }
  /* 給与閲覧チップ（許可時のみ表示・小さい緑） */
  .chip-payroll { margin-left: 6px; background: var(--green-soft, #e3f4ea); color: var(--green, #1a7f47); font-size: 11px; font-weight: 700; }
  /* 編集フォーム：給与閲覧許可のチェック */
  .ef.payroll { max-width: 320px; }
  .ef.payroll.pchk { flex-direction: row; align-items: center; gap: 8px; color: var(--ink); font-size: 13px; }
  .ef.payroll.pchk input[type="checkbox"] { width: 15px; height: 15px; flex: none; }
  .ef.payroll .always { font-size: 13px; color: var(--ink-2); font-weight: 600; }
  .editrow { background: var(--surface-2); }
  .access { margin-top: 16px; }
  .ahint { font-size: 12px; color: var(--muted); margin: 0 0 12px; line-height: 1.6; }
  .acompany { padding: 12px 0; border-top: 1px solid var(--line-2); }
  .acomp-name { font-weight: 700; margin-bottom: 8px; }
  .amembers { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 8px; }
  .achip { display: inline-flex; align-items: center; gap: 4px; background: var(--primary-soft); color: var(--primary-d); border-radius: 999px; padding: 3px 6px 3px 12px; font-size: 13px; font-weight: 700; }
  .achip form { display: inline; }
  .achip-x { background: none; border: none; color: var(--primary-d); cursor: pointer; font-size: 14px; line-height: 1; padding: 0 2px; }
  .achip-x:hover { color: var(--red); }
  .aadd { display: flex; gap: 8px; align-items: center; }
  .aadd .input { max-width: 220px; font-size: 13px; }
  .muted { color: var(--muted); font-size: 13px; }
</style>
