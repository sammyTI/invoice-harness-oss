import type { Actions, PageServerLoad } from "./$types";
import { getDB } from "$lib/server/db";
import { listAudit, verifyChain } from "$lib/server/audit";

export const load: PageServerLoad = async ({ platform }) => {
  const db = getDB(platform);
  return { entries: await listAudit(db) };
};

export const actions: Actions = {
  verify: async ({ platform }) => {
    const db = getDB(platform);
    const result = await verifyChain(db);
    return { verify: result };
  },
};
