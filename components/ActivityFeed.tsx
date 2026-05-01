"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EventRow } from "@/lib/activity";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as { events: EventRow[] };
};

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function describe(e: EventRow): string {
  if (e.type === "service_action") {
    return `${e.action} ${e.target}`;
  }
  if (e.type === "panic") return "panic reset";
  if (e.type === "model_pull") return `pull ${e.target}`;
  if (e.type === "model_delete") return `delete ${e.target}`;
  return e.type;
}

export function ActivityFeed({ limit = 10 }: { limit?: number }) {
  const { data } = useSWR(`/api/activity?limit=${limit}`, fetcher, {
    refreshInterval: 5000,
  });

  const events = data?.events ?? [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Recent activity</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {events.length === 0 ? (
          <div className="text-xs text-muted-foreground">No events yet.</div>
        ) : (
          <ul className="space-y-1 text-sm">
            {events.map((e) => (
              <li
                key={e.id}
                className="flex items-baseline gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-1 last:border-0"
              >
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    e.success ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span className="flex-1">{describe(e)}</span>
                {e.vram_used_mb !== null && e.vram_total_mb !== null && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {(e.vram_used_mb / 1024).toFixed(1)}/
                    {(e.vram_total_mb / 1024).toFixed(0)}GB
                  </span>
                )}
                <span className="text-xs text-muted-foreground tabular-nums">
                  {relativeTime(e.ts)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
