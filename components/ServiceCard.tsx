"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatUptime } from "@/lib/format";
import type { ServiceStatus } from "@/lib/services";

type Action = "start" | "stop" | "restart";

const stateColors: Record<string, string> = {
  active: "bg-green-600 hover:bg-green-600",
  inactive: "bg-zinc-500 hover:bg-zinc-500",
  failed: "bg-red-600 hover:bg-red-600",
  transitioning: "bg-amber-500 hover:bg-amber-500",
  unknown: "bg-zinc-400 hover:bg-zinc-400",
};

export function ServiceCard({
  status,
  onActionDone,
}: {
  status: ServiceStatus;
  onActionDone: () => void;
}) {
  const { service, state, uptimeSeconds } = status;
  const [pending, setPending] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: Action) {
    if (pending) return;
    if (action !== "start" && !confirm(`${action} ${service.displayName}?`)) return;
    setPending(action);
    setError(null);
    try {
      const res = await fetch(`/api/services/${service.name}/${action}`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      onActionDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(null);
    }
  }

  const isActive = state === "active";

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">
            <Link href={`/logs/${service.name}`} className="hover:underline">
              {service.displayName}
            </Link>
          </CardTitle>
          <Badge className={`${stateColors[state] ?? stateColors.unknown} text-white`}>
            {state}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-xs text-muted-foreground mb-3 flex justify-between">
          <span>{service.controller}</span>
          <span>{isActive ? `up ${formatUptime(uptimeSeconds)}` : "—"}</span>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={pending !== null || isActive}
            onClick={() => run("start")}
          >
            {pending === "start" ? "Starting…" : "Start"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending !== null || !isActive}
            onClick={() => run("restart")}
          >
            {pending === "restart" ? "Restarting…" : "Restart"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending !== null || !isActive}
            onClick={() => run("stop")}
          >
            {pending === "stop" ? "Stopping…" : "Stop"}
          </Button>
        </div>
        {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
      </CardContent>
    </Card>
  );
}
