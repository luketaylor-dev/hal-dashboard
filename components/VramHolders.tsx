"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GpuProcess } from "@/lib/nvidia";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as { processes: GpuProcess[] };
};

export function VramHolders() {
  const { data } = useSWR("/api/gpu/processes", fetcher, {
    refreshInterval: 5000,
  });

  const procs = data?.processes ?? [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">VRAM holders</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {procs.length === 0 ? (
          <div className="text-xs text-muted-foreground">No processes holding VRAM.</div>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {procs
                .slice()
                .sort((a, b) => b.usedMemMB - a.usedMemMB)
                .map((p) => (
                  <tr key={p.pid} className="border-t border-zinc-100 dark:border-zinc-800">
                    <td className="py-1.5 truncate max-w-[200px]" title={p.processName}>
                      {p.processName.split("/").pop()}
                    </td>
                    <td className="py-1.5 text-right text-muted-foreground tabular-nums">
                      pid {p.pid}
                    </td>
                    <td className="py-1.5 text-right tabular-nums w-20">
                      {p.usedMemMB >= 1024
                        ? `${(p.usedMemMB / 1024).toFixed(1)} GB`
                        : `${p.usedMemMB} MB`}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
