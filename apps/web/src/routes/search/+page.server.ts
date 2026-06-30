import type { PageServerLoad } from "./$types";
import { getDB, searchDocuments } from "$lib/server/db";
import { allowedIssuerIds } from "$lib/server/access";

export const load: PageServerLoad = async ({ platform, url, locals }) => {
  const db = getDB(platform);
  const allowed = await allowedIssuerIds(db, locals.user);
  const q = url.searchParams.get("q") ?? "";
  const dateFrom = url.searchParams.get("from") ?? "";
  const dateTo = url.searchParams.get("to") ?? "";
  const amountMin = url.searchParams.get("min");
  const amountMax = url.searchParams.get("max");

  const hasQuery = q || dateFrom || dateTo || amountMin || amountMax;
  const results = hasQuery
    ? await searchDocuments(db, {
        q,
        dateFrom,
        dateTo,
        amountMin: amountMin ? Number(amountMin) : null,
        amountMax: amountMax ? Number(amountMax) : null,
      }, allowed)
    : [];

  return { q, dateFrom, dateTo, amountMin: amountMin ?? "", amountMax: amountMax ?? "", results, hasQuery: !!hasQuery };
};
