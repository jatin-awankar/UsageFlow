import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

test("interrupted run cleanup stops only its recorded processes and containers", async () => {
  const root = await mkdtemp(join(tmpdir(), "pilot-cleanup-test-"));
  const runId = "aabbccdd-001";
  const runDir = join(root, runId);
  const binDir = join(root, "bin");
  await mkdir(runDir);
  await mkdir(binDir);
  const dockerCalls = join(root, "docker-calls.txt");
  await writeFile(join(binDir, "docker"), '#!/bin/sh\nprintf "%s\\n" "$*" >> "$DOCKER_CALLS"\n', { mode: 0o755 });
  const managed = spawn("sleep", ["60"]);
  const unrelated = spawn("sleep", ["60"]);
  try {
    const identity = (pid) => ({ pid, started: execFileSync("ps", ["-p", String(pid), "-o", "lstart="], { encoding: "utf8" }).trim(), command: execFileSync("ps", ["-p", String(pid), "-o", "command="], { encoding: "utf8" }).trim() });
    await writeFile(join(runDir, "processes.json"), JSON.stringify({ runId, processes: [identity(managed.pid)] }));
    const result = spawn("bash", ["scripts/test-pilot-evidence.sh", "--cleanup", runId], { env: { ...process.env, PILOT_EVIDENCE_DIR: root, PATH: `${binDir}:${process.env.PATH}`, DOCKER_CALLS: dockerCalls }, stdio: "pipe" });
    const exitCode = await new Promise((resolve) => result.on("exit", resolve));
    assert.equal(exitCode, 0);
    assert.throws(() => process.kill(managed.pid, 0), { code: "ESRCH" });
    assert.doesNotThrow(() => process.kill(unrelated.pid, 0));
    assert.equal((await readFile(dockerCalls, "utf8")).trim(), `rm -f usageflow-pilot-pg-${runId} usageflow-pilot-redis-${runId}`);
  } finally {
    try { process.kill(managed.pid, "SIGKILL"); } catch {}
    try { process.kill(unrelated.pid, "SIGKILL"); } catch {}
  }
});
