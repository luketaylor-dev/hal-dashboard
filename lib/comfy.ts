import { getService } from "./config";

function baseUrl(): string {
  const svc = getService("comfyui");
  if (!svc.url) throw new Error("comfyui service has no url");
  return svc.url.replace(/\/$/, "");
}

export type ComfyQueue = {
  running: number;
  pending: number;
  // first running prompt id, if any
  current?: string;
};

type RawQueue = {
  queue_running: unknown[][];
  queue_pending: unknown[][];
};

export async function getQueue(): Promise<ComfyQueue> {
  const res = await fetch(`${baseUrl()}/queue`);
  if (!res.ok) throw new Error(`comfy queue HTTP ${res.status}`);
  const json = (await res.json()) as RawQueue;
  // Each queue entry is shaped: [number, prompt_id, ...]
  const running = json.queue_running ?? [];
  const pending = json.queue_pending ?? [];
  let current: string | undefined;
  if (running.length > 0) {
    const entry = running[0];
    if (Array.isArray(entry) && typeof entry[1] === "string") current = entry[1];
  }
  return {
    running: running.length,
    pending: pending.length,
    current,
  };
}
