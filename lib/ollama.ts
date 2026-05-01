import { getService } from "./config";

function baseUrl(): string {
  const svc = getService("ollama");
  if (!svc.url) throw new Error("ollama service has no url");
  return svc.url.replace(/\/$/, "");
}

export type OllamaModelDetails = {
  family?: string;
  parameter_size?: string;
  quantization_level?: string;
};

export type OllamaModel = {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: OllamaModelDetails;
};

export type OllamaPsModel = {
  name: string;
  model: string;
  size: number;
  size_vram: number;
  expires_at: string;
};

export async function listModels(): Promise<OllamaModel[]> {
  const res = await fetch(`${baseUrl()}/api/tags`);
  if (!res.ok) throw new Error(`ollama tags HTTP ${res.status}`);
  const json = (await res.json()) as { models: OllamaModel[] };
  return json.models ?? [];
}

export async function listLoaded(): Promise<OllamaPsModel[]> {
  const res = await fetch(`${baseUrl()}/api/ps`);
  if (!res.ok) throw new Error(`ollama ps HTTP ${res.status}`);
  const json = (await res.json()) as { models: OllamaPsModel[] };
  return json.models ?? [];
}

export async function deleteModel(name: string): Promise<void> {
  const res = await fetch(`${baseUrl()}/api/delete`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: name }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`ollama delete HTTP ${res.status}: ${text}`);
  }
}

export function pullModelStream(name: string): Promise<Response> {
  return fetch(`${baseUrl()}/api/pull`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: name, stream: true }),
  });
}

export function generateStream(model: string, prompt: string): Promise<Response> {
  return fetch(`${baseUrl()}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: true }),
  });
}
