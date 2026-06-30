import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params, platform }) => {
  const bucket = platform?.env?.FILES;
  if (!bucket) return new Response("R2 not configured", { status: 404 });
  const obj = await bucket.get(params.key);
  if (!obj) return new Response("Not found", { status: 404 });
  const headers = new Headers({
    "content-type": obj.httpMetadata?.contentType || "application/octet-stream",
    "cache-control": "public, max-age=3600",
  });
  if (obj.httpEtag) headers.set("etag", obj.httpEtag);
  return new Response(obj.body, { headers });
};
