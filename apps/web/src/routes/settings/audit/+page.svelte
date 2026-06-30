<script>
  export let data;
  export let form;
  const ACTION = {
    create: "作成", update: "更新", convert: "変換", send: "送付", pay: "入金", lock: "確定", cancel: "取消",
  };
</script>

<div class="page-head">
  <h1 class="page-title">監査ログ</h1>
  <form method="POST" action="?/verify"><button class="btn btn-primary" type="submit">改ざん検証</button></form>
</div>

<p class="hint">すべての作成・更新・確定・送付・入金をハッシュチェーンで記録します。改ざん検証で連結ハッシュを再計算し、改変がないか確認できます（電子帳簿保存法の真実性の確保に対応）。</p>

{#if form?.verify}
  {#if form.verify.ok}
    <p class="flash-ok">改ざんは検出されませんでした（{form.verify.count} 件すべて整合）。</p>
  {:else}
    <p class="flash-err">改ざんの可能性を検出しました（{form.verify.brokenAt} 付近 / 全{form.verify.count}件）。</p>
  {/if}
{/if}

{#if data.entries.length === 0}
  <div class="empty">監査ログはまだありません。</div>
{:else}
  <div class="table-wrap">
    <table class="table">
      <thead><tr><th>日時</th><th>操作</th><th>操作者</th><th>内容</th><th>chain hash</th></tr></thead>
      <tbody>
        {#each data.entries as e}
          <tr>
            <td class="num">{e.created_at.replace("T", " ").slice(0, 19)}</td>
            <td><span class="chip chip-issued">{ACTION[e.action] ?? e.action}</span></td>
            <td>{e.actor}</td>
            <td>{e.summary}</td>
            <td class="num hash">{e.chain_hash.slice(0, 16)}…</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<style>
  .hint { color: var(--ink-2); font-size: 13px; margin-top: -6px; }
  .hash { color: var(--muted); font-size: 12px; }
</style>
