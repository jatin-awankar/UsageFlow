import { NextResponse } from "next/server";
import crypto from "crypto";
import { rateLimit } from "@/lib/rateLimit";
import prisma from "@/lib/prisma";
import { usageEventSchema } from "@/lib/validators";
import { usageQueue } from "@/lib/queue";
import { redis } from "@/lib/redis";

export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get("x-usageflow-api-key");
    const idempotencyKey = req.headers.get("x-idempotency-key");

    if (!apiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hashed = crypto.createHash("sha256").update(apiKey).digest("hex");

    await rateLimit(hashed);

    // 🔥 API key cache
    const cacheKey = `api_key:${hashed}`;
    let key;

    const cached = await redis.get(cacheKey);
    if (cached) {
      key = JSON.parse(cached);
    } else {
      key = await prisma.apiKey.findFirst({
        where: { hashedKey: hashed, active: true },
      });
      if (key) {
        await redis.set(cacheKey, JSON.stringify(key), "EX", 300);
      }
    }

    if (!key) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = usageEventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // 🔐 Resolve subscription safely
    const subscription = await prisma.subscription.findFirst({
      where: {
        orgId: key.orgId,
        status: "ACTIVE",
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "No active subscription" },
        { status: 400 }
      );
    }

    try {
      await prisma.usageEvent.create({
        data: {
          metricKey: parsed.data.metric,
          amount: parsed.data.amount,
          customerId: parsed.data.customerId,
          metadata: parsed.data.metadata,
          timestamp: parsed.data.timestamp
            ? new Date(parsed.data.timestamp)
            : new Date(),
          idempotencyKey,
          orgId: key.orgId,
          apiKeyId: key.id,
          subscriptionId: subscription.id,
        },
      });
    } catch (err) {
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        // Duplicate idempotency key
        return NextResponse.json({ success: true });
      }
      throw err;
    }

    await usageQueue.add(
      "AGGREGATE_USAGE",
      {
        orgId: key.orgId,
        subscriptionId: subscription.id,
      },
      {
        jobId: `agg:${subscription.id}`,
        removeOnComplete: true,
        attempts: 3,
      }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Track API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
