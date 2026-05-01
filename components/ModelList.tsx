"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatBytes } from "@/lib/format";
import type { OllamaModel, OllamaPsModel } from "@/lib/ollama";

const fetcher = async <T,>(url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
};

export function ModelList() {
  const { data, error, mutate } = useSWR<{ models: OllamaModel[] }>(
    "/api/ollama/models",
    fetcher,
    { refreshInterval: 10000 },
  );
  const { data: psData } = useSWR<{ models: OllamaPsModel[] }>(
    "/api/ollama/ps",
    fetcher,
    { refreshInterval: 5000 },
  );

  const [pullName, setPullName] = useState("");
  const [pullStatus, setPullStatus] = useState<string | null>(null);
  const [pullPct, setPullPct] = useState<number | null>(null);
  const [pulling, setPulling] = useState(false);

  const loadedNames = new Set((psData?.models ?? []).map((m) => m.name));

  async function pullModel(e: React.FormEvent) {
    e.preventDefault();
    if (!pullName.trim() || pulling) return;
    setPulling(true);
    setPullStatus("starting");
    setPullPct(null);
    try {
      const res = await fetch("/api/ollama/pull", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: pullName.trim() }),
      });
      if (!res.ok || !res.body) {
        const txt = await res.text().catch(() => "");
        throw new Error(`pull failed: ${res.status} ${txt}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let leftover = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = leftover + decoder.decode(value, { stream: true });
        const lines = chunk.split("\n\n");
        leftover = lines.pop() ?? "";
        for (const block of lines) {
          if (!block.startsWith("data: ")) continue;
          const json = block.slice(6).trim();
          if (!json) continue;
          try {
            const evt = JSON.parse(json) as {
              status?: string;
              total?: number;
              completed?: number;
              error?: string;
            };
            if (evt.error) {
              setPullStatus(`error: ${evt.error}`);
              continue;
            }
            if (evt.status) setPullStatus(evt.status);
            if (typeof evt.total === "number" && typeof evt.completed === "number" && evt.total > 0) {
              setPullPct((evt.completed / evt.total) * 100);
            }
          } catch {
            // ignore malformed line
          }
        }
      }
      setPullStatus("done");
      setPullName("");
      void mutate();
    } catch (err) {
      setPullStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setPulling(false);
    }
  }

  async function deleteModel(name: string) {
    if (!confirm(`Delete ${name}?`)) return;
    const res = await fetch(`/api/ollama/models/${encodeURIComponent(name)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      alert(body.error || `HTTP ${res.status}`);
      return;
    }
    void mutate();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Pull a model</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={pullModel} className="flex gap-2">
            <Input
              value={pullName}
              onChange={(e) => setPullName(e.target.value)}
              placeholder="llama3.2:3b"
              disabled={pulling}
            />
            <Button type="submit" disabled={pulling || !pullName.trim()}>
              {pulling ? "Pulling…" : "Pull"}
            </Button>
          </form>
          {pullStatus && (
            <div className="mt-2 space-y-1">
              <div className="text-xs text-muted-foreground">{pullStatus}</div>
              {pullPct !== null && (
                <div className="h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all"
                    style={{ width: `${pullPct.toFixed(1)}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Installed models</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <div className="text-sm text-red-600">Failed to load: {String(error)}</div>}
          {!data ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : data.models.length === 0 ? (
            <div className="text-sm text-muted-foreground">No models installed.</div>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {data.models.map((m) => (
                <li key={m.name} className="flex items-center gap-2 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate flex items-center gap-2">
                      {m.name}
                      {loadedNames.has(m.name) && (
                        <Badge className="bg-green-600 hover:bg-green-600 text-white text-[10px]">
                          loaded
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatBytes(m.size)} · modified {new Date(m.modified_at).toLocaleString()}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteModel(m.name)}
                    disabled={pulling}
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
