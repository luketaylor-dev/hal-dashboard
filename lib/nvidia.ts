import { execFile } from "node:child_process";
import { EventEmitter } from "node:events";
import { promisify } from "node:util";

const exec = promisify(execFile);

export type GpuSnapshot = {
  ts: number;
  name: string;
  memTotalMB: number;
  memUsedMB: number;
  gpuPercent: number;
  tempC: number;
  powerW: number;
};

export type GpuProcess = {
  pid: number;
  processName: string;
  usedMemMB: number;
};

const QUERY_GPU = [
  "--query-gpu=name,memory.total,memory.used,utilization.gpu,temperature.gpu,power.draw",
  "--format=csv,noheader,nounits",
];

const QUERY_PROCS = [
  "--query-compute-apps=pid,process_name,used_memory",
  "--format=csv,noheader,nounits",
];

function parseSnapshot(line: string): GpuSnapshot {
  const parts = line.split(",").map((s) => s.trim());
  return {
    ts: Date.now(),
    name: parts[0],
    memTotalMB: Number(parts[1]),
    memUsedMB: Number(parts[2]),
    gpuPercent: Number(parts[3]),
    tempC: Number(parts[4]),
    powerW: Number(parts[5]),
  };
}

export async function getSnapshot(): Promise<GpuSnapshot> {
  const { stdout } = await exec("nvidia-smi", QUERY_GPU);
  const line = stdout.trim().split("\n")[0];
  return parseSnapshot(line);
}

export async function getProcesses(): Promise<GpuProcess[]> {
  const { stdout } = await exec("nvidia-smi", QUERY_PROCS);
  if (!stdout.trim()) return [];
  return stdout
    .trim()
    .split("\n")
    .map((line): GpuProcess => {
      const [pid, processName, usedMem] = line.split(",").map((s) => s.trim());
      return {
        pid: Number(pid),
        processName,
        usedMemMB: Number(usedMem),
      };
    });
}

// ---------- Shared poller ----------
// One nvidia-smi runs in this process for the whole app, regardless of how many
// SSE clients are subscribed. Uses globalThis to survive Next.js dev HMR.

const POLL_INTERVAL_MS = 2000;
const RING_SIZE = 30; // 60 seconds at 2s intervals

type PollerState = {
  emitter: EventEmitter;
  subscriberCount: number;
  timer: NodeJS.Timeout | null;
  ring: GpuSnapshot[];
};

const g = globalThis as unknown as { __halGpuPoller?: PollerState };
if (!g.__halGpuPoller) {
  g.__halGpuPoller = {
    emitter: new EventEmitter(),
    subscriberCount: 0,
    timer: null,
    ring: [],
  };
  g.__halGpuPoller.emitter.setMaxListeners(0);
}
const poller = g.__halGpuPoller;

async function tick(): Promise<void> {
  try {
    const snap = await getSnapshot();
    poller.ring.push(snap);
    if (poller.ring.length > RING_SIZE) poller.ring.shift();
    poller.emitter.emit("snapshot", snap);
  } catch (e) {
    poller.emitter.emit("error", e);
  }
}

function startIfNeeded(): void {
  if (poller.timer) return;
  void tick();
  poller.timer = setInterval(() => void tick(), POLL_INTERVAL_MS);
}

function stopIfIdle(): void {
  if (poller.subscriberCount > 0) return;
  if (poller.timer) {
    clearInterval(poller.timer);
    poller.timer = null;
  }
}

export function subscribe(onSnapshot: (s: GpuSnapshot) => void): () => void {
  poller.subscriberCount += 1;
  poller.emitter.on("snapshot", onSnapshot);
  startIfNeeded();
  // Send last known immediately so new clients don't wait 2s for first frame.
  const last = poller.ring.at(-1);
  if (last) queueMicrotask(() => onSnapshot(last));
  return () => {
    poller.emitter.off("snapshot", onSnapshot);
    poller.subscriberCount = Math.max(0, poller.subscriberCount - 1);
    stopIfIdle();
  };
}

export function getRing(): GpuSnapshot[] {
  return [...poller.ring];
}
