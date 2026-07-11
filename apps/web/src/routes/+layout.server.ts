import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals }) => {
  // 表示・権限判定に必要な項目のみ返す（パスワード類は含めない）
  const u = locals.user;
  return {
    user: u
      ? { id: u.id, name: u.name, email: u.email, role: u.role, must_change_password: u.must_change_password }
      : null,
  };
};
