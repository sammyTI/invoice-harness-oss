import type { Actions, PageServerLoad } from "./$types";
import { fail } from "@sveltejs/kit";
import { getDB, listIssuers, setIssuerAsset } from "$lib/server/db";

export const load: PageServerLoad = async ({ platform }) => {
  const db = getDB(platform);
  return { issuers: await listIssuers(db), r2: !!platform?.env?.FILES };
};

export const actions: Actions = {
  upload: async ({ request, platform }) => {
    const db = getDB(platform);
    const bucket = platform?.env?.FILES;
    if (!bucket) return fail(400, { error: "R2 バケット(FILES)が未設定です。wrangler.toml と `wrangler r2 bucket create` を確認してください。" });

    const fd = await request.formData();
    const issuerId = String(fd.get("issuer_id") ?? "");
    const kind = String(fd.get("kind") ?? ""); // logo | seal
    const file = fd.get("file");
    if (!issuerId || (kind !== "logo" && kind !== "seal")) return fail(400, { error: "入力が不正です。" });
    if (!(file instanceof File) || file.size === 0) return fail(400, { error: "画像ファイルを選択してください。" });
    if (file.size > 2_000_000) return fail(400, { error: "ファイルが大きすぎます（2MBまで）。" });

    const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
    const key = `issuer/${issuerId}/${kind}-${crypto.randomUUID()}.${ext}`;
    await bucket.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type || "image/png" },
    });
    await setIssuerAsset(db, issuerId, kind === "logo" ? "logo_key" : "seal_key", `/assets/${key}`);
    return { ok: true, kind };
  },
};
