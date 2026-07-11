import type { RequestHandler } from "./$types";
import { dumpAll, getDB } from "$lib/server/db";
import { todayJst } from "$lib/server/today";

export const GET: RequestHandler = async ({ platform }) => {
  const db = getDB(platform);
  const data = await dumpAll(db);
  const payload = JSON.stringify({ version: 1, exported_at: new Date().toISOString(), data }, null, 2);
  const date = todayJst();
  return new Response(payload, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="invoice-harness-backup-${date}.json"`,
    },
  });
};
