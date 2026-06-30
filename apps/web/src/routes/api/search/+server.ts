import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { getDB, searchDocuments } from "$lib/server/db";

export const GET: RequestHandler = async ({ platform, url }) => {
  const db = getDB(platform);
  const results = await searchDocuments(db, {
    q: url.searchParams.get("q") ?? "",
    dateFrom: url.searchParams.get("from") ?? "",
    dateTo: url.searchParams.get("to") ?? "",
    amountMin: url.searchParams.get("min") ? Number(url.searchParams.get("min")) : null,
    amountMax: url.searchParams.get("max") ? Number(url.searchParams.get("max")) : null,
  });
  return json({ results });
};
