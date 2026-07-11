import { redirect, type Handle } from "@sveltejs/kit";
import { getSessionUser, SESSION_COOKIE } from "$lib/server/auth";
import { countActiveMembers, verifyApiToken } from "$lib/server/db";

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

// 全レスポンス共通のセキュリティヘッダを付与して返す。
// 静的アセット(_app/等)への付与は無害なので全経路を一本化して通す。
// CSP は今回見送り: SvelteKit のインラインハイドレーション（<script>）と
// 干渉して画面が壊れるリスクがあるため、別途 nonce 対応が済むまで保留する。
async function resolveWithSecurityHeaders(event: Parameters<Handle>[0]["event"], resolve: Parameters<Handle>[0]["resolve"]): Promise<Response> {
  const res = await resolve(event);
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return res;
}

const PUBLIC = ["/login", "/setup", "/accept", "/logout"];
// /transactions（銀行明細取込・消込）は会社タグの無い生明細を扱うため owner 専用
const OWNER_ONLY = ["/members", "/settings", "/transactions"];
// viewer が書き込みできる例外パス（自分のパスワード変更とログアウトのみ）
const VIEWER_WRITE_OK = ["/logout", "/account/password"];

export const handle: Handle = async ({ event, resolve }) => {
  const db = event.platform?.env?.DB;
  const path = event.url.pathname;

  // 静的・内部アセットは素通り
  if (path.startsWith("/_app/") || path.startsWith("/assets/") || path === "/favicon.ico") {
    return resolveWithSecurityHeaders(event, resolve);
  }
  if (!db) return resolveWithSecurityHeaders(event, resolve);

  // API（MCP/外部AI）: Bearer トークン認証＋スコープ強制
  if (path.startsWith("/api/")) {
    const auth = event.request.headers.get("authorization") ?? "";
    const m = /^Bearer\s+(.+)$/.exec(auth);
    const verified = m ? await verifyApiToken(db, m[1]) : { ok: false as const };
    if (!verified.ok) return json({ error: "unauthorized" }, 401);
    const scope = verified.scope ?? "full";
    event.locals.apiActor = "api";
    event.locals.apiScope = scope;

    const method = event.request.method;
    const isRead = method === "GET" || method === "HEAD";

    // 管理系API: メンバー情報・設定・監査ログ・取引明細・バックアップは
    // 参照だけでも機微（誰がいるか・振込先・操作履歴・生の口座明細が漏れる）。
    // readonly トークンではメソッド問わず（GET含め）一切触らせない。
    const ADMIN_API = ["/api/members", "/api/settings", "/api/audit", "/api/transactions", "/api/backup"];
    if (scope === "readonly" && ADMIN_API.some((p) => path.startsWith(p))) {
      return json({ error: "forbidden: readonly token" }, 403);
    }

    // 基本ガード: readonly トークンは GET/HEAD 以外の書き込み系メソッドを一括拒否。
    if (scope === "readonly" && !isRead) {
      return json({ error: "forbidden: readonly token" }, 403);
    }

    return resolveWithSecurityHeaders(event, resolve);
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
    return resolveWithSecurityHeaders(event, resolve);
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

  // viewer（閲覧のみ・税理士等の外部関係者向け）は参照とエクスポートのみ。書き込みはサーバ側で一括拒否
  if (
    event.locals.user &&
    event.locals.user.role === "viewer" &&
    event.request.method !== "GET" &&
    event.request.method !== "HEAD" &&
    !VIEWER_WRITE_OK.includes(path)
  ) {
    throw redirect(303, event.url.pathname);
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

  return resolveWithSecurityHeaders(event, resolve);
};
