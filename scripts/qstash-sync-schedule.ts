import "dotenv/config";
import { Client } from "@upstash/qstash";

type EnvKey =
  | "QSTASH_TOKEN"
  | "QSTASH_URL"
  | "QSTASH_JOB_PROCESSOR_URL"
  | "QSTASH_JOB_PROCESSOR_SCHEDULE_ID"
  | "QSTASH_JOB_PROCESSOR_CRON"
  | "QSTASH_JOB_PROCESSOR_RETRIES"
  | "QSTASH_JOB_PROCESSOR_TIMEOUT";

function requireEnv(name: EnvKey) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function optionalEnv(name: EnvKey) {
  return process.env[name]?.trim();
}

function parseOptionalInteger(name: EnvKey) {
  const raw = optionalEnv(name);

  if (!raw) {
    return undefined;
  }

  const value = Number.parseInt(raw, 10);

  if (Number.isNaN(value) || value < 0) {
    throw new Error(`Invalid integer for ${name}: ${raw}`);
  }

  return value;
}

async function main() {
  const token = requireEnv("QSTASH_TOKEN");
  const baseUrl = optionalEnv("QSTASH_URL");
  const destination = requireEnv("QSTASH_JOB_PROCESSOR_URL");
  const scheduleId =
    optionalEnv("QSTASH_JOB_PROCESSOR_SCHEDULE_ID") ??
    "usageflow-job-processor";
  const cron = optionalEnv("QSTASH_JOB_PROCESSOR_CRON") ?? "*/5 * * * *";
  const retries = parseOptionalInteger("QSTASH_JOB_PROCESSOR_RETRIES") ?? 0;
  const timeout = parseOptionalInteger("QSTASH_JOB_PROCESSOR_TIMEOUT") ?? 55;

  const client = new Client({
    token,
    ...(baseUrl ? { baseUrl } : {}),
  });

  const existingSchedule = (await client.schedules.list()).find(
    (schedule) => schedule.scheduleId === scheduleId
  );

  if (existingSchedule) {
    console.log(`Deleting existing schedule: ${scheduleId}`);
    await client.schedules.delete(scheduleId);
  }

  const result = await client.schedules.create({
    destination,
    cron,
    method: "POST",
    retries,
    timeout,
    scheduleId,
    body: "{}",
    headers: {
      "Content-Type": "application/json",
    },
  });

  console.log("QStash schedule synced");
  console.log(`scheduleId: ${result.scheduleId}`);
  console.log(`destination: ${destination}`);
  console.log(`cron: ${cron}`);
  console.log(`retries: ${retries}`);
  console.log(`timeoutSeconds: ${timeout}`);
}

main().catch((error) => {
  console.error("Failed to sync QStash schedule");
  console.error(error);
  process.exitCode = 1;
});
