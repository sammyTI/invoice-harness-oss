import type { Actions, PageServerLoad } from "./$types";
import { fail } from "@sveltejs/kit";
import {
  canViewPayroll,
  copyExpensesFromMonth,
  createExpense,
  deleteExpense,
  EXPENSE_CATEGORIES,
  getDB,
  getExpense,
  isConfidentialCategory,
  listDivisions,
  listExpenses,
  listIssuers,
} from "$lib/server/db";
import { allowedIssuerIds } from "$lib/server/access";

// 前月の YYYY-MM を返す。
function prevMonth(ym: string): string {
  const [y, mo] = ym.split("-").map(Number);
  return `${mo === 1 ? y - 1 : y}-${String(mo === 1 ? 12 : mo - 1).padStart(2, "0")}`;
}
function nextMonth(ym: string): string {
  const [y, mo] = ym.split("-").map(Number);
  return `${mo === 12 ? y + 1 : y}-${String(mo === 12 ? 1 : mo + 1).padStart(2, "0")}`;
}

export const load: PageServerLoad = async ({ platform, url, locals }) => {
  const db = getDB(platform);
  const allowed = await allowedIssuerIds(db, locals.user);
  const mayViewPayroll = await canViewPayroll(db, locals.user);

  let issuers = await listIssuers(db);
  if (allowed) issuers = issuers.filter((i) => allowed.includes(i.id));

  const issParam = url.searchParams.get("iss") ?? "";
  const issuerId = issuers.some((i) => i.id === issParam) ? issParam : "";

  const today = new Date().toISOString().slice(0, 10);
  const mParam = url.searchParams.get("m") ?? "";
  const month = /^\d{4}-\d{2}$/.test(mParam) ? mParam : today.slice(0, 7);

  // 会社フィルタ: 単一選択中はその会社、未選択は閲覧可能な全社（allowed）
  const filterIssuer = issuerId || undefined;
  let rows = await listExpenses(db, month, filterIssuer);
  // 全社表示（issuerId未指定）でも、allowed 制限があれば範囲外の会社を除外
  if (!filterIssuer && allowed) rows = rows.filter((e) => allowed.includes(e.issuer_id));

  // 閲覧権限が無ければ機微行（給与・法定福利費）を落とす
  const visible = mayViewPayroll ? rows : rows.filter((e) => e.confidential !== 1);
  const hiddenCount = mayViewPayroll ? 0 : rows.length - visible.length;
  const total = visible.reduce((a, e) => a + e.amount, 0);

  let divisions = await listDivisions(db);
  // 会社ひもづけのある部門は、その会社（または全社共通=null）だけ出す
  if (filterIssuer) divisions = divisions.filter((d) => !d.issuer_id || d.issuer_id === filterIssuer);

  return {
    month,
    prev: prevMonth(month),
    next: nextMonth(month),
    isCurrent: month === today.slice(0, 7),
    issuers: issuers.map((i) => ({ id: i.id, name: i.name })),
    issuerId,
    multiCompany: issuers.length > 1,
    expenses: visible.map((e) => ({
      id: e.id,
      category: e.category,
      label: e.label,
      amount: e.amount,
      division_id: e.division_id,
      confidential: e.confidential,
    })),
    total,
    hiddenCount,
    mayViewPayroll,
    categories: EXPENSE_CATEGORIES.map((c) => ({ key: c.key, label: c.label, confidential: c.confidential })),
    divisions: divisions.map((d) => ({ id: d.id, name: d.name })),
  };
};

// このユーザーが操作対象の会社を扱えるか（allowed=null は全社可）。
async function assertIssuerAllowed(
  db: Parameters<typeof allowedIssuerIds>[0],
  user: App.Locals["user"],
  issuerId: string
): Promise<boolean> {
  const allowed = await allowedIssuerIds(db, user);
  return allowed === null || allowed.includes(issuerId);
}

export const actions: Actions = {
  create: async ({ request, platform, locals }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    const category = String(fd.get("category") ?? "").trim();
    const issuer_id = String(fd.get("issuer_id") ?? "").trim();
    const ym = String(fd.get("ym") ?? "").trim();
    const label = String(fd.get("label") ?? "").trim() || null;
    const divisionRaw = String(fd.get("division_id") ?? "").trim();
    const division_id = divisionRaw || null;
    // 金額はカンマ・空白を除去してから数値化
    const amount = Math.round(Number(String(fd.get("amount") ?? "").replace(/[,\s　]/g, "")) || 0);

    if (!category || !issuer_id || !/^\d{4}-\d{2}$/.test(ym)) {
      return fail(400, { error: "科目・会社・計上月は必須です。" });
    }
    if (amount <= 0) return fail(400, { error: "金額を入力してください。" });
    if (!(await assertIssuerAllowed(db, locals.user, issuer_id))) return fail(403, { error: "権限がありません。" });
    // 給与系（機微科目）の登録は閲覧権限者のみ
    if (isConfidentialCategory(category) && !(await canViewPayroll(db, locals.user))) {
      return fail(403, { error: "給与・法定福利費の登録には閲覧権限が必要です。" });
    }
    await createExpense(db, { issuer_id, division_id, category, label, amount, ym });
    return { ok: true };
  },

  delete: async ({ request, platform, locals }) => {
    const db = getDB(platform);
    const id = String((await request.formData()).get("id") ?? "");
    const exp = await getExpense(db, id);
    if (!exp) return fail(404, { error: "対象が見つかりません。" });
    if (!(await assertIssuerAllowed(db, locals.user, exp.issuer_id))) return fail(403, { error: "権限がありません。" });
    // 給与系（機微）の削除は閲覧権限者のみ
    if (exp.confidential === 1 && !(await canViewPayroll(db, locals.user))) {
      return fail(403, { error: "給与・法定福利費の削除には閲覧権限が必要です。" });
    }
    await deleteExpense(db, id);
    return { ok: true };
  },

  copyPrev: async ({ request, platform, locals }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    const ym = String(fd.get("ym") ?? "").trim();
    const issParam = String(fd.get("iss") ?? "").trim();
    if (!/^\d{4}-\d{2}$/.test(ym)) return fail(400, { error: "計上月が不正です。" });
    const filterIssuer = issParam || undefined;
    if (filterIssuer && !(await assertIssuerAllowed(db, locals.user, filterIssuer))) {
      return fail(403, { error: "権限がありません。" });
    }
    const from = prevMonth(ym);
    const copied = await copyExpensesFromMonth(db, from, ym, filterIssuer);
    return copied
      ? { copied: true }
      : { copied: false, copyMsg: "コピーしませんでした（当月に既に経費があるか、前月が空です）。" };
  },
};
