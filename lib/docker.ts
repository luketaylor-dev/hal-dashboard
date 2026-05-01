import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

export type DockerState =
  | "running"
  | "exited"
  | "paused"
  | "restarting"
  | "created"
  | "dead"
  | "unknown";

export type DockerStatus = {
  state: DockerState;
  startedAt?: string;
  uptimeSeconds?: number;
};

const ALLOWED_ACTIONS = new Set(["start", "stop", "restart"]);
const NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9_.-]+$/;

function assertContainer(name: string): void {
  if (!NAME_RE.test(name)) throw new Error(`invalid container name: ${name}`);
}

export async function status(container: string): Promise<DockerStatus> {
  assertContainer(container);
  try {
    const { stdout } = await exec("docker", [
      "inspect",
      "--format",
      "{{.State.Status}}|{{.State.StartedAt}}",
      container,
    ]);
    const [state, startedAt] = stdout.trim().split("|");
    let uptimeSeconds: number | undefined;
    if (startedAt && startedAt !== "0001-01-01T00:00:00Z") {
      const ms = Date.parse(startedAt);
      if (!Number.isNaN(ms)) {
        uptimeSeconds = Math.max(0, Math.floor((Date.now() - ms) / 1000));
      }
    }
    return {
      state: (state as DockerState) || "unknown",
      startedAt: startedAt || undefined,
      uptimeSeconds,
    };
  } catch {
    return { state: "unknown" };
  }
}

export async function action(container: string, what: "start" | "stop" | "restart"): Promise<void> {
  assertContainer(container);
  if (!ALLOWED_ACTIONS.has(what)) throw new Error(`invalid action: ${what}`);
  await exec("docker", [what, container]);
}
