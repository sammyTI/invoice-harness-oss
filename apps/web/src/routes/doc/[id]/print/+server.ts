import type { RequestHandler } from "./$types";
import { getDB, getDocument } from "$lib/server/db";
import { renderDocument } from "@invoice-harness/templates";
import { allowedIssuerIds, canAccessIssuer } from "$lib/server/access";

export const GET: RequestHandler = async ({ params, platform, locals }) => {
  const db = getDB(platform);
  const full = await getDocument(db, params.id);
  if (!full) return new Response("Not found", { status: 404 });
  const allowed = await allowedIssuerIds(db, locals.user);
  if (!canAccessIssuer(allowed, full.doc.issuer_id)) return new Response("Not found", { status: 404 });
  const html = renderDocument(full);
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
};
