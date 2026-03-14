import "dotenv/config";
import { Client } from "@upstash/qstash";

type EnvKey =
  | "QSTASH_TOKEN"
  | "QSTASH_URL"
  | "QSTASH_JOB_PROCESSOR_SCHEDULE_ID";

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

async function main() {
  const token = requireEnv("QSTASH_TOKEN");
  const baseUrl = optionalEnv("QSTASH_URL");
  const scheduleId =
    optionalEnv("QSTASH_JOB_PROCESSOR_SCHEDULE_ID") ??
    "usageflow-job-processor";

  const client = new Client({
    token,
    ...(baseUrl ? { baseUrl } : {}),
  });

  const existingSchedule = (await client.schedules.list()).find(
    (schedule) => schedule.scheduleId === scheduleId
  );

  if (!existingSchedule) {
    console.log(`No QStash schedule found for: ${scheduleId}`);
    return;
  }

  await client.schedules.delete(scheduleId);
  console.log(`Deleted QStash schedule: ${scheduleId}`);
}

main().catch((error) => {
  console.error("Failed to delete QStash schedule");
  console.error(error);
  process.exitCode = 1;
});
