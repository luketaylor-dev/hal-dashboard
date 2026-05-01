import { spawn, type ChildProcess } from "node:child_process";
import { getService } from "./config";

export type LogLine = {
  ts: number;
  text: string;
};

export type LogStreamHandle = {
  child: ChildProcess;
  stop: () => void;
};

/**
 * Spawn a tail-following log process for a configured service.
 * Returns the child + a stop() that SIGTERMs (then SIGKILLs after 2s).
 *
 * The caller must hook `child.stdout` for line streaming and call stop()
 * when the consumer disconnects (e.g. SSE client closes).
 */
export function streamLogs(serviceName: string, tailLines = 200): LogStreamHandle {
  const svc = getService(serviceName);
  let child: ChildProcess;
  if (svc.controller === "systemd") {
    if (!svc.unit) throw new Error(`systemd service ${svc.name} missing unit`);
    child = spawn(
      "journalctl",
      ["-u", svc.unit, "-f", "-n", String(tailLines), "--output=short-iso-precise"],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
  } else {
    if (!svc.container) throw new Error(`docker service ${svc.name} missing container`);
    child = spawn(
      "docker",
      ["logs", "-f", "--tail", String(tailLines), "--timestamps", svc.container],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
  }
  let killed = false;
  const stop = () => {
    if (killed) return;
    killed = true;
    if (child.exitCode !== null) return;
    child.kill("SIGTERM");
    setTimeout(() => {
      if (child.exitCode === null) child.kill("SIGKILL");
    }, 2000);
  };
  return { child, stop };
}
