<script>
  export let data;
  export let form;
</script>

<div class="page-head"><h1 class="page-title">自社情報</h1></div>
<p class="hint">帳票に表示される発行元（自社名・登録番号・住所・<b>振込先</b>）を設定します。</p>
{#if form?.error}<p class="flash-err">{form.error}</p>{/if}
{#if form?.ok}<p class="flash-ok">保存しました。</p>{/if}

{#each data.issuers as iss}
  <form class="section" method="POST" action="?/update">
    <div class="section-head"><h2>{iss.name}</h2></div>
    <input type="hidden" name="id" value={iss.id} />
    <div class="grid2">
      <div class="field"><span class="lab">自社名</span><input class="input" name="name" value={iss.name} required /></div>
      <div class="field"><span class="lab">発行者名（担当者名）</span><input class="input" name="person_name" value={iss.person_name ?? ""} placeholder="営業部 山田太郎" /></div>
      <div class="field"><span class="lab">登録番号（インボイス）</span><input class="input" name="registration_number" value={iss.registration_number ?? ""} placeholder="T1234567890123" /></div>
      <div class="field"><span class="lab">郵便番号</span><input class="input" name="postal_code" value={iss.postal_code ?? ""} /></div>
      <div class="field"><span class="lab">TEL</span><input class="input" name="tel" value={iss.tel ?? ""} /></div>
      <div class="field"><span class="lab">メール</span><input class="input" name="email" value={iss.email ?? ""} /></div>
    </div>
    <div class="field"><span class="lab">住所</span><textarea class="input" name="address" rows="2" placeholder="〒100-0001 東京都千代田区千代田1-1-1&#10;サンプルビル10F">{iss.address ?? ""}</textarea><span class="sub">長い住所は改行できます（市区町村・建物名で改行など）。</span></div>
    <div class="field"><span class="lab">振込先</span><textarea class="input" name="bank_info" rows="2" placeholder="みずほ銀行 ○○支店 普通 1234567&#10;カ）○○">{iss.bank_info ?? ""}</textarea><span class="sub">複数行で入力できます。</span></div>
    <button class="btn btn-primary" type="submit">保存</button>
  </form>
{/each}

<details class="section">
  <summary>発行元を追加</summary>
  <form method="POST" action="?/create" class="addnew">
    <div class="grid2">
      <div class="field"><span class="lab">自社名</span><input class="input" name="name" required /></div>
      <div class="field"><span class="lab">発行者名（担当者名）</span><input class="input" name="person_name" placeholder="営業部 山田太郎" /></div>
      <div class="field"><span class="lab">登録番号</span><input class="input" name="registration_number" placeholder="T1234567890123" /></div>
      <div class="field"><span class="lab">郵便番号</span><input class="input" name="postal_code" /></div>
      <div class="field"><span class="lab">TEL</span><input class="input" name="tel" /></div>
      <div class="field"><span class="lab">メール</span><input class="input" name="email" /></div>
    </div>
    <div class="field"><span class="lab">住所</span><textarea class="input" name="address" rows="2" placeholder="〒100-0001 東京都千代田区千代田1-1-1&#10;サンプルビル10F"></textarea></div>
    <div class="field"><span class="lab">振込先</span><textarea class="input" name="bank_info" rows="2"></textarea></div>
    <button class="btn btn-quiet" type="submit">追加する</button>
  </form>
</details>

<style>
  .hint { color: var(--ink-2); font-size: 13px; margin-top: -8px; }
  .sub { color: var(--muted); font-size: 11px; margin-top: 4px; display: block; }
  form { max-width: 760px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
  @media (max-width: 640px) { .grid2 { grid-template-columns: 1fr; } }
  summary { font-weight: 700; cursor: pointer; }
  .addnew { margin-top: 14px; }
</style>
