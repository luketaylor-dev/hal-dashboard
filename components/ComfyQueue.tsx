"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ComfyQueue as ComfyQueueData } from "@/lib/comfy";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as ComfyQueueData;
};

export function ComfyQueue() {
  const { data, error } = useSWR("/api/comfy/queue", fetcher, {
    refreshInterval: 3000,
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">ComfyUI queue</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {error ? (
          <div className="text-xs text-red-600">unreachable</div>
        ) : !data ? (
          <div className="text-xs text-muted-foreground">…</div>
        ) : (
          <div className="flex items-baseline gap-4 text-sm">
            <div>
              <div className="text-2xl font-semibold tabular-nums">{data.running}</div>
              <div className="text-xs text-muted-foreground">running</div>
            </div>
            <div>
              <div className="text-2xl font-semibold tabular-nums">{data.pending}</div>
              <div className="text-xs text-muted-foreground">pending</div>
            </div>
            {data.current && (
              <div className="ml-auto text-xs text-muted-foreground font-mono truncate max-w-[180px]">
                {data.current.slice(0, 8)}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
