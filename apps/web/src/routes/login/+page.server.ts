import type { Actions, PageServerLoad } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import type { Member } from "$lib/server/db";
import { getDB, getMemberByEmail } from "$lib/server/db";
import {
  clearLoginFailures,
  createSession,
  normalizeEmail,
  recordLoginFailure,
  SESSION_COOKIE,
  tooManyAttempts,
  verifyPassword,
} from "$lib/server/auth";

// 認証失敗時は必ず同一文言を返す（ユーザー存在の探りを防ぐ）
const AUTH_FAIL = "メールアドレスまたはパスワードが違います";

// DEMO_LOGIN が設定されたインスタンスだけボタンを表示する。
export const load: PageServerLoad = ({ platform }) => {
  return { demoLogin: !!platform?.env?.DEMO_LOGIN };
};

export const actions: Actions = {
  login: async ({ request, platform, cookies, url, getClientAddress }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    // email は小文字trim正規化してから照合・記録・クリアに使う（大小文字使い分けによる制限回避を封じる）
    const email = normalizeEmail(String(fd.get("email") ?? ""));
    const password = String(fd.get("password") ?? "");
    const next = String(fd.get("next") ?? "") || url.searchParams.get("next") || "/";

    // クライアントIP（CF 経由なら CF-Connecting-IP を優先）
    const ip = request.headers.get("CF-Connecting-IP") ?? getClientAddress();

    // 総当たり対策: 認証前に直近の失敗回数を確認
    if (await tooManyAttempts(db, email, ip)) {
      return fail(429, { error: "試行回数が多すぎます。10分ほど待ってからお試しください。" });
    }

    const m = await getMemberByEmail(db, email);
    if (!m || m.status !== "active" || !m.password_hash || !m.salt) {
      await recordLoginFailure(db, email, ip);
      return fail(400, { error: AUTH_FAIL });
    }
    const ok = await verifyPassword(password, m.salt, m.password_hash);
    if (!ok) {
      await recordLoginFailure(db, email, ip);
      return fail(400, { error: AUTH_FAIL });
    }

    // 認証成功: 失敗記録をリセット
    await clearLoginFailures(db, email);

    const token = await createSession(db, m.id);
    // maxAge 30日は DB 側 sessions.expires_at（createSession で 30日）と一致させる
    cookies.set(SESSION_COOKIE, token, { path: "/", httpOnly: true, secure: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
    // オープンリダイレクト封じ: 単一スラッシュ始まりの内部パスのみ許可。
    // "//evil.example"（プロトコル相対URL）や "\evil.example" を弾く。
    const safeNext = next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
    throw redirect(303, safeNext);
  },

  // デモ環境限定のワンクリックログイン。パスワード照合が無いため総当たり対象ではなくレート制限は不要。
  demo: async ({ platform, cookies }) => {
    // DEMO_LOGIN が無いインスタンスでは絶対に発行しない
    if (!platform?.env?.DEMO_LOGIN) {
      return fail(403, { error: "デモログインは無効です" });
    }
    const db = getDB(platform);
    // role='demo' AND status='active' の最初のメンバー（ログイン可能な行を優先）
    const m = await db
      .prepare(
        "SELECT * FROM members WHERE role='demo' AND status='active' ORDER BY (CASE WHEN password_hash IS NOT NULL THEN 0 ELSE 1 END), created_at LIMIT 1"
      )
      .first<Member>();
    if (!m) {
      return fail(500, { error: "デモアカウントが設定されていません" });
    }

    const token = await createSession(db, m.id);
    // default action と同じ cookie 流儀（secure/httpOnly/sameSite/maxAge を一致させる）
    cookies.set(SESSION_COOKIE, token, { path: "/", httpOnly: true, secure: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
    throw redirect(303, "/");
  },
};
