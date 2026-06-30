import type { Actions, PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { getDB } from "$lib/server/db";
import { deleteSession, SESSION_COOKIE } from "$lib/server/auth";

export const load: PageServerLoad = async () => {
  throw redirect(303, "/");
};

export const actions: Actions = {
  default: async ({ platform, cookies }) => {
    const token = cookies.get(SESSION_COOKIE);
    if (token) {
      try {
        await deleteSession(getDB(platform), token);
      } catch {
        // ignore
      }
    }
    cookies.delete(SESSION_COOKIE, { path: "/" });
    throw redirect(303, "/login");
  },
};
