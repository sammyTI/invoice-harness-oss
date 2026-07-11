<script>
  import { onMount } from "svelte";
  import { formatYen } from "@invoice-harness/shared";
  import { page } from "$app/stores";
  export let data;
  export let form;
  // viewer（閲覧のみ）は作成系UIを非表示
  $: isViewer = $page.data.user?.role === "viewer";
  let clientSel = data.presetClient || (data.clients[0]?.id ?? "");

  // 状態: 提案中 → 進行中 → 完了
  const ST = {
    proposed: { label: "提案中", cls: "chip-sent" },
    active: { label: "進行中", cls: "chip-issued" },
    done: { label: "完了", cls: "chip-paid" },
  };
  const st = (s) => ST[s] ?? ST.active;

  let dlg;
  const openCreate = () => dlg?.showModal();
  // 顧客ページの「＋プロジェクトを作成」から来たときは自動で開く
  onMount(() => { if (data.presetClient || form?.error) dlg?.showModal(); });
</script>

<div class="page-head">
  <h1 class="page-title">プロジェクト</h1>
  {#if !isViewer}<button class="btn btn-primary" type="button" on:click={openCreate} title="プロジェクトを作成">＋ 新規作成</button>{/if}
</div>
<p class="hint">顧客ごとの案件に、請求書・見積書・支払（発注/支払通知）を紐づけて収支（粗利）を管理します。</p>

<form class="searchbar" method="GET">
  <input class="input fq" name="q" value={data.q} placeholder="案件名・顧客名・担当者で検索" />
  <select class="input fsel" name="st">
    <option value="">すべての状態</option>
    <option value="proposed" selected={data.st === "proposed"}>提案中</option>
    <option value="active" selected={data.st === "active"}>進行中</option>
    <option value="done" selected={data.st === "done"}>完了</option>
  </select>
  <button class="btn btn-quiet btn-sm" type="submit">絞り込み</button>
  {#if data.q || data.st}<a class="btn btn-quiet btn-sm" href="/projects">クリア</a>{/if}
</form>

{#if data.projects.length === 0}
  <div class="empty">
    {data.q || data.st ? "条件に一致するプロジェクトがありません。" : "プロジェクトがまだありません。"}
    {#if !isViewer}<div style="margin-top:12px"><button class="btn btn-primary btn-sm" type="button" on:click={openCreate} title="プロジェクトを作成">＋ 新規作成</button></div>{/if}
  </div>
{:else}
  <div class="table-wrap">
    <table class="table">
      <thead><tr><th>案件名</th><th>顧客</th><th>状態</th><th class="r">請求</th><th class="r">支払</th><th class="r">粗利</th></tr></thead>
      <tbody>
        {#each data.projects as p}
          <tr class:done={p.status === "done"}>
            <td>
              <a class="pname" href={`/projects/${p.id}`}>{p.name}</a>
              <div class="sub num">{p.start_date ?? ""}{p.end_date ? ` 〜 ${p.end_date}` : ""}{p.division_name ? `・${p.division_name}` : ""}</div>
            </td>
            <td>{p.client_name}</td>
            <td><span class="chip {st(p.status).cls}">{st(p.status).label}</span></td>
            <td class="r num">{formatYen(p.revenue)}</td>
            <td class="r num">{formatYen(p.expense)}</td>
            <td class="r num profit" class:neg={p.profit < 0}>{formatYen(p.profit)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<dialog class="modal" bind:this={dlg}>
  <div class="modal-head">
    <h2>プロジェクトを作成</h2>
    <button class="modal-x" type="button" on:click={() => dlg.close()} aria-label="閉じる">×</button>
  </div>
  <form class="modal-body" method="POST" action="?/create">
    {#if form?.error}<p class="flash-err">{form.error}</p>{/if}
    <div class="field"><span class="lab">案件名</span><input class="input" name="name" required placeholder="例: ○○周年記念式典映像制作" /></div>
    <div class="field"><span class="lab">顧客</span>
      <select class="input" name="client_id" bind:value={clientSel} required>
        {#each data.clients as c}<option value={c.id}>{c.name}</option>{/each}
      </select>
    </div>
    {#if data.issuers.length > 1}
      <div class="field"><span class="lab">自社（発行元）</span>
        <select class="input" name="issuer_id"><option value="">（未指定）</option>{#each data.issuers as i}<option value={i.id}>{i.name}</option>{/each}</select>
      </div>
    {/if}
    {#if data.divisions.length}
      <div class="field"><span class="lab">計上区分（部門）</span>
        <select class="input" name="division_id"><option value="">（未設定）</option>{#each data.divisions as d}<option value={d.id}>{d.name}</option>{/each}</select>
      </div>
    {/if}
    <div class="field"><span class="lab">状態</span>
      <select class="input" name="status">
        <option value="proposed">提案中</option>
        <option value="active" selected>進行中</option>
        <option value="done">完了</option>
      </select>
    </div>
    <div class="field"><span class="lab">担当者</span>
      <input class="input" name="person" list="memberlist" placeholder="メンバーから選択 or 自由入力" />
      <datalist id="memberlist">{#each data.members as m}<option value={m}></option>{/each}</datalist>
    </div>
    <div class="field"><span class="lab">開始日</span><input class="input" type="date" name="start_date" /></div>
    <div class="field"><span class="lab">詳細</span><textarea class="input" name="detail" rows="2" placeholder="案件メモ"></textarea></div>
    <button type="submit" class="btn btn-primary" style="width:100%">作成する</button>
  </form>
</dialog>

<style>
  .hint { color: var(--ink-2); font-size: 13px; margin-top: -8px; }
  .searchbar { display: flex; gap: 8px; align-items: center; margin: 12px 0 14px; flex-wrap: wrap; }
  .searchbar .fq { max-width: 280px; }
  .searchbar .fsel { width: auto; font-size: 13px; }
  .pname { font-weight: 700; }
  .sub { font-size: 11px; color: var(--muted); margin-top: 2px; }
  .profit { font-weight: 700; white-space: nowrap; }
  .profit.neg { color: var(--red); }
  tr.done td { opacity: 0.65; }
</style>
