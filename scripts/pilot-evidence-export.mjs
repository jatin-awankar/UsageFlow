import { createWriteStream } from "node:fs";
import { once } from "node:events";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const timeout = (ms) => AbortSignal.timeout(ms);
const orgRowsSql = `SELECT e.id, e."idempotencyKey" AS key, e.amount AS quantity,
  e."metricKey" AS metric, e."processingState" AS state, e."timestamp" AS occurred,
  e."receivedAt" AS received, c."externalId" AS customer, i."failureReason" AS failure
  FROM "UsageEvent" e LEFT JOIN "Customer" c ON c.id = e."billedCustomerId" AND c."orgId" = e."orgId"
  LEFT JOIN "LedgerProcessingIntent" i ON i."eventId" = e.id
  WHERE e."orgId" = $1 AND e."billingTreatment" = 'LEDGER_ONLY'
  ORDER BY e.id`;

function cookies(response) {
  return response.headers.getSetCookie().map(value => value.split(";", 1)[0]).join("; ");
}

async function ownerCookie(baseUrl, runId, password) {
  if (!password) throw new Error("Synthetic owner password missing");
  const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`, { signal: timeout(30_000) });
  if (!csrfResponse.ok) throw new Error(`Owner CSRF HTTP ${csrfResponse.status}`);
  const csrf = await csrfResponse.json();
  const initialCookies = cookies(csrfResponse);
  const body = new URLSearchParams({ csrfToken: csrf.csrfToken, email: `pilot-${runId}@example.test`, password, callbackUrl: `${baseUrl}/app`, json: "true" });
  const login = await fetch(`${baseUrl}/api/auth/callback/credentials`, { method: "POST", headers: { cookie: initialCookies, "content-type": "application/x-www-form-urlencoded" }, body, redirect: "manual", signal: timeout(30_000) });
  const sessionCookie = login.headers.getSetCookie().find(value => /(?:^|\s)(?:__Secure-)?next-auth\.session-token=/.test(value));
  if (!sessionCookie) throw new Error(`Owner sign-in failed: HTTP ${login.status}`);
  return `${initialCookies}; ${sessionCookie.split(";", 1)[0]}`;
}

async function apiJson(url, options, label, httpErrors) {
  let response;
  try { response = await fetch(url, { ...options, signal: timeout(options.timeoutMs) }); }
  catch (error) { httpErrors.push({ label, error: String(error) }); throw new Error(`${label}: ${String(error)}`); }
  if (!response.ok) {
    const body = (await response.text()).slice(0, 300);
    httpErrors.push({ label, status: response.status, body });
    throw new Error(`${label}: HTTP ${response.status}: ${body}`);
  }
  return response.json();
}

function grouped(rows, customerField, metricField) {
  const groups = new Map();
  for (const row of rows) {
    const key = JSON.stringify([row[customerField], row[metricField]]);
    const group = groups.get(key) ?? { externalCustomerId: row[customerField], metric: row[metricField], count: 0, quantity: 0 };
    group.count++;
    group.quantity += row.quantity;
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

function totalsSignature(groups) {
  return groups.map(group => [group.externalCustomerId, group.metric, group.count, group.quantity])
    .sort((a, b) => JSON.stringify(a.slice(0, 2)).localeCompare(JSON.stringify(b.slice(0, 2))));
}

export function sameTotals(a, b) {
  return JSON.stringify(totalsSignature(a)) === JSON.stringify(totalsSignature(b));
}

export async function createExportEvidence({ db, runId, directory, baseUrl, ownerPassword, occurrence, expectConcurrent = true }) {
  const orgId = `org-${runId}`;
  const failures = [];
  const httpErrors = [];
  const progress = { runId, phase: "before-ledger", httpErrors, pages: 0, rows: 0, creationMs: null, paginationMs: null };
  try {
  const before = (await db.query(orgRowsSql, [orgId])).rows;
  progress.beforeAccepted = before.length;
  progress.phase = "owner-auth";
  const owner = await ownerCookie(baseUrl, runId, ownerPassword);
  const period = occurrence.slice(0, 7);
  const creationStart = performance.now();
  progress.creationStartedAt = new Date().toISOString();
  progress.creationStartedMs = creationStart;
  progress.phase = "create";
  const created = await apiJson(`${baseUrl}/api/ledger-exports`, { method: "POST", headers: { cookie: owner, "content-type": "application/json" }, body: JSON.stringify({ orgId, period }), timeoutMs: 180_000 }, "create", httpErrors);
  const creationMs = performance.now() - creationStart;
  progress.creationMs = creationMs;
  progress.snapshotId = created.id;
  progress.phase = "after-ledger";
  const after = (await db.query(orgRowsSql, [orgId])).rows;
  progress.afterAccepted = after.length;
  const persisted = (await db.query(`SELECT "eventId", "externalCustomerId", metric, quantity, "processingState", "failureReason" FROM "LedgerExportRow" WHERE "exportId" = $1 ORDER BY position`, [created.id])).rows;
  const beforeById = new Map(before.map(row => [row.id, row]));
  const afterById = new Map(after.map(row => [row.id, row]));
  const persistedById = new Map(persisted.map(row => [row.eventId, row]));
  const acceptedDuringCreation = after.filter(row => !beforeById.has(row.id)).length;
  if (expectConcurrent && (before.length >= 100_000 || after.length <= before.length)) failures.push(`Snapshot did not bracket ongoing acceptance: before=${before.length}, after=${after.length}`);
  if (!expectConcurrent && before.length !== after.length) failures.push(`Ledger changed during steady-state export: before=${before.length}, after=${after.length}`);
  if (created.rowCount < before.length || created.rowCount > after.length) failures.push(`Snapshot count ${created.rowCount} is outside accepted-ledger bracket ${before.length}..${after.length}`);
  if (created.rowCount !== persisted.length || persistedById.size !== persisted.length) failures.push(`Persisted snapshot count/unique IDs ${persisted.length}/${persistedById.size} differs from API ${created.rowCount}`);
  for (const row of before) if (!persistedById.has(row.id)) { if (failures.length < 30) failures.push(`Pre-snapshot accepted ID missing: ${row.id}`); }
  let concurrentIncluded = 0;
  let stateTransitions = 0;
  for (const row of persisted) {
    const raw = afterById.get(row.eventId);
    if (!raw) { if (failures.length < 30) failures.push(`Exported ID absent from accepted ledger: ${row.eventId}`); continue; }
    if (!beforeById.has(row.eventId)) concurrentIncluded++;
    if (raw.customer !== row.externalCustomerId || raw.metric !== row.metric || raw.quantity !== row.quantity) { if (failures.length < 30) failures.push(`Ledger fields differ for ${row.eventId}`); }
    const prior = beforeById.get(row.eventId);
    if (prior && prior.state === raw.state && prior.failure === raw.failure) {
      if (row.processingState !== raw.state || row.failureReason !== raw.failure) { if (failures.length < 30) failures.push(`Stable processing state differs for ${row.eventId}`); }
    } else if (prior) stateTransitions++;
  }
  const rowsPath = join(directory, "export-rows.jsonl");
  const stream = createWriteStream(rowsPath, { flags: "wx", mode: 0o600 });
  const exported = [];
  const seen = new Set();
  let pages = 0;
  let cursor = null;
  const cursors = new Set();
  const paginationStart = performance.now();
  progress.paginationStartedAt = new Date().toISOString();
  progress.paginationStartedMs = paginationStart;
  progress.phase = "pagination";
  try {
    do {
      if (performance.now() - paginationStart > 30 * 60_000) throw new Error("Pagination total timeout");
      const url = new URL(`${baseUrl}/api/ledger-exports/${created.id}`);
      url.searchParams.set("orgId", orgId);
      if (cursor) url.searchParams.set("cursor", cursor);
      const page = await apiJson(url, { headers: { cookie: owner }, timeoutMs: 30_000 }, `page ${pages + 1}`, httpErrors);
      pages++;
      progress.pages = pages;
      if (page.id !== created.id || JSON.stringify(page.totals) !== JSON.stringify(created.totals)) failures.push(`Page ${pages} metadata differs`);
      for (const row of page.rows ?? []) {
        if (seen.has(row.eventId)) { if (failures.length < 30) failures.push(`Duplicate exported ID: ${row.eventId}`); }
        seen.add(row.eventId);
        exported.push(row);
        progress.rows = exported.length;
        if (!stream.write(`${JSON.stringify(row)}\n`)) await once(stream, "drain");
      }
      cursor = page.nextCursor;
      if (cursor && cursors.has(cursor)) throw new Error(`Repeated cursor on page ${pages}`);
      if (cursor) cursors.add(cursor);
    } while (cursor);
  } finally { stream.end(); await once(stream, "finish"); }
  const paginationMs = performance.now() - paginationStart;
  progress.paginationMs = paginationMs;
  progress.phase = "reconciliation";
  const rowBytes = await readFile(rowsPath);
  const snapshotLedgerStateSha256 = createHash("sha256")
    .update(exported.map(row => JSON.stringify([row.eventId, row.processingState])).join("\n"))
    .digest("hex");
  const stateDigestMatched = created.snapshotLedgerStateSha256 === snapshotLedgerStateSha256;
  const independentlyVerifiedStates = stateDigestMatched ? exported.length : 0;
  if (!stateDigestMatched || independentlyVerifiedStates !== created.rowCount) failures.push("Export processing states differ from the transactional ledger capture");
  const exportedById = new Map(exported.map(row => [row.eventId, row]));
  for (const row of persisted) {
    const received = exportedById.get(row.eventId);
    if (!received) { if (failures.length < 30) failures.push(`Persisted snapshot ID missing from API: ${row.eventId}`); continue; }
    if (received.externalCustomerId !== row.externalCustomerId || received.metric !== row.metric || received.quantity !== row.quantity || received.processingState !== row.processingState || received.failureReason !== row.failureReason) { if (failures.length < 30) failures.push(`API row differs from snapshot: ${row.eventId}`); }
  }
  for (const row of exported) if (!persistedById.has(row.eventId)) { if (failures.length < 30) failures.push(`Extra API ID: ${row.eventId}`); }
  if (exported.length !== created.rowCount || seen.size !== created.rowCount) failures.push(`API row count/unique IDs ${exported.length}/${seen.size} differs from ${created.rowCount}`);
  if (!sameTotals(grouped(exported, "externalCustomerId", "metric"), created.totals)) failures.push("API grouped totals differ from snapshot totals");
  if (!sameTotals(grouped(persisted, "externalCustomerId", "metric"), created.totals)) failures.push("Persisted grouped totals differ from snapshot totals");
  const stateCounts = Object.fromEntries(["PENDING", "PROCESSING", "PROCESSED", "FAILED"].map(state => [state.toLowerCase(), exported.filter(row => row.processingState === state).length]));
  return { snapshotId: created.id, createdAt: created.createdAt, creationMs, paginationMs, pages, rowCount: exported.length, uniqueIds: seen.size, beforeAccepted: before.length, afterAccepted: after.length, acceptedDuringCreation, concurrentIncluded, concurrentExcluded: acceptedDuringCreation - concurrentIncluded, stateTransitionsDuringCreation: stateTransitions, independentlyVerifiedStates, snapshotLedgerStateSha256: created.snapshotLedgerStateSha256, stateDigestMatched, stateCounts, snapshotTotals: created.totals, groupedTotals: grouped(exported, "externalCustomerId", "metric"), httpErrors, rowsFile: "export-rows.jsonl", rowsBytes: rowBytes.length, rowsSha256: createHash("sha256").update(rowBytes).digest("hex"), ids: [...seen], failures };
  } catch (error) {
    if (progress.phase === "create") progress.creationMs = performance.now() - progress.creationStartedMs;
    if (progress.phase === "pagination") progress.paginationMs = performance.now() - progress.paginationStartedMs;
    delete progress.creationStartedMs;
    delete progress.paginationStartedMs;
    progress.failure = String(error);
    progress.failedAt = new Date().toISOString();
    await writeFile(join(directory, "export-failure.json"), `${JSON.stringify(progress, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    throw error;
  }
}

export async function reconcileRatingEvidence(db, runId, ids) {
  const failures = [];
  const counts = { rated: 0, unrated: 0, retry: 0, ratingFailure: 0, pending: 0, processing: 0, failed: 0 };
  let ratedAmount = 0;
  const idSet = new Set(ids);
  const { rows } = await db.query(`SELECT e.id, e.amount AS quantity, e."processingState" AS state, r.quantity AS rated_quantity,
    r.amount AS rated_amount, r.currency, r."priceVersionId" AS price_id, r."unitPriceMicros" AS unit_price,
    p.currency AS price_currency, p."unitPriceMicros" AS price_unit,
    p."effectiveFrom" <= e.timestamp AS price_effective,
    u."eventId" IS NOT NULL AS unrated, rr."eventId" IS NOT NULL AS retry, rf."eventId" IS NOT NULL AS failure
    FROM "UsageEvent" e LEFT JOIN "RatedEvent" r ON r."eventId" = e.id
    LEFT JOIN "PriceVersion" p ON p.id = r."priceVersionId"
    LEFT JOIN "UnratedEvent" u ON u."eventId" = e.id LEFT JOIN "RatingRetry" rr ON rr."eventId" = e.id
    LEFT JOIN "RatingFailure" rf ON rf."eventId" = e.id WHERE e."orgId" = $1 AND e."billingTreatment" = 'LEDGER_ONLY'`, [`org-${runId}`]);
  let matched = 0;
  for (const row of rows) {
    if (!idSet.has(row.id)) continue;
    matched++;
    if (row.state === "PENDING") counts.pending++;
    if (row.state === "PROCESSING") counts.processing++;
    if (row.state === "FAILED") counts.failed++;
    if (row.unrated) counts.unrated++;
    if (row.retry) counts.retry++;
    if (row.failure) counts.ratingFailure++;
    if (row.rated_quantity !== null) {
      counts.rated++;
      ratedAmount += Number(row.rated_amount);
      if (row.rated_quantity !== row.quantity || row.price_id !== `price-${runId}` || row.currency !== "USD" || row.price_currency !== "USD" || String(row.unit_price) !== "1000000" || String(row.price_unit) !== "1000000" || row.price_effective !== true || Number(row.rated_amount) !== row.quantity) { if (failures.length < 30) failures.push(`Persisted rating mismatch: ${row.id}`); }
    }
  }
  if (matched !== ids.length) failures.push(`Rating evidence found ${matched}/${ids.length} exported IDs`);
  if (counts.rated !== ids.length) failures.push(`Rated ${counts.rated}/${ids.length} exported events`);
  const expectedAmount = rows.filter(row => idSet.has(row.id)).reduce((sum, row) => sum + row.quantity, 0);
  if (ratedAmount !== expectedAmount) failures.push(`Persisted rated amount ${ratedAmount} differs from expected ${expectedAmount}`);
  return { denominator: ids.length, counts, ratedAmount, expectedAmount, failures };
}
