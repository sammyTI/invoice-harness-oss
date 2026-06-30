<script>
  import { formatYen } from "@invoice-harness/shared";
  export let data;
  const B = [
    { key: "notDue", label: "未到来" },
    { key: "d0_30", label: "1〜30日" },
    { key: "d31_60", label: "31〜60日" },
    { key: "d61_90", label: "61〜90日" },
    { key: "d90", label: "91日〜" },
  ];
  const BL = { notDue: "未到来", d0_30: "1〜30日", d31_60: "31〜60日", d61_90: "61〜90日", d90: "91日〜" };
</script>

<div class="page-head"><h1 class="page-title">売掛金年齢表</h1></div>
<p class="hint">未入金の請求書を、期日からの経過日数で区分します（残額ベース）。</p>

<div class="cards">
  {#each B as b}
    <div class="card kc" class:warn={b.key === "d90"}>
      <span class="lab">{b.label}</span>
      <span class="val num">{formatYen(data.buckets[b.key])}</span>
    </div>
  {/each}
  <div class="card kc total"><span class="lab">未入金 合計</span><span class="val num">{formatYen(data.total)}</span></div>
</div>

{#if data.rows.length === 0}
  <div class="empty">未入金の請求書はありません。</div>
{:else}
  <div class="table-wrap">
    <table class="table">
      <thead><tr><th>取引先</th><th>番号</th><th>期日</th><th class="r">残額</th><th>区分</th></tr></thead>
      <tbody>
        {#each data.rows as r}
          <tr>
            <td><a class="cname" href={`/doc/${r.id}`}>{r.client_name}</a></td>
            <td class="num">{r.number}</td>
            <td class="num" class:over={r.overdue > 0}>{r.due_date ?? r.issue_date}{r.overdue > 0 ? `（+${r.overdue}日）` : ""}</td>
            <td class="r num">{formatYen(r.balance)}</td>
            <td><span class="chip {r.bucket === 'd90' ? 'chip-canceled' : r.bucket === 'notDue' ? 'chip-draft' : 'chip-sent'}">{BL[r.bucket]}</span></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<style>
  .hint { color: var(--ink-2); font-size: 13px; margin-top: -8px; }
  .cards { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 18px; }
  @media (max-width: 900px) { .cards { grid-template-columns: repeat(3, 1fr); } }
  .kc { padding: 12px 14px; display: flex; flex-direction: column; gap: 4px; }
  .kc .lab { font-size: 11px; color: var(--muted); }
  .kc .val { font-size: 18px; font-weight: 800; }
  .kc.warn .val { color: var(--red); }
  .kc.total { background: var(--primary-soft); border-color: #cfe0fb; }
  .kc.total .val { color: var(--primary-d); }
  .cname { font-weight: 700; }
  td.over { color: var(--red); }
</style>
