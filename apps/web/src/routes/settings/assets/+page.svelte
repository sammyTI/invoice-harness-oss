<script>
  export let data;
  export let form;
</script>

<div class="page-head"><h1 class="page-title">社印・ロゴ</h1></div>

{#if !data.r2}
  <p class="note">R2 バケット未設定です。ローカルでは <code>wrangler.toml</code> の <code>[[r2_buckets]]</code>、本番では <code>wrangler r2 bucket create invoice-harness-assets</code> が必要です。</p>
{/if}
{#if form?.error}<p class="flash-err">{form.error}</p>{/if}
{#if form?.ok}<p class="flash-ok">{form.kind === "logo" ? "ロゴ" : "社印"}をアップロードしました。帳票プレビューに反映されます。</p>{/if}

<div class="grid">
  {#each data.issuers as iss}
    <section class="section">
      <div class="section-head"><h2>{iss.name}</h2></div>
      <div class="assets">
        <div class="asset">
          <div class="lbl">ロゴ</div>
          {#if iss.logo_key}<img src={iss.logo_key} alt="ロゴ" />{:else}<div class="ph">未設定</div>{/if}
          <form method="POST" action="?/upload" enctype="multipart/form-data">
            <input type="hidden" name="issuer_id" value={iss.id} />
            <input type="hidden" name="kind" value="logo" />
            <input class="file" type="file" name="file" accept="image/*" required />
            <button class="btn btn-quiet btn-sm" type="submit">アップロード</button>
          </form>
        </div>
        <div class="asset">
          <div class="lbl">社印</div>
          {#if iss.seal_key}<img src={iss.seal_key} alt="社印" />{:else}<div class="ph">未設定</div>{/if}
          <form method="POST" action="?/upload" enctype="multipart/form-data">
            <input type="hidden" name="issuer_id" value={iss.id} />
            <input type="hidden" name="kind" value="seal" />
            <input class="file" type="file" name="file" accept="image/*" required />
            <button class="btn btn-quiet btn-sm" type="submit">アップロード</button>
          </form>
        </div>
      </div>
    </section>
  {/each}
</div>

<style>
  .note { background: var(--amber-soft); border: 1px solid #f0dcae; color: #8a5a13; padding: 10px 14px; border-radius: var(--radius-sm); font-size: 13px; }
  .grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
  .assets { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  @media (max-width: 600px) { .assets { grid-template-columns: 1fr; } }
  .asset { display: flex; flex-direction: column; gap: 8px; }
  .lbl { font-size: 13px; font-weight: 700; color: var(--ink-2); }
  .asset img { width: 90px; height: 90px; object-fit: contain; border: 1px solid var(--line); border-radius: 8px; padding: 4px; background: #fff; }
  .ph { width: 90px; height: 90px; display: grid; place-items: center; border: 1px dashed var(--line); border-radius: 8px; color: var(--muted); font-size: 12px; }
  .file { font-size: 13px; }
</style>
