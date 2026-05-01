import { GpuPanel } from "@/components/GpuPanel";
import { VramHolders } from "@/components/VramHolders";
import { ServicesGrid } from "@/components/ServicesGrid";
import { ActivityFeed } from "@/components/ActivityFeed";
import { ComfyQueue } from "@/components/ComfyQueue";
import { DiskUsage } from "@/components/DiskUsage";
import { PanicButton } from "@/components/PanicButton";
import { SystemPanel } from "@/components/SystemPanel";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="hal-eye inline-block h-3 w-3 rounded-full"
          />
          <h1 className="text-2xl font-mono uppercase tracking-[0.2em]">hal</h1>
        </div>
        <nav className="flex items-center gap-4 text-xs font-mono uppercase tracking-wider">
          <a href="/models" className="text-muted-foreground hover:text-foreground">
            models
          </a>
          <a href="/chat" className="text-muted-foreground hover:text-foreground">
            chat
          </a>
          <span className="text-muted-foreground">192.168.50.44</span>
        </nav>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <GpuPanel />
        <div className="space-y-3">
          <SystemPanel />
          <VramHolders />
          <ComfyQueue />
        </div>
      </div>

      <section>
        <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground mb-2">
          // Services
        </h2>
        <ServicesGrid />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ActivityFeed limit={10} />
        <DiskUsage />
      </div>

      <div className="pt-4 border-t border-border">
        <PanicButton />
      </div>
    </main>
  );
}
