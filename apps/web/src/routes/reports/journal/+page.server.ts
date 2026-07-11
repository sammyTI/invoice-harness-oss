import type { Actions, PageServerLoad } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import {
  canViewFinance,
  canViewPayroll,
  getDB,
  getJournalAccounts,
  journalEntries,
  JOURNAL_DEFAULTS,
  listIssuers,
  setJournalAccounts,
  type JournalEntry,
} from "$lib/server/db";
import { JOURNAL_EVENT_LABELS } from "$lib/server/journal-format";
import { allowedIssuerIds, canAccessIssuer } from "$lib/server/access";
import { todayJst } from "$lib/server/today";

// 仕訳エクスポート。全イベント（売上・入金・支払・経費）を正しい仕訳形式で出力する会計ソフト連携の本命機能。
// 複式簿記の完成は会計ソフト側に委ね、本ツールは「漏れのない仕訳の素データ」と「科目のユーザー設定」を提供する。

// YYYY-MM の from/to。既定は今月。
function defaultYm(): string {
  return todayJst().slice(0, 7);
}

export const load: PageServerLoad = async ({ platform, url, locals }) => {
  const db = getDB(platform);
  // 経営数値の閲覧権限が無い member はホームへ戻す（仕訳＝売上・経費データ）。
  if (!(await canViewFinance(db, locals.user))) throw redirect(303, "/");

  const allowed = await allowedIssuerIds(db, locals.user);
  let issuers = await listIssuers(db);
  if (allowed) issuers = issuers.filter((i) => allowed.includes(i.id));

  const issParam = url.searchParams.get("iss") ?? "";
  const issuerId = issuers.some((i) => i.id === issParam) ? issParam : "";

  // 期間（年月 from/to）。既定は今月。範囲外・不正はその月に丸める。
  const thisYm = defaultYm();
  const fromYm = /^\d{4}-\d{2}$/.test(url.searchParams.get("from") ?? "") ? url.searchParams.get("from")! : thisYm;
  const toYm = /^\d{4}-\d{2}$/.test(url.searchParams.get("to") ?? "") ? url.searchParams.get("to")! : thisYm;

  // 含める対象（既定は全ON）。クエリで false 指定できるようにする（プレビュー再取得用）。
  const flag = (k: string) => url.searchParams.get(k) !== "0";
  const include = { sales: flag("sales"), receipts: flag("receipts"), purchases: flag("purchases"), expenses: flag("expenses") };

  // 形式（プレビューはどちらでも同じ表を出すが、UIの初期選択を保持する）。
  const format = url.searchParams.get("format") === "yayoi" ? "yayoi" : "generic";

  // 給与系（confidential）経費は canViewPayroll が無ければ除外する。
  const mayViewPayroll = await canViewPayroll(db, locals.user);

  // プレビュー用に期間内の仕訳を取得（先頭20行）。会社未指定かつ allowed 制限ありなら各社合算。
  const from = `${fromYm}-01`;
  const to = `${toYm}-31`;
  let entries: JournalEntry[] = [];
  if (issuerId) {
    if (!canAccessIssuer(allowed, issuerId)) throw redirect(303, "/reports/journal");
    entries = await journalEntries(db, { from, to, issuerId, include, includeConfidential: mayViewPayroll });
  } else if (allowed && allowed.length) {
    for (const iid of allowed) {
      entries.push(...(await journalEntries(db, { from, to, issuerId: iid, include, includeConfidential: mayViewPayroll })));
    }
    entries.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  } else {
    entries = await journalEntries(db, { from, to, include, includeConfidential: mayViewPayroll });
  }

  // 経費に給与系（機微）が存在するのに権限が無い＝一部が抜けている旨を注記するためのフラグ。
  const payrollExcluded = include.expenses && !mayViewPayroll;

  // 現在の科目マッピング（既定を含む）を設定UIに渡す。
  const accounts = await getJournalAccounts(db);
  const mapping = JOURNAL_EVENT_LABELS.map((ev) => {
    const cur = accounts.get(ev.key) ?? JOURNAL_DEFAULTS[ev.key];
    return { key: ev.key, label: ev.label, debit: cur?.debit ?? "", credit: cur?.credit ?? "" };
  });

  return {
    fromYm,
    toYm,
    issuers: issuers.map((i) => ({ id: i.id, name: i.name })),
    issuerId,
    multiCompany: issuers.length > 1,
    include,
    format,
    totalCount: entries.length,
    preview: entries.slice(0, 20).map((e) => ({
      date: e.date,
      debit: e.debit,
      debitAmount: e.debitAmount,
      credit: e.credit,
      creditAmount: e.creditAmount,
      memo: e.memo,
    })),
    mayViewPayroll,
    payrollExcluded,
    mapping,
  };
};

export const actions: Actions = {
  // 科目マッピング設定の保存。イベント種別ごとの借方/貸方を journal_accounts へ UPSERT する。
  saveMapping: async ({ request, platform, locals }) => {
    const db = getDB(platform);
    if (!(await canViewFinance(db, locals.user))) return fail(403, { error: "権限がありません。" });
    const fd = await request.formData();
    const entries: { key: string; debit: string; credit: string }[] = [];
    for (const ev of JOURNAL_EVENT_LABELS) {
      const debit = String(fd.get(`debit_${ev.key}`) ?? "").trim();
      const credit = String(fd.get(`credit_${ev.key}`) ?? "").trim();
      // 借方・貸方の両方が入っている行のみ保存対象（空欄は既定に戻す＝行を消す運用も可能だが、ここでは無視）。
      if (debit && credit) entries.push({ key: ev.key, debit, credit });
    }
    if (entries.length === 0) return fail(400, { error: "保存する科目がありません。" });
    await setJournalAccounts(db, entries);
    return { saved: true };
  },
};
