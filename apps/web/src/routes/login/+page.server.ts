import type { Actions } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import { getDB, getMemberByEmail } from "$lib/server/db";
import { createSession, SESSION_COOKIE, verifyPassword } from "$lib/server/auth";

export const actions: Actions = {
  default: async ({ request, platform, cookies, url }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const next = String(fd.get("next") ?? "") || url.searchParams.get("next") || "/";

    const m = await getMemberByEmail(db, email);
    if (!m || m.status !== "active" || !m.password_hash || !m.salt) {
      return fail(400, { error: "メールまたはパスワードが違います。" });
    }
    const ok = await verifyPassword(password, m.salt, m.password_hash);
    if (!ok) return fail(400, { error: "メールまたはパスワードが違います。" });

    const token = await createSession(db, m.id);
    cookies.set(SESSION_COOKIE, token, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
    throw redirect(303, next.startsWith("/") ? next : "/");
  },
};
