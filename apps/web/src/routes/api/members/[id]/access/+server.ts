import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { getDB, listIssuers, listMembers } from "$lib/server/db";
import { addMemberIssuer, getMemberIssuers, removeMemberIssuer } from "$lib/server/access";

async function resolveIssuerId(platform: App.Platform | undefined, issuer_id?: string, issuer_name?: string) {
  const db = getDB(platform);
  if (issuer_id) return issuer_id;
  if (issuer_name) return (await listIssuers(db)).find((i) => i.name === issuer_name)?.id ?? null;
  return null;
}

// 会社別の閲覧権限を付与（この会社をこのメンバーに許可）。
export const POST: RequestHandler = async ({ platform, params, request }) => {
  const db = getDB(platform);
  if (!(await listMembers(db)).some((m) => m.id === params.id)) return json({ error: "member not found" }, { status: 404 });
  const b = (await request.json().catch(() => ({}))) as { issuer_id?: string; issuer_name?: string };
  const issuerId = await resolveIssuerId(platform, b.issuer_id, b.issuer_name);
  if (!issuerId) return json({ error: "issuer not found" }, { status: 400 });
  await addMemberIssuer(db, params.id, issuerId);
  return json({ ok: true, issuers: await getMemberIssuers(db, params.id) });
};

// 会社別の閲覧権限を解除。
export const DELETE: RequestHandler = async ({ platform, params, request }) => {
  const db = getDB(platform);
  const b = (await request.json().catch(() => ({}))) as { issuer_id?: string; issuer_name?: string };
  const issuerId = await resolveIssuerId(platform, b.issuer_id, b.issuer_name);
  if (!issuerId) return json({ error: "issuer not found" }, { status: 400 });
  await removeMemberIssuer(db, params.id, issuerId);
  return json({ ok: true, issuers: await getMemberIssuers(db, params.id) });
};
