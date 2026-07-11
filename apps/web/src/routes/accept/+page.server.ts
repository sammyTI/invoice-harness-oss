import type { Actions, PageServerLoad } from "./$types";
import { error, fail, redirect } from "@sveltejs/kit";
import { activateMember, getDB, getMemberByToken } from "$lib/server/db";
import {
  clearAttempts,
  createSession,
  hashPassword,
  recordAttempt,
  SESSION_COOKIE,
  tooManyByKey,
} from "$lib/server/auth";

// accept POST の ip 単位試行制限（login_attempts 流用・通常ログインとは識別子で分離）
const ACCEPT_KEY = "__accept__";
const ACCEPT_LIMIT = 10; // 10回/10分

export const load: PageServerLoad = async ({ platform, url }) => {
  const db = getDB(platform);
  const token = url.searchParams.get("token") ?? "";
  const m = token ? await getMemberByToken(db, token) : null;
  if (!m || m.status !== "invited") throw error(404, "招待が無効か、既に使用済みです。");
  return { token, name: m.name, email: m.email };
};

export const actions: Actions = {
  default: async ({ request, platform, cookies, getClientAddress }) => {
    const db = getDB(platform);

    // 総当たり対策: ip 単位で試行制限（招待トークンの総当たり対策）
    const ip = request.headers.get("CF-Connecting-IP") ?? getClientAddress();
    if (await tooManyByKey(db, ACCEPT_KEY, ip, ACCEPT_LIMIT)) {
      return fail(429, { error: "試行回数が多すぎます。10分ほど待ってからお試しください。" });
    }
    await recordAttempt(db, ACCEPT_KEY, ip);

    const fd = await request.formData();
    const token = String(fd.get("token") ?? "");
    const password = String(fd.get("password") ?? "");
    const m = token ? await getMemberByToken(db, token) : null;
    if (!m || m.status !== "invited") return fail(400, { error: "招待が無効です。" });
    if (password.length < 8) return fail(400, { error: "パスワードは8文字以上にしてください。" });
    const { hash, salt } = await hashPassword(password);
    await activateMember(db, m.id, hash, salt);
    // 成功: この ip+key の試行記録をクリア
    await clearAttempts(db, ACCEPT_KEY, ip);
    const session = await createSession(db, m.id);
    // maxAge 30日は DB 側 sessions.expires_at（createSession で 30日）と一致させる
    cookies.set(SESSION_COOKIE, session, { path: "/", httpOnly: true, secure: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
    throw redirect(303, "/");
  },
};
