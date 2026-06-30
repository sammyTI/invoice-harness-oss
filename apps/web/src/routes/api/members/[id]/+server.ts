import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { countOwners, deleteMember, getDB, listMembers, updateMember } from "$lib/server/db";

// メンバーを更新（氏名・メール・権限）。最後のオーナーは降格不可。
export const PUT: RequestHandler = async ({ platform, params, request }) => {
  const db = getDB(platform);
  const members = await listMembers(db);
  const target = members.find((m) => m.id === params.id);
  if (!target) return json({ error: "member not found" }, { status: 404 });
  const b = (await request.json().catch(() => ({}))) as { name?: string; email?: string; role?: string };
  const name = (b.name ?? target.name).trim() || target.name;
  const email = b.email === undefined ? target.email : (b.email || "").trim() || null;
  const role = b.role === "owner" || b.role === "member" ? b.role : target.role;
  if (target.role === "owner" && role !== "owner" && (await countOwners(db)) <= 1) {
    return json({ error: "最後のオーナーは権限を変更できません。" }, { status: 400 });
  }
  await updateMember(db, params.id, { name, email, role });
  return json({ ok: true });
};

// メンバーを削除。最後のオーナーは削除不可。
export const DELETE: RequestHandler = async ({ platform, params }) => {
  const db = getDB(platform);
  const target = (await listMembers(db)).find((m) => m.id === params.id);
  if (!target) return json({ error: "member not found" }, { status: 404 });
  if (target.role === "owner" && (await countOwners(db)) <= 1) {
    return json({ error: "最後のオーナーは削除できません。" }, { status: 400 });
  }
  await deleteMember(db, params.id);
  return json({ ok: true });
};
