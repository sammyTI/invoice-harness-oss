import type { PageServerLoad } from "./$types";
import { getDB, listEmailLog } from "$lib/server/db";

export const load: PageServerLoad = async ({ platform }) => {
  const db = getDB(platform);
  return { entries: await listEmailLog(db) };
};
