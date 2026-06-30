import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { getDB, getDocument } from "$lib/server/db";

export const GET: RequestHandler = async ({ platform, params }) => {
  const db = getDB(platform);
  const full = await getDocument(db, params.id);
  if (!full) return json({ error: "not found" }, { status: 404 });
  return json(full);
};
