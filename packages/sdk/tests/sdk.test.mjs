import { test } from "node:test";
import assert from "node:assert/strict";
import { InvoiceHarness, InvoiceHarnessError } from "../dist/index.mjs";

// fetch をスタブして「正しいURL・メソッド・ヘッダ・ボディ」を組み立てているか検証する。
function stub(expected) {
  const calls = [];
  const fetch = async (urlStr, init) => {
    calls.push({ url: urlStr, init });
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
    };
  };
  return { fetch, calls };
}

test("コンストラクタは baseUrl / token を必須にする", () => {
  assert.throws(() => new InvoiceHarness({ token: "x", fetch: () => {} }), /baseUrl/);
  assert.throws(() => new InvoiceHarness({ baseUrl: "https://x", fetch: () => {} }), /token/);
});

test("末尾スラッシュを正規化し Bearer を付ける", async () => {
  const { fetch, calls } = stub();
  const ih = new InvoiceHarness({ baseUrl: "https://x.pages.dev/", token: "tok", fetch });
  await ih.issuers.list();
  assert.equal(calls[0].url, "https://x.pages.dev/api/issuers");
  assert.equal(calls[0].init.method, "GET");
  assert.equal(calls[0].init.headers.Authorization, "Bearer tok");
});

test("create は POST + JSON ボディ", async () => {
  const { fetch, calls } = stub();
  const ih = new InvoiceHarness({ baseUrl: "https://x", token: "t", fetch });
  await ih.documents.create({ type: "invoice", client_name: "A", lines: [] });
  assert.equal(calls[0].url, "https://x/api/documents");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(calls[0].init.body), { type: "invoice", client_name: "A", lines: [] });
});

test("search はクエリ文字列を組む", async () => {
  const { fetch, calls } = stub();
  const ih = new InvoiceHarness({ baseUrl: "https://x", token: "t", fetch });
  await ih.documents.search({ q: "商事", min: 1000 });
  assert.match(calls[0].url, /\/api\/search\?/);
  assert.match(calls[0].url, /q=/);
  assert.match(calls[0].url, /min=1000/);
});

test("非 2xx は InvoiceHarnessError を投げる", async () => {
  const fetch = async () => ({ ok: false, status: 404, text: async () => "not found" });
  const ih = new InvoiceHarness({ baseUrl: "https://x", token: "t", fetch });
  await assert.rejects(() => ih.documents.get("nope"), (e) => {
    assert.ok(e instanceof InvoiceHarnessError);
    assert.equal(e.status, 404);
    return true;
  });
});
