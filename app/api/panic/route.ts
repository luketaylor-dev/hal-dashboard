import { NextResponse } from "next/server";
import { performAction } from "@/lib/services";
import { logEvent } from "@/lib/activity";

export const dynamic = "force-dynamic";

// Stop consumers before producers so we don't get error spam in logs.
const STOP_ORDER = [
  "open-webui",
  "sillytavern",
  "comfyui",
  "ollama",
  "speaches",
  "piper-tts",
  "searxng",
];

const START_ORDER = [...STOP_ORDER].reverse();

const SETTLE_MS = 3000;

type StepResult = {
  service: string;
  action: "stop" | "start";
  ok: boolean;
  error?: string;
  ms: number;
};

async function runStep(service: string, action: "stop" | "start"): Promise<StepResult> {
  const t0 = Date.now();
  try {
    await performAction(service, action);
    return { service, action, ok: true, ms: Date.now() - t0 };
  } catch (e) {
    return {
      service,
      action,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      ms: Date.now() - t0,
    };
  }
}

export async function POST(): Promise<NextResponse> {
  const results: StepResult[] = [];

  for (const s of STOP_ORDER) {
    results.push(await runStep(s, "stop"));
  }

  await new Promise((r) => setTimeout(r, SETTLE_MS));

  for (const s of START_ORDER) {
    results.push(await runStep(s, "start"));
  }

  const allOk = results.every((r) => r.ok);
  await logEvent({
    type: "panic",
    success: allOk,
    message: JSON.stringify(results),
  });

  return NextResponse.json({ ok: allOk, results });
}
