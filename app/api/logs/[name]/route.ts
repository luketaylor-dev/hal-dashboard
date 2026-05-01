import { isKnownService } from "@/lib/config";
import { streamLogs } from "@/lib/logs";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ name: string }> },
): Promise<Response> {
  const { name } = await params;
  if (!isKnownService(name)) {
    return new Response(JSON.stringify({ error: "unknown service" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const handle = streamLogs(name);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let leftover = "";

      const emit = (line: string) => {
        // SSE: prefix each text line with "data: " and end with blank line.
        controller.enqueue(encoder.encode(`data: ${line}\n\n`));
      };

      handle.child.stdout?.on("data", (chunk: Buffer) => {
        const text = leftover + chunk.toString("utf-8");
        const lines = text.split("\n");
        leftover = lines.pop() ?? "";
        for (const line of lines) {
          if (line.length > 0) emit(line);
        }
      });

      handle.child.stderr?.on("data", (chunk: Buffer) => {
        const text = chunk.toString("utf-8").trim();
        if (text) emit(`[stderr] ${text}`);
      });

      handle.child.on("close", () => {
        try {
          controller.close();
        } catch {
          // already closed
        }
      });

      const onAbort = () => {
        handle.stop();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };
      req.signal.addEventListener("abort", onAbort);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
