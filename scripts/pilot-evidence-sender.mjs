import { createHash } from "node:crypto";
import { open, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const [runId, directory, baseUrl, apiKey] = process.argv.slice(2);
if (!runId || !directory || !baseUrl || !apiKey) throw new Error("Missing sender arguments");
const journalPath = join(directory, "sender-journal.jsonl");
const journal = await open(journalPath, "wx", 0o600);
const occurrence = new Date(Date.now() - 60_000).toISOString();
const original = { customerId: `customer-${runId}`, metric: "CALLS", amount: 3, timestamp: occurrence };
const attempts = [original, original, { ...original, amount: 4 }];
const outcomes = [];

async function append(record) {
  await journal.write(`${JSON.stringify(record)}\n`);
  await journal.sync();
}

try {
  for (let index = 0; index < attempts.length; index++) {
    const payload = JSON.stringify(attempts[index]);
    const attempt = index + 1;
    await append({ type: "send", runId, organization: `org-${runId}`, externalCustomerId: original.customerId, metric: attempts[index].metric, quantity: attempts[index].amount, occurrenceTime: occurrence, idempotencyKey: `event-${runId}`, payload, attempt, sendTime: new Date().toISOString() });
    try {
      const response = await fetch(`${baseUrl}/api/track`, { method: "POST", headers: { "content-type": "application/json", "x-usageflow-api-key": apiKey, "idempotency-key": `event-${runId}` }, body: payload, signal: AbortSignal.timeout(15_000) });
      const body = await response.text();
      const result = { type: "outcome", runId, attempt, completedAt: new Date().toISOString(), classification: response.ok ? "accepted" : "rejected", status: response.status, body };
      await append(result);
      outcomes.push(result);
    } catch (error) {
      const result = { type: "outcome", runId, attempt, completedAt: new Date().toISOString(), classification: "uncertain", transportError: String(error) };
      await append(result);
      outcomes.push(result);
    }
  }
} finally {
  await journal.close();
}

const first = JSON.parse(outcomes[0].body || "null");
const retry = JSON.parse(outcomes[1].body || "null");
if (outcomes[0].classification !== "accepted" || outcomes[1].classification !== "accepted" || !first?.eventId || first.eventId !== retry?.eventId || outcomes[2].status !== 409) {
  throw new Error(`Retry/conflict check failed: ${JSON.stringify(outcomes)}`);
}
const bytes = await readFile(journalPath);
const records = bytes.toString("utf8").trimEnd().split("\n").map((line) => JSON.parse(line));
if (records.length !== 6 || records.some((record, index) => record.type !== (index % 2 === 0 ? "send" : "outcome") || record.attempt !== Math.floor(index / 2) + 1)) {
  throw new Error("Journal integrity check failed");
}
const evidence = { runId, eventId: first.eventId, journal: "sender-journal.jsonl", journalBytes: bytes.length, journalSha256: createHash("sha256").update(bytes).digest("hex"), outcomes: outcomes.map(({ attempt, classification, status }) => ({ attempt, classification, status })) };
await writeFile(join(directory, "smoke-evidence.json"), `${JSON.stringify(evidence, null, 2)}\n`, { flag: "wx", mode: 0o600 });
console.log(JSON.stringify(evidence));
