import { redirect, type Handle } from "@sveltejs/kit";
import { getSessionUser, SESSION_COOKIE } from "$lib/server/auth";
import { countActiveMembers, verifyApiToken } from "$lib/server/db";

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const PUBLIC = ["/login", "/setup", "/accept", "/logout"];
// /transactions（銀行明細取込・消込）は会社タグの無い生明細を扱うため owner 専用
const OWNER_ONLY = ["/members", "/settings", "/transactions"];

export const handle: Handle = async ({ event, resolve }) => {
  const db = event.platform?.env?.DB;
  const path = event.url.pathname;

  // 静的・内部アセットは素通り
  if (path.startsWith("/_app/") || path.startsWith("/assets/") || path === "/favicon.ico") {
    return resolve(event);
  }
  if (!db) return resolve(event);

  // API（MCP/外部AI）: Bearer トークン認証
  if (path.startsWith("/api/")) {
    const auth = event.request.headers.get("authorization") ?? "";
    const m = /^Bearer\s+(.+)$/.exec(auth);
    const ok = m ? await verifyApiToken(db, m[1]) : false;
    if (!ok) return json({ error: "unauthorized" }, 401);
    event.locals.apiActor = "api";
    return resolve(event);
  }

  // セッション復元
  const token = event.cookies.get(SESSION_COOKIE);
  if (token) {
    const user = await getSessionUser(db, token);
    if (user) event.locals.user = user;
  }

  // /share/<token> は公開共有リンク（ログイン不要・読み取り専用）
  const isPublic = PUBLIC.includes(path) || path.startsWith("/share/");

  // 初回起動：オーナー未作成なら /setup へ
  const active = await countActiveMembers(db);
  if (active === 0) {
    if (path !== "/setup") throw redirect(303, "/setup");
    return resolve(event);
  }

  // 未ログインは /login へ
  if (!event.locals.user && !isPublic) {
    throw redirect(303, "/login?next=" + encodeURIComponent(path));
  }

  // 権限ガード（owner専用領域）。demo は一時的に owner と同等のフル操作を許可
  if (
    event.locals.user &&
    event.locals.user.role !== "owner" &&
    event.locals.user.role !== "demo" &&
    OWNER_ONLY.some((p) => path.startsWith(p))
  ) {
    throw redirect(303, "/");
  }

  // 初期パスワードのままなら、パスワード変更を強制
  if (
    event.locals.user &&
    event.locals.user.must_change_password &&
    path !== "/account/password" &&
    path !== "/logout"
  ) {
    throw redirect(303, "/account/password");
  }

  // ログイン済みが /login,/setup を開いたらトップへ
  if (event.locals.user && (path === "/login" || path === "/setup")) {
    throw redirect(303, "/");
  }

  return resolve(event);
};
