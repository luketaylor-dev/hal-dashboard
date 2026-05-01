import { NextResponse } from "next/server";
import { getProcesses } from "@/lib/nvidia";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const procs = await getProcesses();
    return NextResponse.json({ processes: procs });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
