"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";

type StepResult = {
  service: string;
  action: "stop" | "start";
  ok: boolean;
  error?: string;
  ms: number;
};

const CONFIRM_TEXT = "PANIC";

export function PanicButton() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<StepResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fire() {
    setRunning(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch("/api/panic", { method: "POST" });
      const body = (await res.json()) as { ok?: boolean; results?: StepResult[]; error?: string };
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setResults(body.results ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (running) return;
        setOpen(o);
        if (!o) {
          setConfirm("");
          setResults(null);
          setError(null);
        }
      }}
    >
      <SheetTrigger render={<Button variant="destructive" className="w-full" />}>
        PANIC RESET
      </SheetTrigger>
      <SheetContent side="bottom" className="space-y-4 px-4 pb-6">
        <SheetHeader>
          <SheetTitle>Panic reset</SheetTitle>
        </SheetHeader>
        <p className="text-sm text-muted-foreground">
          Stops every managed service in dependency order, waits 3 seconds, then starts them
          back up. Use when VRAM is stuck or a service is hung.
        </p>
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            Type <span className="font-mono">{CONFIRM_TEXT}</span> to confirm
          </div>
          <Input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={running}
            autoFocus
          />
        </div>
        <Button
          variant="destructive"
          className="w-full"
          disabled={running || confirm !== CONFIRM_TEXT}
          onClick={fire}
        >
          {running ? "Resetting…" : "Confirm panic"}
        </Button>
        {error && <div className="text-sm text-red-600">{error}</div>}
        {results && (
          <ul className="text-sm font-mono space-y-1 max-h-[40vh] overflow-auto">
            {results.map((r, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span>
                  <span className={r.ok ? "text-green-600" : "text-red-600"}>
                    {r.ok ? "✓" : "✗"}
                  </span>{" "}
                  {r.action} {r.service}
                </span>
                <span className="text-muted-foreground tabular-nums">{r.ms}ms</span>
              </li>
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
}
