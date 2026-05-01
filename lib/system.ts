import { readFile } from "node:fs/promises";

export type SystemSnapshot = {
  cpuPercent: number;
  cpuCount: number;
  loadAvg: [number, number, number];
  memUsedMB: number;
  memTotalMB: number;
  swapUsedMB: number;
  swapTotalMB: number;
};

type CpuTimes = {
  total: number;
  idle: number;
};

async function readCpuTimes(): Promise<CpuTimes> {
  const raw = await readFile("/proc/stat", "utf-8");
  const line = raw.split("\n", 1)[0]; // first line: aggregate "cpu  ..."
  const parts = line.trim().split(/\s+/).slice(1).map(Number);
  // user nice system idle iowait irq softirq steal guest guest_nice
  const idle = (parts[3] ?? 0) + (parts[4] ?? 0); // idle + iowait
  const total = parts.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
  return { total, idle };
}

const g = globalThis as unknown as { __halPrevCpu?: CpuTimes };

async function readMemInfo(): Promise<{ memUsedMB: number; memTotalMB: number; swapUsedMB: number; swapTotalMB: number }> {
  const raw = await readFile("/proc/meminfo", "utf-8");
  const map: Record<string, number> = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Za-z()_]+):\s+(\d+)\s*kB/);
    if (m) map[m[1]] = Number(m[2]);
  }
  const memTotalKB = map.MemTotal ?? 0;
  const memAvailKB = map.MemAvailable ?? map.MemFree ?? 0;
  const swapTotalKB = map.SwapTotal ?? 0;
  const swapFreeKB = map.SwapFree ?? 0;
  return {
    memTotalMB: Math.round(memTotalKB / 1024),
    memUsedMB: Math.round((memTotalKB - memAvailKB) / 1024),
    swapTotalMB: Math.round(swapTotalKB / 1024),
    swapUsedMB: Math.round((swapTotalKB - swapFreeKB) / 1024),
  };
}

async function cpuCount(): Promise<number> {
  try {
    const raw = await readFile("/proc/cpuinfo", "utf-8");
    return raw.split("\n").filter((l) => l.startsWith("processor")).length || 1;
  } catch {
    return 1;
  }
}

async function loadAvg(): Promise<[number, number, number]> {
  try {
    const raw = await readFile("/proc/loadavg", "utf-8");
    const [a, b, c] = raw.trim().split(/\s+/).slice(0, 3).map(Number);
    return [a, b, c];
  } catch {
    return [0, 0, 0];
  }
}

export async function getSnapshot(): Promise<SystemSnapshot> {
  const [now, mem, n, la] = await Promise.all([
    readCpuTimes(),
    readMemInfo(),
    cpuCount(),
    loadAvg(),
  ]);
  const prev = g.__halPrevCpu;
  g.__halPrevCpu = now;

  let cpuPercent = 0;
  if (prev) {
    const totalDelta = now.total - prev.total;
    const idleDelta = now.idle - prev.idle;
    if (totalDelta > 0) cpuPercent = Math.max(0, Math.min(100, (1 - idleDelta / totalDelta) * 100));
  }

  return {
    cpuPercent,
    cpuCount: n,
    loadAvg: la,
    ...mem,
  };
}
