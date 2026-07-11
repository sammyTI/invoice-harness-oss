import type { LayoutServerLoad } from "./$types";
import { canViewFinance, getDB } from "$lib/server/db";

export const load: LayoutServerLoad = async ({ locals, platform }) => {
  // 表示・権限判定に必要な項目のみ返す（パスワード類は含めない）
  const u = locals.user;
  // サイドバーの「レポート・会計」セクションの表示可否に使う経営数値の閲覧権限。
  // DB 未接続（bare 画面等）では判定不要なので false。
  let finance = false;
  const db = platform?.env?.DB;
  if (u && db) finance = await canViewFinance(db, u);
  return {
    finance,
    user: u
      ? { id: u.id, name: u.name, email: u.email, role: u.role, must_change_password: u.must_change_password }
      : null,
  };
};
