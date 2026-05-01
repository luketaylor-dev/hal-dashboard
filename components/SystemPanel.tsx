"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SystemSnapshot } from "@/lib/system";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as SystemSnapshot;
};

export function SystemPanel() {
  // 2s matches the GPU stream cadence; first call seeds the prev-CPU sample,
  // second call onward yields a real percentage.
  const { data } = useSWR("/api/system", fetcher, { refreshInterval: 2000 });

  if (!data) {
    return (
      <Card>
        <CardContent className="py-4 text-xs text-muted-foreground">…</CardContent>
      </Card>
    );
  }

  const memPct = data.memTotalMB > 0 ? (data.memUsedMB / data.memTotalMB) * 100 : 0;
  const swapPct = data.swapTotalMB > 0 ? (data.swapUsedMB / data.swapTotalMB) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
          // System
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <Bar
          label="CPU"
          pct={data.cpuPercent}
          right={`${data.loadAvg[0].toFixed(2)} load · ${data.cpuCount} cores`}
        />
        <Bar
          label="RAM"
          pct={memPct}
          right={`${(data.memUsedMB / 1024).toFixed(1)} / ${(data.memTotalMB / 1024).toFixed(0)} GB`}
        />
        {data.swapTotalMB > 0 && (
          <Bar
            label="Swap"
            pct={swapPct}
            right={`${(data.swapUsedMB / 1024).toFixed(1)} / ${(data.swapTotalMB / 1024).toFixed(0)} GB`}
            dim
          />
        )}
      </CardContent>
    </Card>
  );
}

function Bar({
  label,
  pct,
  right,
  dim = false,
}: {
  label: string;
  pct: number;
  right: string;
  dim?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground font-mono uppercase tracking-wider">{label}</span>
        <span className="text-muted-foreground tabular-nums">{right}</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${dim ? "bg-foreground/40" : "bg-foreground/70"}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
