"use client";

import type { GpuSnapshot } from "@/lib/nvidia";

export function VramSparkline({
  history,
  memTotalMB,
  width = 240,
  height = 32,
}: {
  history: GpuSnapshot[];
  memTotalMB: number;
  width?: number;
  height?: number;
}) {
  if (history.length < 2 || memTotalMB <= 0) {
    return <svg width={width} height={height} className="block" />;
  }
  const step = width / Math.max(1, history.length - 1);
  const points = history
    .map((s, i) => {
      const x = i * step;
      const y = height - (s.memUsedMB / memTotalMB) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const lastY = height - (history[history.length - 1].memUsedMB / memTotalMB) * height;

  return (
    <svg width={width} height={height} className="block">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <circle cx={width} cy={lastY} r="2" fill="currentColor" />
    </svg>
  );
}
