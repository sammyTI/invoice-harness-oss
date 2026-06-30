import type { Actions, PageServerLoad } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import { getDB, getMemberByEmail, setMemberPassword } from "$lib/server/db";
import { hashPassword, verifyPassword } from "$lib/server/auth";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, "/login");
  return { mustChange: !!locals.user.must_change_password, email: locals.user.email };
};

export const actions: Actions = {
  default: async ({ request, platform, locals }) => {
    if (!locals.user) throw redirect(303, "/login");
    const db = getDB(platform);
    const fd = await request.formData();
    const current = String(fd.get("current") ?? "");
    const next = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");

    if (next.length < 8) return fail(400, { error: "新しいパスワードは8文字以上にしてください。" });
    if (next !== confirm) return fail(400, { error: "確認用パスワードが一致しません。" });

    const m = await getMemberByEmail(db, locals.user.email);
    if (!m || !m.password_hash || !m.salt) return fail(400, { error: "アカウントが見つかりません。" });

    // 初期パスワード強制変更中は現在パスワード不要、通常変更は必須
    if (!locals.user.must_change_password) {
      const ok = await verifyPassword(current, m.salt, m.password_hash);
      if (!ok) return fail(400, { error: "現在のパスワードが違います。" });
    }

    const { hash, salt } = await hashPassword(next);
    await setMemberPassword(db, m.id, hash, salt);
    throw redirect(303, "/");
  },
};
