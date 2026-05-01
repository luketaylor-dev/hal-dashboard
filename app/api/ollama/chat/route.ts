import { generateStream } from "@/lib/ollama";

export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  let body: { model?: string; prompt?: string };
  try {
    body = (await req.json()) as { model?: string; prompt?: string };
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  const model = body.model?.trim();
  const prompt = body.prompt;
  if (!model || prompt === undefined) {
    return Response.json({ error: "model and prompt required" }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await generateStream(model, prompt);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return Response.json({ error: message }, { status: 502 });
  }
  if (!upstream.ok || !upstream.body) {
    return Response.json({ error: `ollama HTTP ${upstream.status}` }, { status: 502 });
  }

  // Pass through Ollama's NDJSON stream untouched. The client parses lines.
  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
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
          controller.enqueue(value);
        }
      } catch {
        // upstream closed
      } finally {
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
