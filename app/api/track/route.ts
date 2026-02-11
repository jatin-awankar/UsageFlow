import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashApiKey } from "@/lib/apiKeys/generateKey";
import { usageQueue } from "@/lib/queue";

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

    // 2️⃣ Idempotency key
    const idempotencyKey = req.headers.get("idempotency-key");

    if (idempotencyKey) {
      const existing = await prisma.usageEvent.findUnique({
        where: { idempotencyKey },
      });

      if (existing) {
        return NextResponse.json({ success: true });
      }
    }

    // 3️⃣ Parse body
    const { metric, amount, customerId, metadata } = await req.json();

    if (!metric || typeof amount !== "number") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
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

    if (subscription.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Subscription suspended" },
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

    // 6️⃣ Insert usage
    await prisma.usageEvent.create({
      data: {
        orgId: keyRecord.orgId,
        subscriptionId: subscription.id,
        apiKeyId: keyRecord.id,
        metricKey: metric,
        amount,
        customerId: customerId ?? null,
        metadata: metadata ?? {},
        idempotencyKey: idempotencyKey ?? null,
      },
    });

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
