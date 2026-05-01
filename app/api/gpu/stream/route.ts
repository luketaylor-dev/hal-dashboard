import { subscribe, type GpuSnapshot } from "@/lib/nvidia";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (snap: GpuSnapshot) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(snap)}\n\n`));
      };

      const unsubscribe = subscribe(send);

      const onAbort = () => {
        unsubscribe();
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
