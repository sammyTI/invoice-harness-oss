import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";
import { clientCategoryNameMap, clientFinancials, getClient, getDB, listDocuments, listProjects } from "$lib/server/db";
import { allowedIssuerIds } from "$lib/server/access";

export const load: PageServerLoad = async ({ platform, params, locals }) => {
  const db = getDB(platform);
  const client = await getClient(db, params.id);
  if (!client) throw error(404, "取引先が見つかりません");
  const allowed = await allowedIssuerIds(db, locals.user);
  const docs = await listDocuments(db, undefined, allowed, { clientId: params.id });
  return {
    client,
    categories: (await clientCategoryNameMap(db))[params.id] ?? [],
    fin: await clientFinancials(db, params.id),
    projects: await listProjects(db, params.id),
    docs,
  };
};
