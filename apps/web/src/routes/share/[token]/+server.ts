import type { RequestHandler } from "./$types";
import { getDB, getDocumentByShareToken } from "$lib/server/db";
import { recordAttempt, tooManyByKey } from "$lib/server/auth";
import { renderDocument } from "@invoice-harness/templates";

// share トークン総当たり対策（login_attempts 流用・専用識別子で分離）
const SHARE_KEY = "__share__";
const SHARE_LIMIT = 30; // 30回/10分（見つからなかった試行のみカウント）

// 公開共有リンク（ログイン不要）。推測困難なトークンで帳票を読み取り専用表示する。
export const GET: RequestHandler = async ({ params, platform, request, getClientAddress }) => {
  const db = getDB(platform);

  // 総当たり対策: 直近10分の失敗が閾値超なら 429（正しいトークンのアクセスは制限しない）
  const ip = request.headers.get("CF-Connecting-IP") ?? getClientAddress();
  if (await tooManyByKey(db, SHARE_KEY, ip, SHARE_LIMIT)) {
    return new Response("試行回数が多すぎます。しばらく待ってからお試しください。", { status: 429 });
  }

  const full = await getDocumentByShareToken(db, params.token);
  if (!full) {
    // トークンが見つからなかった場合のみ記録（総当たりのみをカウント）
    await recordAttempt(db, SHARE_KEY, ip);
    return new Response("リンクが無効か、共有が解除されています。", { status: 404 });
  }
  const html = renderDocument(full);
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      // 検索エンジンにインデックスさせない
      "x-robots-tag": "noindex, nofollow",
      // 外部リンククリック時に共有トークンをRefererで漏らさない
      "referrer-policy": "no-referrer",
    },
  });
};
