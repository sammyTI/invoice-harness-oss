import type { Actions, PageServerLoad } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import { countActiveMembers, createOwner, getDB } from "$lib/server/db";
import { createSession, hashPassword, SESSION_COOKIE } from "$lib/server/auth";

export const load: PageServerLoad = async ({ platform }) => {
  const db = getDB(platform);
  if ((await countActiveMembers(db)) > 0) throw redirect(303, "/login");
  return {};
};

export const actions: Actions = {
  default: async ({ request, platform, cookies }) => {
    const db = getDB(platform);
    if ((await countActiveMembers(db)) > 0) throw redirect(303, "/login");
    const fd = await request.formData();
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    if (!name || !email || password.length < 8) {
      return fail(400, { error: "氏名・メール・8文字以上のパスワードが必要です。" });
    }
    const { hash, salt } = await hashPassword(password);
    const id = await createOwner(db, name, email, hash, salt);
    const token = await createSession(db, id);
    cookies.set(SESSION_COOKIE, token, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
    throw redirect(303, "/");
  },
};
