import type { Actions, PageServerLoad } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import { DOCUMENT_LABELS, type DocumentType } from "@invoice-harness/shared";
import { createDocument, createProject, getDB, getDefaultNoteBody, getDocDefaultNotes, getProject, getSettings, listClients, listDivisions, listItems, listIssuers, listNoteTemplates, listProjects, listTaxRates } from "$lib/server/db";
import { getActor } from "$lib/server/audit";
import { allowedIssuerIds, canAccessIssuer } from "$lib/server/access";

const VALID: DocumentType[] = [
  "estimate",
  "delivery_note",
  "order",
  "invoice",
  "receipt",
  "payment_notice",
];

function normType(v: string | null): DocumentType {
  return VALID.includes(v as DocumentType) ? (v as DocumentType) : "invoice";
}

export const load: PageServerLoad = async ({ platform, url, locals }) => {
  const db = getDB(platform);
  const type = normType(url.searchParams.get("type"));
  const allowed = await allowedIssuerIds(db, locals.user);
  // ?project= 指定時はそのプロジェクトに紐づけて作成（顧客もプリセット。売上側=案件の顧客、支払側=支払先を選ぶ）
  const projectId = url.searchParams.get("project");
  const project = projectId ? await getProject(db, projectId) : null;
  const settings = await getSettings(db);
  // 案件は「顧客→プロジェクト」連動のためクライアントに渡すが、
  // アクセス外の会社の案件が選択肢に出るバグを防ぐため allowedIssuerIds でフィルタ（projectsページ実装を踏襲）。
  // クライアント側で必要なのは id/name/client_id/issuer_id/division_id のみ。
  const projects = (await listProjects(db))
    .filter((pr) => pr.status !== "done")
    .filter((pr) => !pr.issuer_id || canAccessIssuer(allowed, pr.issuer_id))
    .map((pr) => ({ id: pr.id, name: pr.name, client_id: pr.client_id, issuer_id: pr.issuer_id, division_id: pr.division_id }));
  return {
    type,
    project: project ? { id: project.id, name: project.name, client_id: project.client_id, issuer_id: project.issuer_id, division_id: project.division_id } : null,
    projects,
    label: DOCUMENT_LABELS[type],
    issuers: (await listIssuers(db)).filter((i) => canAccessIssuer(allowed, i.id)),
    clients: await listClients(db),
    items: await listItems(db),
    taxRates: await listTaxRates(db),
    // 全社共通(issuer_id=null)＋閲覧可能な会社の部門のみ（他社の部門名をクライアントに渡さない）
    divisions: (await listDivisions(db)).filter((d) => !d.issuer_id || canAccessIssuer(allowed, d.issuer_id)),
    // 種別ごとの既定備考があれば優先、なければ「既定」備考テンプレートを初期表示
    defaultNotes: (await getDocDefaultNotes(db, type)) || (await getDefaultNoteBody(db)),
    noteTemplates: await listNoteTemplates(db),
    showTxn: settings.invoice_show_transaction_date,
    requireProject: settings.require_project,
  };
};

export const actions: Actions = {
  default: async ({ request, platform, locals }) => {
    const db = getDB(platform);
    const fd = await request.formData();

    const type = normType(String(fd.get("type") ?? ""));
    const issuer_id = String(fd.get("issuer_id") ?? "");
    let client_id = String(fd.get("client_id") ?? "");
    const issue_date = String(fd.get("issue_date") ?? "");

    const allowed = await allowedIssuerIds(db, locals.user);
    if (!canAccessIssuer(allowed, issuer_id)) return fail(403, { error: "この会社（発行元）で作成する権限がありません。" });

    // 新規取引先をその場で登録（client_id が "__new__" のとき）
    if (client_id === "__new__") {
      const newName = String(fd.get("new_client_name") ?? "").trim();
      if (!newName) return fail(400, { error: "新規取引先名を入力してください。" });
      const newId = crypto.randomUUID();
      await db
        .prepare(
          `INSERT INTO clients (id, name, honorific, contact, postal_code, address, email)
           VALUES (?1,?2,?3,?4,?5,?6,?7)`
        )
        .bind(
          newId,
          newName,
          String(fd.get("new_client_honorific") ?? "御中") || "御中",
          String(fd.get("new_client_contact") ?? "") || null,
          String(fd.get("new_client_postal") ?? "") || null,
          String(fd.get("new_client_address") ?? "") || null,
          String(fd.get("new_client_email") ?? "") || null
        )
        .run();
      client_id = newId;
    }
    const due_date = String(fd.get("due_date") ?? "") || null;
    const subject = String(fd.get("subject") ?? "") || null;
    const notes = String(fd.get("notes") ?? "") || null;
    const division_id = String(fd.get("division_id") ?? "") || null;

    const names = fd.getAll("line_name").map((v) => String(v));
    const qtys = fd.getAll("line_qty").map((v) => Number(v) || 0);
    const units = fd.getAll("line_unit").map((v) => String(v));
    const prices = fd.getAll("line_price").map((v) => Number(v) || 0);
    const rates = fd.getAll("line_rate").map((v) => Number(v) || 10);
    const txnDates = fd.getAll("line_txn_date").map((v) => String(v).trim() || null);

    const lines = names
      .map((n, i) => ({
        name: n,
        quantity: qtys[i] ?? 1,
        unit: units[i] || "式",
        unit_price: prices[i] ?? 0,
        tax_rate: rates[i] ?? 10,
        txn_date: txnDates[i] ?? null,
      }))
      .filter((l) => l.name.trim() !== "");

    if (!issuer_id || !client_id || !issue_date || lines.length === 0) {
      return fail(400, { error: "発行元・取引先・発行日・明細1行以上は必須です。" });
    }

    // プロジェクト（案件）の解決。__new__ ならその場で新規作成して紐づける。
    const rawProject = String(fd.get("project_id") ?? "");
    let project_id: string | null = rawProject || null;
    if (rawProject === "__new__") {
      const prjName = String(fd.get("project_new_name") ?? "").trim();
      if (!prjName) return fail(400, { error: "新規プロジェクト名を入力してください。" });
      // 顧客→プロジェクト→帳票の階層に沿って、この帳票の取引先・発行元・計上区分・発行日で案件を起票。
      project_id = await createProject(db, {
        name: prjName,
        client_id,
        issuer_id,
        division_id,
        status: "active",
        start_date: issue_date,
      });
    } else if (project_id) {
      // 既存プロジェクト選択時の誤請求防止（最終防衛線）:
      // 選ばれた案件の顧客と送信された取引先が食い違っていたら弾く。
      const prj = await getProject(db, project_id);
      if (prj && prj.client_id !== client_id) {
        return fail(400, { error: "選択したプロジェクトは別の顧客の案件です。取引先とプロジェクトを確認してください。" });
      }
    }

    const settings = await getSettings(db);
    if (settings.require_project && !project_id) {
      return fail(400, { error: "プロジェクトを選択してください（設定で必須になっています）" });
    }

    const id = await createDocument(
      db,
      // 発行者＝ログイン中メンバー名を帳票にスナップショット（「担当：」に表示）。
      { type, issuer_id, client_id, issue_date, due_date, subject, notes, division_id, project_id, issuer_person: locals.user?.name ?? null, lines },
      getActor({ request, locals })
    );

    throw redirect(303, `/doc/${id}`);
  },
};
