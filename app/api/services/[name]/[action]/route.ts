import { NextResponse } from "next/server";
import { isKnownService } from "@/lib/config";
import { performAction } from "@/lib/services";
import { logEvent } from "@/lib/activity";

const ALLOWED = new Set(["start", "stop", "restart"]);

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ name: string; action: string }> },
): Promise<NextResponse> {
  const { name, action } = await params;

  if (!isKnownService(name)) {
    return NextResponse.json({ error: "unknown service" }, { status: 400 });
  }
  if (!ALLOWED.has(action)) {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  try {
    await performAction(name, action as "start" | "stop" | "restart");
    await logEvent({
      type: "service_action",
      target: name,
      action,
      success: true,
    });
    return NextResponse.json({ ok: true, name, action });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await logEvent({
      type: "service_action",
      target: name,
      action,
      success: false,
      message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
