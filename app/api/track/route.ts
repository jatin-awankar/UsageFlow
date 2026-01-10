import { NextResponse } from "next/server";
import crypto from "crypto";
import { rateLimit } from "@/lib/rateLimit";
import prisma from "@/lib/prisma";
import { usageEventSchema } from "@/lib/validators";
import { usageQueue } from "@/lib/queue";

export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get("x-usageflow-api-key");
    const idempotencyKey = req.headers.get("x-idempotency-key");

    if (!apiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hashed = crypto.createHash("sha256").update(apiKey).digest("hex");

    await rateLimit(hashed);

    const key = await prisma.apiKey.findFirst({
      where: { hashedKey: hashed, active: true },
    });

    if (!key) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = usageEventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (idempotencyKey) {
      const exists = await prisma.usageEvent.findUnique({
        where: { idempotencyKey },
      });
      if (exists) {
        return NextResponse.json({ success: true });
      }
    }

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
        subscriptionId: body.subscriptionId,
      },
    });

    await usageQueue.add(
        "AGGREGATE_USAGE",
        {
          orgId: key.orgId,
          subscriptionId: body.subscriptionId,
        },
        {
          removeOnComplete: true,
          attempts: 3,
        }
      );
      

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: `Internal server error` },
      { status: 500 }
    );
  }
}
