import { createHash } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

const [directory, runId, exitStatus, scenario, phase] = process.argv.slice(2);
const reportPath = join(directory, "fault-evidence.json");
let report;
try { report = JSON.parse(await readFile(reportPath, "utf8")); }
catch (error) { if (error.code !== "ENOENT") throw error; report = { runId, scenarios: {}, failures: [] }; }
let bytes;
try { bytes = await readFile(join(directory, "fault-sender-journal.jsonl")); }
catch (error) { if (error.code !== "ENOENT") throw error; bytes = Buffer.alloc(0); }
report.endedAt = new Date().toISOString();
report.journal = { file: "fault-sender-journal.jsonl", bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
report.runFailure = { scenario, phase, exitStatus: Number(exitStatus), recordedAt: report.endedAt };
report.failures ||= [];
report.failures.push(`Run exited ${exitStatus} during ${scenario}:${phase}`);
const temporary = `${reportPath}.tmp`;
await writeFile(temporary, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
await rename(temporary, reportPath);
