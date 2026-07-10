<script>
  export let data;
  export let form;
  $: t = (scope, id) => data.targets.find((x) => x.scope_type === scope && x.scope_id === id)?.amount ?? "";
</script>

<div class="page-head">
  <h1 class="page-title">売上目標<span class="tag">{data.fy}年度</span></h1>
  <div class="fynav">
    <a class="btn btn-quiet btn-sm" href={`/settings/targets?fy=${data.fy - 1}`}>← 前年度</a>
    {#if data.fy !== data.current}<a class="btn btn-quiet btn-sm" href="/settings/targets">今年度</a>{/if}
    <a class="btn btn-quiet btn-sm" href={`/settings/targets?fy=${data.fy + 1}`}>翌年度 →</a>
  </div>
</div>
<p class="hint">会社ごと・部門ごとの年間売上目標（税込）。収支一覧に実績との達成率が表示されます。空欄または0で目標なし。</p>
{#if form?.ok}<p class="flash-ok">保存しました。</p>{/if}

<form class="section" method="POST" action="?/save">
  <input type="hidden" name="fy" value={data.fy} />

  <div class="section-head"><h2>会社の目標</h2></div>
  {#each data.issuers as iss}
    <div class="trow">
      <span class="tname">{iss.name}</span>
      <span class="tin"><span class="yen">¥</span><input class="input num" inputmode="numeric" name={`target_company_${iss.id}`} value={t("company", iss.id)} placeholder="0" /></span>
    </div>
  {/each}

  {#if data.divisions.length}
    <div class="section-head" style="margin-top:18px"><h2>部門の目標</h2></div>
    {#each data.divisions as dv}
      <div class="trow">
        <span class="tname">{dv.name}{#if dv.issuer_id}<span class="tsub">{data.issuers.find((i) => i.id === dv.issuer_id)?.name ?? ""}</span>{/if}</span>
        <span class="tin"><span class="yen">¥</span><input class="input num" inputmode="numeric" name={`target_division_${dv.id}`} value={t("division", dv.id)} placeholder="0" /></span>
      </div>
    {/each}
  {/if}

  <button class="btn btn-primary" type="submit" style="margin-top:16px">保存</button>
</form>

<style>
  .hint { color: var(--ink-2); font-size: 13px; margin-top: -8px; }
  .fynav { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  form { max-width: 560px; }
  .trow { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 8px 0; border-bottom: 1px dashed var(--line); }
  .tname { font-weight: 700; font-size: 14px; }
  .tsub { display: block; font-size: 11px; color: var(--muted); font-weight: 400; }
  .tin { display: flex; align-items: center; gap: 6px; }
  .tin .input { width: 160px; text-align: right; }
  .yen { color: var(--muted); }
</style>
