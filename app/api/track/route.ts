import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { hashApiKey } from "@/lib/apiKeys/generateKey";
import { usageQueue } from "@/lib/queue";
import { usageEventSchema } from "@/lib/validators";

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

    const parsedBody = usageEventSchema.safeParse(await req.json());

    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const metric = parsedBody.data.metric.trim().toUpperCase();
    const amount = parsedBody.data.amount;
    const customerId = parsedBody.data.customerId?.trim() || null;
    const metadata = parsedBody.data.metadata ?? {};
    const timestamp = parsedBody.data.timestamp
      ? new Date(parsedBody.data.timestamp)
      : undefined;

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
      await prisma.usageEvent.create({
        data: {
          orgId: keyRecord.orgId,
          subscriptionId: subscription.id,
          apiKeyId: keyRecord.id,
          metricId: metricRecord.id,
          metricKey: metric,
          amount,
          customerId,
          metadata,
          idempotencyKey,
          ...(timestamp ? { timestamp } : {}),
        },
      });
    } catch (error) {
      if (
        idempotencyKey &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return NextResponse.json({ success: true });
      }

      throw error;
    }

    // add aggregated_usage
    await usageQueue.add(
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
