import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { services } from "./config";

const exec = promisify(execFile);

export type DirUsage = {
  path: string;
  bytes: number;
};

export type DfRow = {
  filesystem: string;
  size: number;
  used: number;
  available: number;
  usePercent: number;
  mountedOn: string;
};

export type DiskReport = {
  modelDirs: DirUsage[];
  filesystem?: DfRow;
  cachedAt: number;
};

const CACHE_MS = 5 * 60 * 1000;
let cache: DiskReport | null = null;
let inflight: Promise<DiskReport> | null = null;

async function duBytes(path: string): Promise<number> {
  try {
    const { stdout } = await exec("du", ["-sb", path]);
    const n = Number(stdout.split(/\s+/)[0]);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

async function dfFor(path: string): Promise<DfRow | undefined> {
  try {
    const { stdout } = await exec("df", ["-PB1", path]);
    // Header + one row
    const lines = stdout.trim().split("\n");
    if (lines.length < 2) return undefined;
    const cols = lines[1].split(/\s+/);
    if (cols.length < 6) return undefined;
    const usePercent = Number(cols[4].replace("%", ""));
    return {
      filesystem: cols[0],
      size: Number(cols[1]),
      used: Number(cols[2]),
      available: Number(cols[3]),
      usePercent: Number.isFinite(usePercent) ? usePercent : 0,
      mountedOn: cols[5],
    };
  } catch {
    return undefined;
  }
}

async function compute(): Promise<DiskReport> {
  const dirs = services
    .map((s) => s.modelDir)
    .filter((d): d is string => typeof d === "string");
  const modelDirs = await Promise.all(
    dirs.map(async (path) => ({ path, bytes: await duBytes(path) })),
  );
  const filesystem = dirs[0] ? await dfFor(dirs[0]) : undefined;
  return { modelDirs, filesystem, cachedAt: Date.now() };
}

export async function getDiskReport(force = false): Promise<DiskReport> {
  if (!force && cache && Date.now() - cache.cachedAt < CACHE_MS) return cache;
  if (inflight) return inflight;
  inflight = compute()
    .then((r) => {
      cache = r;
      return r;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
