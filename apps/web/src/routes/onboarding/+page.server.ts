import type { Actions, PageServerLoad } from "./$types";
import type { Settings } from "@invoice-harness/shared";
import { fail } from "@sveltejs/kit";
import {
  createIssuer,
  getDB,
  getSettings,
  listIssuers,
  updateIssuer,
  updateSettings,
  type IssuerInput,
} from "$lib/server/db";

// Step1 の入力を IssuerInput に整形する。
// オンボーディングでは事業者名・登録番号・決算月・振込先のみ扱い、
// 住所や担当者名などの詳細は後から /settings/issuer で補完する想定。
function parseIssuer(fd: FormData, prev?: Partial<IssuerInput>): IssuerInput {
  const entity_type = fd.get("entity_type") === "individual" ? "individual" : "corporate";
  // 決算月: 個人事業主は暦年(12)固定。法人は 1-12 の入力を採用（範囲外は null=全体設定）。
  const fiscal_month =
    entity_type === "individual"
      ? 12
      : ((): number | null => {
          const v = Number(fd.get("fiscal_month"));
          return Number.isInteger(v) && v >= 1 && v <= 12 ? v : null;
        })();
  return {
    name: String(fd.get("name") ?? "").trim(),
    entity_type,
    registration_number: String(fd.get("registration_number") ?? "").trim() || null,
    person_name: prev?.person_name ?? null,
    postal_code: prev?.postal_code ?? null,
    address: prev?.address ?? null,
    tel: prev?.tel ?? null,
    email: prev?.email ?? null,
    bank_info: String(fd.get("bank_info") ?? "").trim() || null,
    fiscal_month,
  };
}

export const load: PageServerLoad = async ({ platform }) => {
  const db = getDB(platform);
  const issuers = await listIssuers(db);
  const settings = await getSettings(db);
  // 既存の1件目をプリセット（自社情報は基本1件運用のため先頭を採用）。
  const iss = issuers[0] ?? null;
  return {
    issuer: iss
      ? {
          name: iss.name,
          entity_type: iss.entity_type ?? "corporate",
          registration_number: iss.registration_number ?? "",
          bank_info: iss.bank_info ?? "",
          fiscal_month: iss.fiscal_month ?? null,
        }
      : null,
    settings: {
      tax_display: settings.tax_display,
      withholding: settings.withholding,
      amount_rounding: settings.amount_rounding,
    },
  };
};

export const actions: Actions = {
  // Step1: 事業形態・自社情報を保存。issuer が1件以上あれば先頭を更新、無ければ新規作成。
  step1: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    const issuers = await listIssuers(db);
    const existing = issuers[0];
    const f = parseIssuer(fd, existing);
    if (!f.name) return fail(400, { step: 1, error: "事業者名は必須です。" });
    if (existing) await updateIssuer(db, existing.id, f);
    else await createIssuer(db, f);
    return { ok1: true };
  },

  // Step2: 帳票の基本設定（税表示・源泉徴収・端数処理）を settings に反映。
  // 他の設定項目は既存値を維持したまま3項目だけ更新する。
  step2: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    const cur = await getSettings(db);
    const next: Settings = {
      ...cur,
      tax_display: (fd.get("tax_display") as Settings["tax_display"]) ?? cur.tax_display,
      withholding: (fd.get("withholding") as Settings["withholding"]) ?? cur.withholding,
      amount_rounding: (fd.get("amount_rounding") as Settings["amount_rounding"]) ?? cur.amount_rounding,
    };
    await updateSettings(db, next);
    return { ok2: true };
  },
};
