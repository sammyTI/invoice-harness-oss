<script>
  export let data;
  export let form;

  let editId = null;
  let copied = false;
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

<div class="page-head"><h1 class="page-title">メンバー</h1></div>

<p class="note">
  招待すると<b>初期パスワード</b>を発行します。{#if data.mailEnabled}メール連携済みのため本人にメール送信されます。{:else}メール未連携なので、表示される<b>ログイン情報をコピー</b>して本人にお渡しください。{/if}
  本人は初回ログイン後にパスワードを自分で設定します。owner のみがこの画面を操作できます。
</p>
{#if form?.error}<p class="flash-err">{form.error}</p>{/if}

{#if form?.cred}
  <div class="cred">
    <div class="cred-h">
      <b>ログイン情報を発行しました</b>
      {#if form.emailed}<span class="chip chip-paid">メール送信済み</span>{:else}<span class="chip chip-sent">本人へ手動で共有してください</span>{/if}
    </div>
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
          <thead><tr><th>名前</th><th>メール</th><th>権限</th><th>状態</th><th></th></tr></thead>
          <tbody>
            {#each data.members as m}
              {#if editId === m.id}
                <tr class="editrow">
                  <td colspan="5">
                    <form method="POST" action="?/update" class="eform" on:submit={() => (editId = null)}>
                      <input type="hidden" name="id" value={m.id} />
                      <label class="ef"><span>名前</span><input class="input" name="name" value={m.name} required /></label>
                      <label class="ef"><span>メール</span><input class="input" type="email" name="email" value={m.email ?? ""} /></label>
                      <label class="ef"><span>権限</span>
                        <select class="input" name="role">
                          <option value="member" selected={m.role === "member"}>member</option>
                          <option value="owner" selected={m.role === "owner"}>owner</option>
                        </select>
                      </label>
                      <div class="ef-act">
                        <button class="btn btn-primary btn-sm" type="submit">保存</button>
                        <button class="btn btn-quiet btn-sm" type="button" on:click={() => (editId = null)}>キャンセル</button>
                      </div>
                    </form>
                  </td>
                </tr>
              {:else}
                <tr>
                  <td><b>{m.name}</b></td>
                  <td>{m.email ?? "—"}</td>
                  <td><span class="chip {m.role === 'owner' ? 'chip-paid' : 'chip-draft'}">{m.role}</span></td>
                  <td>
                    {#if m.must_change_password}<span class="chip chip-sent">初期PW</span>
                    {:else}<span class="chip chip-issued">有効</span>{/if}
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

  <form class="section" method="POST" action="?/invite">
    <div class="section-head"><h2>メンバーを招待</h2></div>
    <div class="field"><span class="lab">名前</span><input class="input" name="name" required /></div>
    <div class="field"><span class="lab">メール</span><input class="input" type="email" name="email" required /></div>
    <div class="field"><span class="lab">権限</span>
      <select class="input" name="role"><option value="member">member</option><option value="owner">owner</option></select>
    </div>
    <button class="btn btn-primary" type="submit" style="width:100%">初期パスワードを発行</button>
  </form>
</div>

<style>
  .note { background: var(--primary-soft); border: 1px solid #cfe0fb; color: var(--primary-d); padding: 10px 14px; border-radius: var(--radius-sm); font-size: 13px; }
  .cred { background: var(--surface); border: 1px solid var(--green); border-radius: var(--radius); padding: 16px; margin-bottom: 16px; }
  .cred-h { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .cred-box { background: var(--surface-2); border: 1px solid var(--line); border-radius: 8px; padding: 12px; font-size: 13px; white-space: pre-wrap; margin: 0 0 10px; }
  .layout { display: grid; grid-template-columns: minmax(0,1fr) 300px; gap: 20px; align-items: start; }
  @media (max-width: 860px) { .layout { grid-template-columns: 1fr; } }
  .del { background: var(--red-soft); color: var(--red); border: none; border-radius: 6px; padding: 5px 10px; cursor: pointer; font-size: 13px; }
  .rowacts { display: flex; gap: 8px; justify-content: flex-end; align-items: center; }
  .eform { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; padding: 4px 0; }
  .ef { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--muted); }
  .ef .input { font-size: 13px; }
  .ef-act { display: flex; gap: 8px; }
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
