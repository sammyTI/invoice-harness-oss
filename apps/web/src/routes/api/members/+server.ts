import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { createMemberWithPassword, getDB, getMemberByEmail, listMembers } from "$lib/server/db";
import { hashPassword, randomPassword } from "$lib/server/auth";

// メンバー一覧（個人の認証情報は返さない）。
export const GET: RequestHandler = async ({ platform }) => {
  const db = getDB(platform);
  const members = await listMembers(db);
  return json({
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      status: m.status,
      must_change_password: m.must_change_password ? 1 : 0,
    })),
  });
};

// メンバーを招待（初期パスワードを発行。初回ログインで本人が変更）。
export const POST: RequestHandler = async ({ platform, request, url }) => {
  const db = getDB(platform);
  const b = (await request.json().catch(() => ({}))) as { name?: string; email?: string; role?: string };
  const name = (b.name ?? "").trim();
  const email = (b.email ?? "").trim();
  const role = b.role === "owner" ? "owner" : "member";
  if (!name || !email) return json({ error: "name and email are required" }, { status: 400 });
  if (await getMemberByEmail(db, email)) return json({ error: "そのメールは既に登録されています。" }, { status: 400 });
  const tempPassword = randomPassword(12);
  const { hash, salt } = await hashPassword(tempPassword);
  await createMemberWithPassword(db, name, email, role, hash, salt);
  return json({
    ok: true,
    email,
    role,
    temp_password: tempPassword,
    must_change_password: true,
    login_url: `${url.origin}/login`,
  });
};
