import { NextResponse } from "next/server";
import { getDiskReport } from "@/lib/disk";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
  const force = new URL(req.url).searchParams.get("refresh") === "1";
  try {
    const report = await getDiskReport(force);
    return NextResponse.json(report);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
