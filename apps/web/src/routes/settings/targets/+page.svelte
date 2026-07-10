<script>
  import { formatYen } from "@invoice-harness/shared";
  export let data;
  export let form;

  // 目標を ym→amount で引ける形に
  $: tmap = (() => {
    const m = {};
    for (const t of data.targets) m[`${t.scope_type}_${t.scope_id}_${t.ym}`] = t.amount;
    return m;
  })();
  const val = (scope, id, ym) => tmap[`${scope}_${id}_${ym}`] ?? "";

  // 各scopeの年間計（入力中はライブ更新）
  let vals = {};
  const rowKey = (scope, id) => `${scope}_${id}`;
  function rowTotal(scope, id) {
    let sum = 0;
    for (const m of data.months) {
      const k = `t_${scope}_${id}_${m.ym}`;
      const raw = vals[k];
      const n = raw != null ? Number(String(raw).replace(/[^0-9]/g, "")) : (tmap[`${scope}_${id}_${m.ym}`] ?? 0);
      sum += n || 0;
    }
    return sum;
  }
  // 年間額を12等分して各月に配分するヘルパ
  function spread(scope, id, node) {
    const raw = node.previousElementSibling.querySelector("input");
    const annual = Number(String(raw.value).replace(/[^0-9]/g, "")) || 0;
    if (!annual) return;
    const per = Math.floor(annual / 12);
    for (const m of data.months) {
      const k = `t_${scope}_${id}_${m.ym}`;
      vals = { ...vals, [k]: String(per) };
      const el = document.querySelector(`input[name="${CSS.escape(k)}"]`);
      if (el) el.value = String(per);
    }
  }
</script>

<div class="page-head">
  <h1 class="page-title">売上目標<span class="tag">{data.periodLabel}</span></h1>
  <div class="fynav">
    <a class="btn btn-quiet btn-sm" href={`/settings/targets?fy=${data.fy - 1}&fm=${data.fiscalMonth}`}>← 前年度</a>
    {#if data.fy !== data.current}<a class="btn btn-quiet btn-sm" href={`/settings/targets?fm=${data.fiscalMonth}`}>今年度</a>{/if}
    <a class="btn btn-quiet btn-sm" href={`/settings/targets?fy=${data.fy + 1}&fm=${data.fiscalMonth}`}>翌年度 →</a>
  </div>
</div>
<p class="hint">
  会社・部門ごとに<b>月次の売上目標（税込）</b>を入力します（PLの月次計画のイメージ）。収支一覧の目標バー・月次推移の目標ラインに反映されます。
  空欄・0で目標なし。「年額を12分割」で均等配分できます。
</p>

<div class="modeswitch">
  <a class="ms" class:on={!data.calendar} href={`/settings/targets?fy=${data.fy}`}>決算期（{data.fiscalMonth}月締め）</a>
  <a class="ms" class:on={data.calendar} href={`/settings/targets?fy=${data.fy}&fm=1`}>暦年（1〜12月）</a>
</div>

{#if form?.ok}<p class="flash-ok">保存しました。</p>{/if}

<form method="POST" action="?/save">
  <input type="hidden" name="fy" value={data.fy} />

  {#each [{ type: "company", label: "会社", rows: data.issuers }, { type: "division", label: "部門", rows: data.divisions }] as grp}
    {#if grp.rows.length}
      <div class="gtitle">{grp.label}の目標</div>
      <div class="gridwrap">
        <table class="ttable">
          <thead>
            <tr>
              <th class="sticky nm">{grp.label}</th>
              <th class="r annual">年間計</th>
              <th class="r tools"></th>
              {#each data.months as m}<th class="r mo">{m.label}</th>{/each}
            </tr>
          </thead>
          <tbody>
            {#each grp.rows as row}
              <tr>
                <th class="sticky nm">
                  {row.name}
                  {#if grp.type === "division" && row.issuer_id}<span class="sub">{data.issuers.find((i) => i.id === row.issuer_id)?.name ?? ""}</span>{/if}
                </th>
                <td class="r annual num">{formatYen(rowTotal(grp.type, row.id))}</td>
                <td class="r tools">
                  <span class="spreadwrap">
                    <input class="input spin" inputmode="numeric" placeholder="年額" aria-label="年額を12分割" />
                    <button type="button" class="btn btn-quiet btn-xs" on:click={(e) => spread(grp.type, row.id, e.currentTarget.parentElement)}>÷12</button>
                  </span>
                </td>
                {#each data.months as m}
                  <td class="mo">
                    <input
                      class="input min"
                      inputmode="numeric"
                      name={`t_${grp.type}_${row.id}_${m.ym}`}
                      value={val(grp.type, row.id, m.ym)}
                      on:input={(e) => (vals = { ...vals, [`t_${grp.type}_${row.id}_${m.ym}`]: e.currentTarget.value })}
                      placeholder="0"
                    />
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/each}

  <button class="btn btn-primary" type="submit" style="margin-top:16px">保存</button>
</form>

<style>
  .hint { color: var(--ink-2); font-size: 13px; margin-top: -8px; line-height: 1.7; }
  .fynav { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .modeswitch { display: inline-flex; border: 1px solid var(--line); border-radius: 999px; overflow: hidden; margin-bottom: 14px; }
  .ms { padding: 6px 14px; font-size: 13px; font-weight: 700; color: var(--ink-2); text-decoration: none; }
  .ms.on { background: var(--primary); color: #fff; }
  .gtitle { font-size: 14px; font-weight: 800; margin: 18px 0 8px; padding-left: 10px; border-left: 3px solid var(--primary); }
  .gridwrap { overflow-x: auto; border: 1px solid var(--line); border-radius: var(--radius); background: var(--surface); -webkit-overflow-scrolling: touch; }
  .ttable { border-collapse: collapse; }
  .ttable th, .ttable td { padding: 6px 8px; border-bottom: 1px solid var(--line-2); white-space: nowrap; }
  .ttable thead th { background: var(--surface-2); font-size: 11px; color: var(--muted); font-weight: 700; position: sticky; top: 0; }
  .ttable .sticky { position: sticky; left: 0; background: var(--surface); z-index: 2; }
  .ttable thead .sticky { z-index: 3; }
  .nm { text-align: left; min-width: 140px; font-size: 13px; font-weight: 700; }
  .nm .sub { display: block; font-size: 10px; color: var(--muted); font-weight: 400; }
  .annual { min-width: 110px; font-weight: 800; color: var(--primary-d); }
  .mo { min-width: 92px; }
  .input.min { width: 88px; text-align: right; padding: 6px 8px; font-size: 13px; }
  .spreadwrap { display: inline-flex; gap: 4px; align-items: center; }
  .input.spin { width: 84px; text-align: right; padding: 6px 8px; font-size: 12px; }
  .btn-xs { padding: 5px 8px; font-size: 12px; }
</style>
