import { getService, type Service } from "./config";
import * as systemd from "./systemd";
import * as docker from "./docker";

export type ServiceState = "active" | "inactive" | "failed" | "transitioning" | "unknown";

export type ServiceStatus = {
  service: Service;
  state: ServiceState;
  startedAt?: string;
  uptimeSeconds?: number;
};

function normalizeSystemdState(s: systemd.SystemdState): ServiceState {
  if (s === "active") return "active";
  if (s === "inactive") return "inactive";
  if (s === "failed") return "failed";
  if (s === "activating" || s === "deactivating") return "transitioning";
  return "unknown";
}

function normalizeDockerState(s: docker.DockerState): ServiceState {
  if (s === "running") return "active";
  if (s === "exited" || s === "dead" || s === "created") return "inactive";
  if (s === "restarting" || s === "paused") return "transitioning";
  return "unknown";
}

export async function getStatus(name: string): Promise<ServiceStatus> {
  const svc = getService(name);
  if (svc.controller === "systemd") {
    if (!svc.unit) throw new Error(`systemd service ${svc.name} missing unit`);
    const s = await systemd.status(svc.unit);
    return {
      service: svc,
      state: normalizeSystemdState(s.state),
      startedAt: s.activeEnterTimestamp,
      uptimeSeconds: s.uptimeSeconds,
    };
  }
  if (!svc.container) throw new Error(`docker service ${svc.name} missing container`);
  const s = await docker.status(svc.container);
  return {
    service: svc,
    state: normalizeDockerState(s.state),
    startedAt: s.startedAt,
    uptimeSeconds: s.uptimeSeconds,
  };
}

export async function performAction(
  name: string,
  what: "start" | "stop" | "restart",
): Promise<void> {
  const svc = getService(name);
  if (svc.controller === "systemd") {
    if (!svc.unit) throw new Error(`systemd service ${svc.name} missing unit`);
    await systemd.action(svc.unit, what);
  } else {
    if (!svc.container) throw new Error(`docker service ${svc.name} missing container`);
    await docker.action(svc.container, what);
  }
}
