import { db } from "./db";
import { getSnapshot } from "./nvidia";

export type EventType = "service_action" | "panic" | "model_pull" | "model_delete";

export type EventInput = {
  type: EventType;
  target?: string | null;
  action?: string | null;
  success: boolean;
  message?: string | null;
};

export type EventRow = {
  id: number;
  ts: number;
  type: EventType;
  target: string | null;
  action: string | null;
  vram_used_mb: number | null;
  vram_total_mb: number | null;
  success: number;
  message: string | null;
};

const insert = db.prepare(
  `INSERT INTO events (ts, type, target, action, vram_used_mb, vram_total_mb, success, message)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
);

const recent = db.prepare(`SELECT * FROM events ORDER BY ts DESC LIMIT ?`);

export async function logEvent(input: EventInput): Promise<void> {
  let vramUsed: number | null = null;
  let vramTotal: number | null = null;
  try {
    const snap = await getSnapshot();
    vramUsed = snap.memUsedMB;
    vramTotal = snap.memTotalMB;
  } catch {
    // VRAM snapshot is best-effort. nvidia-smi may briefly fail during a panic.
  }
  insert.run(
    Date.now(),
    input.type,
    input.target ?? null,
    input.action ?? null,
    vramUsed,
    vramTotal,
    input.success ? 1 : 0,
    input.message ?? null,
  );
}

export function getRecentEvents(limit = 50): EventRow[] {
  return recent.all(limit) as EventRow[];
}
