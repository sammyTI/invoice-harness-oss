import type { RequestHandler } from "./$types";
import { dumpAll, getDB } from "$lib/server/db";

export const GET: RequestHandler = async ({ platform }) => {
  const db = getDB(platform);
  const data = await dumpAll(db);
  const payload = JSON.stringify({ version: 1, exported_at: new Date().toISOString(), data }, null, 2);
  const date = new Date().toISOString().slice(0, 10);
  return new Response(payload, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="invoice-harness-backup-${date}.json"`,
    },
  });
};
