import { execFileSync } from "node:child_process";
import { readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

const [action, directory, runId, role, rawPid] = process.argv.slice(2);
if (!/^[0-9a-f]{8}-[0-9a-f]{3}$/.test(runId ?? "")) throw new Error("Invalid pilot run ID");
const manifestPath = join(directory, "processes.json");
const ps = (...args) => execFileSync("ps", args, { encoding: "utf8" }).trim();
const identity = (pid) => ({ pid, started: ps("-p", String(pid), "-o", "lstart="), command: ps("-p", String(pid), "-o", "command=") });

if (action === "register") {
  if (!/^(api|worker)$/.test(role ?? "") || !Number.isSafeInteger(Number(rawPid)) || Number(rawPid) < 1) throw new Error("Invalid process registration");
  let manifest = { runId, processes: [] };
  try { manifest = JSON.parse(await readFile(manifestPath, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
  if (manifest.runId !== runId) throw new Error("Run ID mismatch");
  manifest.processes.push({ role, ...identity(Number(rawPid)) });
  const temporary = `${manifestPath}.tmp`;
  await writeFile(temporary, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, manifestPath);
} else if (action === "cleanup") {
  let manifest;
  try { manifest = JSON.parse(await readFile(manifestPath, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
  if (manifest) {
    if (manifest.runId !== runId) throw new Error("Run ID mismatch");
    const tree = ps("-axo", "pid=,ppid=").split("\n").map((line) => line.trim().split(/\s+/).map(Number));
    for (const saved of manifest.processes) {
      let current;
      try { current = identity(saved.pid); } catch { continue; }
      if (current.started !== saved.started || current.command !== saved.command) continue;
      const descendants = [];
      const visit = (pid) => { for (const [child, parent] of tree) if (parent === pid) { visit(child); descendants.push(child); } };
      visit(saved.pid);
      for (const pid of [...descendants, saved.pid]) { try { process.kill(pid, "SIGTERM"); } catch (error) { if (error.code !== "ESRCH") throw error; } }
    }
  }
} else {
  throw new Error("Expected register or cleanup");
}
