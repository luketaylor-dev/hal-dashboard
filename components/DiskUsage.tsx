"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/format";
import type { DiskReport } from "@/lib/disk";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as DiskReport;
};

export function DiskUsage() {
  const { data, mutate, isValidating } = useSWR<DiskReport>("/api/disk", fetcher);
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    try {
      const fresh = await fetch("/api/disk?refresh=1").then((r) => r.json());
      void mutate(fresh, false);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-sm">Disk usage</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={refresh}
          disabled={refreshing || isValidating}
        >
          {refreshing ? "Scanning…" : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent>
        {!data ? (
          <div className="text-sm text-muted-foreground">…</div>
        ) : (
          <div className="space-y-3">
            {data.filesystem && (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{data.filesystem.mountedOn}</span>
                  <span className="tabular-nums">
                    {formatBytes(data.filesystem.used)} / {formatBytes(data.filesystem.size)}
                  </span>
                </div>
                <div className="h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-900 dark:bg-zinc-100"
                    style={{ width: `${Math.min(100, data.filesystem.usePercent)}%` }}
                  />
                </div>
              </div>
            )}
            <ul className="text-sm space-y-1">
              {data.modelDirs.map((d) => (
                <li
                  key={d.path}
                  className="flex justify-between border-t border-zinc-100 dark:border-zinc-800 pt-1"
                >
                  <span className="font-mono text-xs truncate max-w-[60%]" title={d.path}>
                    {d.path}
                  </span>
                  <span className="tabular-nums">{formatBytes(d.bytes)}</span>
                </li>
              ))}
            </ul>
            <div className="text-xs text-muted-foreground">
              Cached at {new Date(data.cachedAt).toLocaleTimeString()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
