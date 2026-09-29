import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { test } from "node:test";

const evidencePath = process.env.PILOT_EXPORT_EVIDENCE_PATH;

test("CLI export evidence verifies every snapshot processing state against the transactional ledger capture", { skip: !evidencePath }, async () => {
  const evidence = JSON.parse(await readFile(evidencePath, "utf8"));
  const rowsText = await readFile(join(dirname(evidencePath), evidence.rowsFile), "utf8");
  const rows = rowsText.trimEnd().split("\n").map(line => JSON.parse(line));
  const actual = createHash("sha256")
    .update(rows.map(row => JSON.stringify([row.eventId, row.processingState])).join("\n"))
    .digest("hex");

  assert.equal(rows.length, evidence.rowCount);
  assert.equal(evidence.snapshotLedgerStateSha256, actual);
  assert.equal(evidence.independentlyVerifiedStates, evidence.rowCount);
});
