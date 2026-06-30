import type { Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { getDB, restoreAll } from "$lib/server/db";

export const actions: Actions = {
  import: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) return fail(400, { error: "JSONファイルを選択してください。" });
    let parsed: { data?: Record<string, Record<string, unknown>[]> };
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      return fail(400, { error: "JSONの解析に失敗しました。" });
    }
    if (!parsed.data) return fail(400, { error: "バックアップ形式が不正です（data がありません）。" });
    await restoreAll(db, parsed.data);
    return { ok: true };
  },
};
