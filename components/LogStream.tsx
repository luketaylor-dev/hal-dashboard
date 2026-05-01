"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const MAX_LINES = 2000;

export function LogStream({ serviceName }: { serviceName: string }) {
  const [lines, setLines] = useState<string[]>([]);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState("");
  const [connected, setConnected] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);
  const bufferedRef = useRef<string[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const es = new EventSource(`/api/logs/${serviceName}`);
    sourceRef.current = es;
    es.onopen = () => setConnected(true);
    es.onmessage = (ev) => {
      bufferedRef.current.push(ev.data);
    };
    es.onerror = () => {
      setConnected(false);
    };

    const flush = setInterval(() => {
      if (paused) return;
      const buffered = bufferedRef.current;
      if (buffered.length === 0) return;
      bufferedRef.current = [];
      setLines((prev) => {
        const next = [...prev, ...buffered];
        return next.length > MAX_LINES ? next.slice(-MAX_LINES) : next;
      });
    }, 250);

    return () => {
      clearInterval(flush);
      es.close();
      sourceRef.current = null;
    };
  }, [serviceName, paused]);

  useEffect(() => {
    if (paused) return;
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [lines, paused]);

  const filtered = filter
    ? lines.filter((l) => l.toLowerCase().includes(filter.toLowerCase()))
    : lines;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            connected ? "hal-eye" : "bg-muted-foreground"
          }`}
        />
        <span className="text-xs text-muted-foreground">
          {connected ? "live" : "disconnected"} · {filtered.length} / {lines.length} lines
        </span>
        <input
          type="text"
          placeholder="filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-sm border rounded px-2 py-1 bg-transparent flex-1 min-w-[120px]"
        />
        <Button size="sm" variant="outline" onClick={() => setPaused((p) => !p)}>
          {paused ? "Resume" : "Pause"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setLines([])}>
          Clear
        </Button>
      </div>
      <div
        ref={containerRef}
        className="font-mono text-xs whitespace-pre-wrap overflow-auto h-[70vh] border rounded bg-muted/40 p-3"
      >
        {filtered.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
}
