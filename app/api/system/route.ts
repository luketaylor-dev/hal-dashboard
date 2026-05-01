import { NextResponse } from "next/server";
import { getSnapshot } from "@/lib/system";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const snap = await getSnapshot();
    return NextResponse.json(snap);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
