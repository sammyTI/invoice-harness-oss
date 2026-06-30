import type { Actions, PageServerLoad } from "./$types";
import { DOCUMENT_LABELS, DOCUMENT_ORDER, type DocumentType } from "@invoice-harness/shared";
import { getDB, getSettings, listDocTemplates, setDocTemplate, updateSettings } from "$lib/server/db";

export const load: PageServerLoad = async ({ platform }) => {
  const db = getDB(platform);
  const settings = await getSettings(db);
  const map = await listDocTemplates(db);
  const types = DOCUMENT_ORDER.map((t) => ({ type: t, label: DOCUMENT_LABELS[t], notes: map[t] ?? "" }));
  return { types, accent: settings.accent_color };
};

export const actions: Actions = {
  default: async ({ request, platform }) => {
    const db = getDB(platform);
    const fd = await request.formData();

    for (const t of DOCUMENT_ORDER) {
      await setDocTemplate(db, t as DocumentType, String(fd.get(`notes_${t}`) ?? ""));
    }
    const accent = String(fd.get("accent_color") ?? "").trim();
    if (/^#[0-9a-fA-F]{6}$/.test(accent)) {
      const s = await getSettings(db);
      await updateSettings(db, { ...s, accent_color: accent });
    }
    return { ok: true };
  },
};
