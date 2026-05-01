import { NextResponse } from "next/server";
import { getRecentEvents } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
  const limitParam = new URL(req.url).searchParams.get("limit");
  const limit = Math.min(500, Math.max(1, Number(limitParam) || 50));
  const events = getRecentEvents(limit);
  return NextResponse.json({ events });
}
