<script>
  export let data;
  const KIND = { document: "帳票送付", invite: "招待", dunning: "催促" };
</script>

<div class="page-head"><h1 class="page-title">送信履歴</h1></div>
<p class="hint">メール送付（帳票・招待・催促）の履歴です。</p>

{#if data.entries.length === 0}
  <div class="empty">送信履歴はまだありません。</div>
{:else}
  <div class="table-wrap">
    <table class="table">
      <thead><tr><th>日時</th><th>種別</th><th>宛先</th><th>件名</th><th>結果</th></tr></thead>
      <tbody>
        {#each data.entries as e}
          <tr>
            <td class="num">{e.created_at.replace("T", " ").slice(0, 16)}</td>
            <td>{KIND[e.kind] ?? e.kind}</td>
            <td>{e.recipient ?? "—"}</td>
            <td>{e.subject ?? ""}</td>
            <td>
              {#if e.ok}<span class="chip chip-paid">送信</span>
              {:else}<span class="chip chip-sent" title={e.detail ?? ""}>未送信</span>{/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<style>.hint { color: var(--ink-2); font-size: 13px; margin-top: -8px; }</style>
