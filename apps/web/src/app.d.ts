import type { D1Database, R2Bucket } from "@cloudflare/workers-types";
import type { SessionUser } from "$lib/server/auth";

declare global {
  namespace App {
    interface Locals {
      user?: SessionUser;
      apiActor?: string;
      /** APIトークンの権限スコープ（full=全操作 / readonly=参照のみ）。 */
      apiScope?: "full" | "readonly";
    }
    interface Platform {
      env: {
        DB: D1Database;
        FILES?: R2Bucket;
        RESEND_API_KEY?: string;
        MAIL_FROM?: string;
      };
    }
  }
}

export {};
