"use client";

import useSWR from "swr";
import { ServiceCard } from "./ServiceCard";
import type { ServiceStatus } from "@/lib/services";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as { services: ServiceStatus[] };
};

export function ServicesGrid() {
  const { data, error, isLoading, mutate } = useSWR("/api/services", fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
  });

  if (isLoading && !data) {
    return <div className="text-sm text-muted-foreground">Loading services…</div>;
  }
  if (error) {
    return <div className="text-sm text-red-600">Failed to load services: {String(error)}</div>;
  }
  if (!data) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {data.services.map((s) => (
        <ServiceCard key={s.service.name} status={s} onActionDone={() => mutate()} />
      ))}
    </div>
  );
}
