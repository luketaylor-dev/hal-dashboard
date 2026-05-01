import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

const exec = promisify(execFile);

async function bootUptimeSeconds(): Promise<number> {
  const raw = await readFile("/proc/uptime", "utf-8");
  return parseFloat(raw.split(" ")[0]);
}

export type SystemdState = "active" | "inactive" | "failed" | "activating" | "deactivating" | "unknown";

export type SystemdStatus = {
  state: SystemdState;
  activeEnterTimestamp?: string;
  uptimeSeconds?: number;
};

const ALLOWED_ACTIONS = new Set(["start", "stop", "restart"]);
const UNIT_RE = /^[a-z0-9-]+\.service$/;

function assertUnit(unit: string): void {
  if (!UNIT_RE.test(unit)) throw new Error(`invalid unit name: ${unit}`);
}

export async function status(unit: string): Promise<SystemdStatus> {
  assertUnit(unit);
  let state: SystemdState = "unknown";
  try {
    const { stdout } = await exec("systemctl", ["is-active", unit]);
    state = (stdout.trim() as SystemdState) || "unknown";
  } catch (e) {
    const out = (e as { stdout?: string }).stdout?.trim();
    if (out === "inactive" || out === "failed" || out === "activating" || out === "deactivating") {
      state = out;
    }
  }

  let activeEnterTimestamp: string | undefined;
  let uptimeSeconds: number | undefined;
  try {
    const { stdout } = await exec("systemctl", [
      "show",
      unit,
      "--property=ActiveEnterTimestamp",
      "--property=ActiveEnterTimestampMonotonic",
    ]);
    const lines = Object.fromEntries(
      stdout
        .trim()
        .split("\n")
        .map((l) => l.split("=", 2) as [string, string]),
    );
    const ts = lines["ActiveEnterTimestamp"]?.trim();
    const monoMicros = lines["ActiveEnterTimestampMonotonic"]?.trim();
    if (ts && ts !== "n/a" && ts !== "") activeEnterTimestamp = ts;
    if (monoMicros && monoMicros !== "0") {
      const startSec = Number(monoMicros) / 1_000_000;
      const bootSec = await bootUptimeSeconds();
      uptimeSeconds = Math.max(0, Math.floor(bootSec - startSec));
    }
  } catch {
    // ignore
  }

  return { state, activeEnterTimestamp, uptimeSeconds };
}

export async function action(unit: string, what: "start" | "stop" | "restart"): Promise<void> {
  assertUnit(unit);
  if (!ALLOWED_ACTIONS.has(what)) throw new Error(`invalid action: ${what}`);
  await exec("sudo", ["-n", "/bin/systemctl", what, unit]);
}
