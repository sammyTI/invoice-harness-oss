import type { RequestHandler } from "./$types";
import { getDB, getDocumentByShareToken } from "$lib/server/db";
import { renderDocument } from "@invoice-harness/templates";

// 公開共有リンク（ログイン不要）。推測困難なトークンで帳票を読み取り専用表示する。
export const GET: RequestHandler = async ({ params, platform }) => {
  const db = getDB(platform);
  const full = await getDocumentByShareToken(db, params.token);
  if (!full) return new Response("リンクが無効か、共有が解除されています。", { status: 404 });
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
