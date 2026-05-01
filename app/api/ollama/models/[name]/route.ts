import { NextResponse } from "next/server";
import { deleteModel } from "@/lib/ollama";
import { logEvent } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ name: string }> },
): Promise<NextResponse> {
  const { name } = await params;
  // Decode because the model name may contain ":" (e.g. llama3:8b)
  const model = decodeURIComponent(name);
  try {
    await deleteModel(model);
    await logEvent({ type: "model_delete", target: model, success: true });
    return NextResponse.json({ ok: true, model });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await logEvent({ type: "model_delete", target: model, success: false, message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
