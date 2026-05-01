import { pullModelStream } from "@/lib/ollama";
import { logEvent } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  let body: { model?: string };
  try {
    body = (await req.json()) as { model?: string };
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  const model = body.model?.trim();
  if (!model) return Response.json({ error: "model required" }, { status: 400 });

  let upstream: Response;
  try {
    upstream = await pullModelStream(model);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await logEvent({ type: "model_pull", target: model, success: false, message });
    return Response.json({ error: message }, { status: 502 });
  }
  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    await logEvent({
      type: "model_pull",
      target: model,
      success: false,
      message: `HTTP ${upstream.status}: ${text}`,
    });
    return Response.json({ error: `ollama HTTP ${upstream.status}` }, { status: 502 });
  }

  const encoder = new TextEncoder();

  const sse = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
      const decoder = new TextDecoder();
      let leftover = "";
      let lastError: string | null = null;
      let succeeded = false;

      const onAbort = () => {
        try {
          reader.cancel();
        } catch {
          // ignore
        }
      };
      req.signal.addEventListener("abort", onAbort);

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const text = leftover + decoder.decode(value, { stream: true });
          const lines = text.split("\n");
          leftover = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            controller.enqueue(encoder.encode(`data: ${line}\n\n`));
            try {
              const parsed = JSON.parse(line) as { status?: string; error?: string };
              if (parsed.error) lastError = parsed.error;
              if (parsed.status === "success") succeeded = true;
            } catch {
              // best-effort parse for telemetry
            }
          }
        }
        if (leftover.trim()) {
          controller.enqueue(encoder.encode(`data: ${leftover}\n\n`));
        }
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
      } finally {
        try {
          controller.close();
        } catch {
          // already closed
        }
        await logEvent({
          type: "model_pull",
          target: model,
          success: succeeded,
          message: lastError,
        });
      }
    },
  });

  return new Response(sse, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
