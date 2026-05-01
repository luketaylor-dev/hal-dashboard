"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { VramSparkline } from "./VramSparkline";
import type { GpuSnapshot } from "@/lib/nvidia";

const MAX_HISTORY = 30;

export function GpuPanel() {
  const [snap, setSnap] = useState<GpuSnapshot | null>(null);
  const [history, setHistory] = useState<GpuSnapshot[]>([]);
  const [connected, setConnected] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const open = () => {
      const es = new EventSource("/api/gpu/stream");
      sourceRef.current = es;
      es.onopen = () => setConnected(true);
      es.onmessage = (ev) => {
        const s = JSON.parse(ev.data) as GpuSnapshot;
        setSnap(s);
        setHistory((h) => {
          const next = [...h, s];
          return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
        });
      };
      es.onerror = () => {
        setConnected(false);
        es.close();
        sourceRef.current = null;
      };
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        if (!sourceRef.current) open();
      } else {
        sourceRef.current?.close();
        sourceRef.current = null;
        setConnected(false);
      }
    };

    open();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      sourceRef.current?.close();
      sourceRef.current = null;
    };
  }, []);

  if (!snap) {
    return (
      <Card>
        <CardContent className="py-4 text-sm text-muted-foreground">
          {connected ? "Waiting for first frame…" : "Connecting to GPU stream…"}
        </CardContent>
      </Card>
    );
  }

  const memPct = (snap.memUsedMB / snap.memTotalMB) * 100;
  const memUsedGB = (snap.memUsedMB / 1024).toFixed(1);
  const memTotalGB = (snap.memTotalMB / 1024).toFixed(1);

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-muted-foreground">{snap.name}</div>
            <div className="text-2xl font-semibold tabular-nums">
              {memUsedGB} <span className="text-base text-muted-foreground">/ {memTotalGB} GB</span>
            </div>
          </div>
          <div className="text-[var(--hal-eye)]">
            <VramSparkline history={history} memTotalMB={snap.memTotalMB} />
          </div>
        </div>

        <Bar label="VRAM" pct={memPct} />
        <Bar label="GPU" pct={snap.gpuPercent} />

        <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
          <span>{snap.tempC}°C</span>
          <span>{snap.powerW.toFixed(0)} W</span>
        </div>
      </CardContent>
    </Card>
  );
}

function Bar({ label, pct }: { label: string; pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">{clamped.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--hal-eye)] transition-all duration-500"
          style={{ width: `${clamped}%`, boxShadow: "0 0 6px var(--hal-eye-glow)" }}
        />
      </div>
    </div>
  );
}
