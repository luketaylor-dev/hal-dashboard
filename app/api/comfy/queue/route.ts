import { NextResponse } from "next/server";
import { getQueue } from "@/lib/comfy";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const queue = await getQueue();
    return NextResponse.json(queue);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
