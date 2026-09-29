import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

async function runFaultFixture(overrides) {
  const root = await mkdtemp(join(tmpdir(), "pilot-fault-acceptance-"));
  const env = { ...process.env, PILOT_EVIDENCE_DIR: root, PILOT_FAULT_COUNT: "2", PILOT_FAULT_ONLY: "baseline", ...overrides };
  delete env.NODE_TEST_CONTEXT;
  const child = spawn("npm", ["run", "test:pilot-evidence", "--", "--faults"], {
    cwd: process.cwd(),
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", chunk => { output += chunk; });
  child.stderr.on("data", chunk => { output += chunk; });
  const exitCode = await new Promise(resolve => child.on("exit", resolve));
  const directories = await readdir(root);
  assert.equal(directories.length, 1, output);
  const directory = join(root, directories[0]);
  let report;
  try { report = JSON.parse(await readFile(join(directory, "fault-evidence.json"), "utf8")); } catch (error) { throw new Error(`${error}\n${output}`); }
  return { exitCode, output, directory, report };
}

test("fault evidence rejects an unjournaled accepted event", async () => {
  const result = await runFaultFixture({ PILOT_FAULT_TEST_EXTRA_EVENT: "true" });
  assert.notEqual(result.exitCode, 0, result.output);
  assert.match(result.report.failures.join("\n"), /extra raw event/i);
  assert.equal(result.report.scenarios.baseline.journalExpected.count, 2);
});

test("a lost HTTP response is resolved by organization and key before replay", async () => {
  const result = await runFaultFixture({ PILOT_FAULT_TEST_LOST_RESPONSE: "baseline:0" });
  assert.equal(result.exitCode, 0, result.output);
  const baseline = result.report.scenarios.baseline;
  assert.equal(baseline.sample.uncertainResponses, 1);
  assert.equal(baseline.attemptClassifications["fault-" + result.report.runId + "-baseline-0"].classification, "committed-original");
  assert.equal(baseline.sample.replacementIds, 0);
});

test("post-claim crash does not pass while queue work remains active", async () => {
  const result = await runFaultFixture({ PILOT_FAULT_ONLY: "worker-crash", PILOT_FAULT_DRAIN_SECONDS: "120" });
  assert.equal(result.exitCode, 0, result.output);
  const crash = result.report.scenarios["worker-crash"];
  assert.equal(crash.queueDrainedAtFinal, true);
  assert.equal(crash.checkpoints.at(-1).queue.active, 0);
});

test("worker stop is injected while an event is claimed", async () => {
  const result = await runFaultFixture({ PILOT_FAULT_ONLY: "worker-stop", PILOT_FAULT_DRAIN_SECONDS: "120" });
  assert.equal(result.exitCode, 0, result.output);
  assert.ok(result.report.scenarios["worker-stop"].claimedAtStop >= 1);
});

test("an interrupted fault run retains a hashed journal and failure report", async () => {
  const result = await runFaultFixture({ PILOT_FAULT_TEST_ABORT_AFTER: "baseline:interrupted" });
  assert.notEqual(result.exitCode, 0, result.output);
  assert.equal(result.report.runFailure.scenario, "baseline");
  assert.ok(result.report.journal.sha256);
  assert.ok(result.report.journal.bytes > 0);
});

test("an unavailable original-ID lookup stays unresolved after replay", async () => {
  const result = await runFaultFixture({ PILOT_FAULT_TEST_LOST_RESPONSE: "baseline:0", PILOT_FAULT_TEST_LOOKUP_UNAVAILABLE: "baseline:0" });
  assert.notEqual(result.exitCode, 0, result.output);
  const baseline = result.report.scenarios.baseline;
  assert.equal(baseline.attemptClassifications[`fault-${result.report.runId}-baseline-0`].classification, "unresolved");
  assert.equal(baseline.sample.unresolvedAttempts, 1);
  assert.equal(baseline.sample.replacementIds, 0);
});

test("fault report reconciles organization, Customer, metric, and UTC month totals", async () => {
  const result = await runFaultFixture({});
  assert.equal(result.exitCode, 0, result.output);
  const groups = Object.values(result.report.scenarios.baseline.checkpoints.at(-1).groups);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].expected.count, 2);
  assert.equal(groups[0].expected.quantity, 3);
  assert.deepEqual(groups[0].actual, { rawCount: 2, rawQuantity: 3, projectedCount: 2, projectedQuantity: 3, ratedCount: 2, ratedQuantity: 3, ratedAmount: 3 });
});
