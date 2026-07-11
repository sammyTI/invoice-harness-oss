import type { PageServerLoad } from "./$types";
import { getDB, listIssuers, searchDocuments } from "$lib/server/db";
import { allowedIssuerIds, canAccessIssuer } from "$lib/server/access";

export const load: PageServerLoad = async ({ platform, url, locals }) => {
  const db = getDB(platform);
  const allowed = await allowedIssuerIds(db, locals.user);
  const q = url.searchParams.get("q") ?? "";
  const dateFrom = url.searchParams.get("from") ?? "";
  const dateTo = url.searchParams.get("to") ?? "";
  const amountMin = url.searchParams.get("min");
  const amountMax = url.searchParams.get("max");
  // 会社（発行元）で絞り込み。閲覧可能な発行元のみ許可。
  const issRaw = url.searchParams.get("iss") ?? "";
  const iss = issRaw && canAccessIssuer(allowed, issRaw) ? issRaw : "";

  const hasQuery = q || dateFrom || dateTo || amountMin || amountMax || iss;
  const results = hasQuery
    ? await searchDocuments(db, {
        q,
        dateFrom,
        dateTo,
        amountMin: amountMin ? Number(amountMin) : null,
        amountMax: amountMax ? Number(amountMax) : null,
        issuerId: iss,
      }, allowed)
    : [];

  const issuers = (await listIssuers(db)).filter((i) => canAccessIssuer(allowed, i.id));

  return {
    q, dateFrom, dateTo, amountMin: amountMin ?? "", amountMax: amountMax ?? "",
    iss, issuers: issuers.map((i) => ({ id: i.id, name: i.name })),
    results, hasQuery: !!hasQuery,
  };
};
