import type { Actions, PageServerLoad } from "./$types";
import { error, fail, redirect } from "@sveltejs/kit";
import { activateMember, getDB, getMemberByToken } from "$lib/server/db";
import { createSession, hashPassword, SESSION_COOKIE } from "$lib/server/auth";

export const load: PageServerLoad = async ({ platform, url }) => {
  const db = getDB(platform);
  const token = url.searchParams.get("token") ?? "";
  const m = token ? await getMemberByToken(db, token) : null;
  if (!m || m.status !== "invited") throw error(404, "招待が無効か、既に使用済みです。");
  return { token, name: m.name, email: m.email };
};

export const actions: Actions = {
  default: async ({ request, platform, cookies }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    const token = String(fd.get("token") ?? "");
    const password = String(fd.get("password") ?? "");
    const m = token ? await getMemberByToken(db, token) : null;
    if (!m || m.status !== "invited") return fail(400, { error: "招待が無効です。" });
    if (password.length < 8) return fail(400, { error: "パスワードは8文字以上にしてください。" });
    const { hash, salt } = await hashPassword(password);
    await activateMember(db, m.id, hash, salt);
    const session = await createSession(db, m.id);
    cookies.set(SESSION_COOKIE, session, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
    throw redirect(303, "/");
  },
};
