import type { Actions, PageServerLoad } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import { isValidRegistrationNumber } from "@invoice-harness/shared";
import {
  clientCategoryNameMap,
  createClientCategory,
  deleteClientCategory,
  getClient,
  getClientCategoryIds,
  getDB,
  listClientCategories,
  listClients,
  setClientCategories,
  updateClient,
  type ClientInput,
} from "$lib/server/db";

function parse(fd: FormData): ClientInput {
  return {
    name: String(fd.get("name") ?? "").trim(),
    honorific: String(fd.get("honorific") ?? "御中") || "御中",
    contact: String(fd.get("contact") ?? "").trim() || null,
    postal_code: String(fd.get("postal_code") ?? "").trim() || null,
    address: String(fd.get("address") ?? "").trim() || null,
    email: String(fd.get("email") ?? "").trim() || null,
    registration_number: String(fd.get("registration_number") ?? "").trim() || null,
  };
}

const catIds = (fd: FormData) => fd.getAll("category_ids").map((v) => String(v)).filter(Boolean);

export const load: PageServerLoad = async ({ platform, url }) => {
  const db = getDB(platform);
  const editId = url.searchParams.get("edit");
  const editing = editId ? await getClient(db, editId) : null;

  // フィルター条件（q=キーワード / cat=顧客区分ID）
  const q = (url.searchParams.get("q") ?? "").trim();
  const cat = (url.searchParams.get("cat") ?? "").trim();

  const all = await listClients(db);
  const catMap = await clientCategoryNameMap(db);

  // 区分IDでの絞り込みには client_id→区分ID配列 のマップが必要。
  // catMap は区分「名」ベースなので、リンクテーブルからIDベースのマップを別途構築する。
  const catIdMap: Record<string, string[]> = {};
  if (cat) {
    for (const c of all) catIdMap[c.id] = await getClientCategoryIds(db, c.id);
  }

  const ql = q.toLowerCase();
  const clients = all.filter((c) => {
    // キーワード: 取引先名・担当・メールの部分一致（小文字比較）
    if (q) {
      const hay = `${c.name} ${c.contact ?? ""} ${c.email ?? ""}`.toLowerCase();
      if (!hay.includes(ql)) return false;
    }
    // 顧客区分: 指定IDを持つ取引先のみ
    if (cat && !(catIdMap[c.id] ?? []).includes(cat)) return false;
    return true;
  });

  return {
    clients,
    editing,
    categories: await listClientCategories(db),
    catMap,
    editingCatIds: editing ? await getClientCategoryIds(db, editing.id) : [],
    q,
    cat,
  };
};

export const actions: Actions = {
  create: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    const c = parse(fd);
    if (!c.name) return fail(400, { error: "取引先名は必須です。" });
    if (c.registration_number && !isValidRegistrationNumber(c.registration_number))
      return fail(400, { error: "登録番号はT+13桁の形式で入力してください" });
    const id = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO clients (id, name, honorific, contact, postal_code, address, email, registration_number)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8)`
      )
      .bind(id, c.name, c.honorific, c.contact, c.postal_code, c.address, c.email, c.registration_number)
      .run();
    await setClientCategories(db, id, catIds(fd));
    return { ok: true };
  },
  update: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    const id = String(fd.get("id") ?? "");
    const c = parse(fd);
    if (!id || !c.name) return fail(400, { error: "取引先名は必須です。" });
    if (c.registration_number && !isValidRegistrationNumber(c.registration_number))
      return fail(400, { error: "登録番号はT+13桁の形式で入力してください" });
    await updateClient(db, id, c);
    await setClientCategories(db, id, catIds(fd));
    throw redirect(303, "/clients");
  },
  addCategory: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    const name = String(fd.get("cat_name") ?? "").trim();
    if (!name) return fail(400, { error: "区分名を入力してください。" });
    await createClientCategory(db, name);
    return { ok: true };
  },
  deleteCategory: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();
    const id = String(fd.get("id") ?? "");
    if (id) await deleteClientCategory(db, id);
    return { ok: true };
  },
};
