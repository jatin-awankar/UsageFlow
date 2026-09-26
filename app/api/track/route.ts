import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import prisma from "@/lib/prisma";
import { hashApiKey } from "@/lib/apiKeys/generateKey";
import { usageQueue } from "@/lib/queue";
import { customerLinkedUsageEventSchema, usageEventSchema } from "@/lib/validators";

function billableFingerprint(customerId: string | null, metric: string, amount: number, timestamp: Date) {
  return createHash("sha256").update(JSON.stringify([customerId, metric, amount, timestamp.toISOString()])).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-usageflow-api-key");
    if (!apiKey) {
      return NextResponse.json({ error: "Missing API key" }, { status: 401 });
    }

    const hashed = hashApiKey(apiKey);

    const keyRecord = await prisma.apiKey.findFirst({
      where: {
        hashedKey: hashed,
        active: true,
      },
    });

    if (!keyRecord) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const idempotencyKey = req.headers.get("idempotency-key")?.trim() || null;

    // Pilot ingestion stays disabled until the Customer billing pipeline is ready.
    const customerLinkedIngestion = process.env.CUSTOMER_LINKED_INGESTION_ENABLED === "true";
    const parsedBody = (customerLinkedIngestion ? customerLinkedUsageEventSchema : usageEventSchema).safeParse(await req.json());

    if (!parsedBody.success || (customerLinkedIngestion && (!idempotencyKey || !parsedBody.data.metric.trim()))) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const metric = parsedBody.data.metric.trim().toUpperCase();
    const amount = parsedBody.data.amount;
    const customerId = parsedBody.data.customerId?.trim() || null;
    const metadata = parsedBody.data.metadata ?? {};
    const timestamp = parsedBody.data.timestamp
      ? new Date(parsedBody.data.timestamp)
      : undefined;
    const fingerprint = customerLinkedIngestion && timestamp
      ? billableFingerprint(customerId, metric, amount, timestamp)
      : null;
    const originalResult = (event: { id: string }) => NextResponse.json({ success: true, eventId: event.id, acceptance: "ACCEPTED" });
    const conflict = () => NextResponse.json({ error: "Idempotency key conflicts with original event" }, { status: 409 });
    const matches = (event: { billableFingerprint: string | null; billingTreatment: string; customerId: string | null; metricKey: string; amount: number; timestamp: Date }) =>
      event.billingTreatment === "LEDGER_ONLY" && (event.billableFingerprint ?? billableFingerprint(event.customerId, event.metricKey, event.amount, event.timestamp)) === fingerprint;
    if (customerLinkedIngestion) {
      const existing = await prisma.usageEvent.findUnique({ where: { orgId_idempotencyKey: { orgId: keyRecord.orgId, idempotencyKey: idempotencyKey! } } });
      if (existing) return matches(existing) ? originalResult(existing) : conflict();
    }
    // The override is used only by the disposable PostgreSQL integration suite.
    const receivedAt = process.env.NODE_ENV !== "production" && process.env.LEDGER_TEST_RECEIPT_TIME
      ? new Date(process.env.LEDGER_TEST_RECEIPT_TIME)
      : new Date();
    if (customerLinkedIngestion && timestamp) {
      const monthClose = Date.UTC(timestamp.getUTCFullYear(), timestamp.getUTCMonth() + 1, 1) + 72 * 60 * 60 * 1000;
      if (receivedAt.getTime() > monthClose || timestamp.getTime() > receivedAt.getTime() + 5 * 60 * 1000) {
        return NextResponse.json({ error: "Occurrence time outside permitted window" }, { status: 400 });
      }
    }

    // 4️⃣ Active subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        orgId: keyRecord.orgId,
        status: "ACTIVE",
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "No active subscription" },
        { status: 403 }
      );
    }

    const customer = customerLinkedIngestion
      ? await prisma.customer.findFirst({
          where: { orgId: keyRecord.orgId, externalId: customerId!, active: true },
        })
      : null;
    if (customerLinkedIngestion && !customer) {
      return NextResponse.json({ error: "Unknown or inactive customer ID" }, { status: 400 });
    }

    // 5️⃣ Metric validation
    const metricRecord = await prisma.metric.findFirst({
      where: {
        orgId: keyRecord.orgId,
        key: metric,
      },
    });

    if (!metricRecord) {
      return NextResponse.json({ error: "Unknown metric" }, { status: 400 });
    }

    try {
      const eventData = {
        orgId: keyRecord.orgId,
        subscriptionId: subscription.id,
        apiKeyId: keyRecord.id,
        metricId: metricRecord.id,
        metricKey: metric,
        amount,
        customerId,
        metadata,
        idempotencyKey,
      };
      const event = customerLinkedIngestion ? await prisma.$transaction(async (tx) => {
        const accepted = await tx.usageEvent.create({
          data: {
            ...eventData,
            billedCustomerId: customer!.id,
            billingTreatment: "LEDGER_ONLY",
            receivedAt,
            processingState: "PENDING",
            billableFingerprint: fingerprint,
            timestamp: timestamp!,
          },
        });
        await tx.ledgerProcessingIntent.create({ data: { eventId: accepted.id } });
        return accepted;
      }) : await prisma.usageEvent.create({
        data: {
          ...eventData,
          ...(customer ? { billedCustomerId: customer.id, billingTreatment: "LEDGER_ONLY" as const, receivedAt, processingState: "PENDING" as const } : {}),
          ...(customerLinkedIngestion ? { billableFingerprint: fingerprint } : {}),
          ...(timestamp ? { timestamp } : {}),
        },
      });
      if (customerLinkedIngestion) {
        try {
          if (process.env.NODE_ENV !== "production" && process.env.LEDGER_TEST_FAIL_DISPATCH === "true") {
            throw new Error("Injected ledger dispatch failure");
          }
          const dispatch = usageQueue.add("PROCESS_LEDGER_EVENT", { eventId: event.id }, { jobId: `ledger-${event.id}`, removeOnComplete: true });
          let timeout: ReturnType<typeof setTimeout> | undefined;
          try {
            await Promise.race([
              dispatch,
              new Promise<never>((_, reject) => {
                timeout = setTimeout(() => reject(new Error("Ledger dispatch timed out")), 500);
              }),
            ]);
          } finally {
            if (timeout) clearTimeout(timeout);
          }
        } catch (dispatchError) {
          console.error("Ledger dispatch failed; pending intent remains in PostgreSQL:", dispatchError);
        }
        return originalResult(event);
      }
    } catch (error) {
      if (
        idempotencyKey &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        if (customerLinkedIngestion) {
          const existing = await prisma.usageEvent.findUnique({ where: { orgId_idempotencyKey: { orgId: keyRecord.orgId, idempotencyKey } } });
          if (existing) return matches(existing) ? originalResult(existing) : conflict();
          throw error;
        }
        return NextResponse.json({ success: true });
      }

      throw error;
    }

    // add aggregated_usage
    if (!customerLinkedIngestion) await usageQueue.add(
      "AGGREGATE_USAGE",
      {
        orgId: keyRecord.orgId,
        subscriptionId: subscription.id,
      },
      {
        jobId: `aggregate:${keyRecord.orgId}:${subscription.id}`,
        removeOnComplete: true,
        removeOnFail: true,
      }
    );


    // 7️⃣ Update key usage
    await prisma.apiKey.update({
      where: { id: keyRecord.id },
      data: { lastUsedAt: new Date() },
    });

    // await usageQueue.add(
    //   "GENERATE_INVOICE",
    //   {
    //     orgId: keyRecord.orgId,
    //     subscriptionId: subscription.id,
    //   },
    //   {
    //     jobId: `aggregate:${keyRecord.orgId}:${subscription.id}`,
    //     removeOnComplete: true,
    //     removeOnFail: true,
    //   }
    // );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Ingestion error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
