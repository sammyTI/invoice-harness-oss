import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { getDB, listItems } from "$lib/server/db";

export const GET: RequestHandler = async ({ platform }) => {
  const db = getDB(platform);
  return json({ items: await listItems(db) });
};
