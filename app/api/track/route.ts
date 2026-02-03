import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashApiKey } from "@/lib/apiKeys/generateKey";

export async function POST(req: NextRequest) {
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

  // ✅ API key is valid → continue ingestion
  return NextResponse.json({ success: true });
}
