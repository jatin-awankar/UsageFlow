import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createExportEvidence, sameTotals } from "./pilot-evidence-export.mjs";

test("grouped totals compare values independent of JSON key and row order", () => {
  const expected = [
    { externalCustomerId: "customer-a", metric: "CALLS", count: 2, quantity: 5 },
    { externalCustomerId: "customer-b", metric: "CALLS", count: 1, quantity: 3 },
  ];
  const reordered = [
    { quantity: 3, count: 1, metric: "CALLS", externalCustomerId: "customer-b" },
    { quantity: 5, count: 2, metric: "CALLS", externalCustomerId: "customer-a" },
  ];
  assert.equal(sameTotals(expected, reordered), true);
  assert.equal(sameTotals(expected, [{ ...reordered[0], quantity: 4 }, reordered[1]]), false);
});

test("failed owner export retains HTTP status and partial progress", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pilot-export-failure-"));
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).endsWith("/api/auth/csrf")) return new Response(JSON.stringify({ csrfToken: "test" }), { headers: { "set-cookie": "next-auth.csrf-token=test" } });
    if (String(url).includes("/api/auth/callback/credentials")) return new Response("", { status: 302, headers: { "set-cookie": "next-auth.session-token=test" } });
    return new Response("Synthetic export failure", { status: 503 });
  };
  try {
    await assert.rejects(createExportEvidence({ db: { query: async () => ({ rows: [] }) }, runId: "test-run", directory, baseUrl: "http://127.0.0.1", ownerPassword: "synthetic", occurrence: "2026-09-29T00:00:00.000Z" }), /HTTP 503/);
    const evidence = JSON.parse(await readFile(join(directory, "export-failure.json"), "utf8"));
    assert.equal(evidence.phase, "create");
    assert.equal(evidence.pages, 0);
    assert.equal(evidence.rows, 0);
    assert.equal(evidence.httpErrors[0].status, 503);
    assert.ok(evidence.creationMs >= 0);
  } finally { globalThis.fetch = originalFetch; }
});
