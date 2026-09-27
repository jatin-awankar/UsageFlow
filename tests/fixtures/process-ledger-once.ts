import { processLedgerEvent } from "../../worker/processors/processLedgerEvent";

await processLedgerEvent(process.argv[2]);
process.exit(0);
