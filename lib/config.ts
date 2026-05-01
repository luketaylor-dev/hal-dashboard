import { readFileSync } from "node:fs";
import { join } from "node:path";

export type ServiceController = "systemd" | "docker";
export type ServiceType = "ollama" | "comfyui" | "generic";

export type Service = {
  name: string;
  displayName: string;
  controller: ServiceController;
  type: ServiceType;
  unit?: string;
  container?: string;
  url?: string;
  modelDir?: string;
};

type ServicesConfig = { services: Service[] };

const configPath = join(process.cwd(), "config", "services.json");
const raw = readFileSync(configPath, "utf-8");
const parsed = JSON.parse(raw) as ServicesConfig;

export const services: readonly Service[] = Object.freeze(parsed.services);

const byName = new Map(services.map((s) => [s.name, s]));

export function getService(name: string): Service {
  const s = byName.get(name);
  if (!s) throw new Error(`unknown service: ${name}`);
  return s;
}

export function isKnownService(name: string): boolean {
  return byName.has(name);
}
