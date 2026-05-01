"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { OllamaModel } from "@/lib/ollama";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as { models: OllamaModel[] };
};

export function ChatTester() {
  const { data } = useSWR("/api/ollama/models", fetcher);
  const models = data?.models ?? [];
  const [model, setModel] = useState("");
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState<number | null>(null);

  useEffect(() => {
    if (!model && models.length > 0) setModel(models[0].name);
  }, [models, model]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!model || !prompt.trim() || running) return;
    setRunning(true);
    setResponse("");
    setElapsed(null);
    const t0 = Date.now();
    try {
      const res = await fetch("/api/ollama/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt }),
      });
      if (!res.ok || !res.body) {
        const txt = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${txt}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let leftover = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const text = leftover + decoder.decode(value, { stream: true });
        const lines = text.split("\n");
        leftover = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const evt = JSON.parse(line) as { response?: string; done?: boolean };
            if (evt.response) setResponse((r) => r + evt.response);
          } catch {
            // ignore
          }
        }
      }
      setElapsed(Date.now() - t0);
    } catch (err) {
      setResponse(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Chat tester</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={send} className="space-y-2">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full text-sm border rounded px-2 py-1 bg-transparent"
            disabled={running}
          >
            {models.length === 0 && <option value="">No models installed</option>}
            {models.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask something…"
            disabled={running}
          />
          <Button type="submit" disabled={running || !model || !prompt.trim()}>
            {running ? "Generating…" : "Send"}
          </Button>
        </form>
        {(response || running) && (
          <div className="mt-3">
            <pre className="text-sm whitespace-pre-wrap font-mono p-2 rounded bg-zinc-50 dark:bg-zinc-950 max-h-[60vh] overflow-auto">
              {response || "…"}
            </pre>
            {elapsed !== null && (
              <div className="text-xs text-muted-foreground mt-1">
                done in {(elapsed / 1000).toFixed(1)}s
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
