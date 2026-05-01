import { NextResponse } from "next/server";
import { listModels } from "@/lib/ollama";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const models = await listModels();
    return NextResponse.json({ models });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
