import type { Actions, PageServerLoad } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import { countActiveMembers, createOwner, getDB } from "$lib/server/db";
import {
  createSession,
  hashPassword,
  normalizeEmail,
  recordAttempt,
  SESSION_COOKIE,
  tooManyByKey,
} from "$lib/server/auth";

// setup POST の ip 単位試行制限（login_attempts 流用・通常ログインとは識別子で分離）
const SETUP_KEY = "__setup__";
const SETUP_LIMIT = 10; // 10回/10分

export const load: PageServerLoad = async ({ platform }) => {
  const db = getDB(platform);
  if ((await countActiveMembers(db)) > 0) throw redirect(303, "/login");
  return {};
};

export const actions: Actions = {
  default: async ({ request, platform, cookies, getClientAddress }) => {
    const db = getDB(platform);
    if ((await countActiveMembers(db)) > 0) throw redirect(303, "/login");

    // 総当たり対策: ip 単位で試行制限
    const ip = request.headers.get("CF-Connecting-IP") ?? getClientAddress();
    if (await tooManyByKey(db, SETUP_KEY, ip, SETUP_LIMIT)) {
      return fail(429, { error: "試行回数が多すぎます。10分ほど待ってからお試しください。" });
    }
    await recordAttempt(db, SETUP_KEY, ip);

    const fd = await request.formData();
    const name = String(fd.get("name") ?? "").trim();
    // email は正規化して保存（ログイン時の照合と揃える）
    const email = normalizeEmail(String(fd.get("email") ?? ""));
    const password = String(fd.get("password") ?? "");
    if (!name || !email || password.length < 8) {
      return fail(400, { error: "氏名・メール・8文字以上のパスワードが必要です。" });
    }
    const { hash, salt } = await hashPassword(password);
    const id = await createOwner(db, name, email, hash, salt);
    const token = await createSession(db, id);
    // maxAge 30日は DB 側 sessions.expires_at（createSession で 30日）と一致させる
    cookies.set(SESSION_COOKIE, token, { path: "/", httpOnly: true, secure: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
    // オーナー作成直後はセットアップウィザードへ誘導する（迷子防止）。
    throw redirect(303, "/onboarding");
  },
};
