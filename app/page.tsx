import { GpuPanel } from "@/components/GpuPanel";
import { VramHolders } from "@/components/VramHolders";
import { ServicesGrid } from "@/components/ServicesGrid";
import { ActivityFeed } from "@/components/ActivityFeed";
import { ComfyQueue } from "@/components/ComfyQueue";
import { DiskUsage } from "@/components/DiskUsage";
import { PanicButton } from "@/components/PanicButton";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">hal</h1>
        <nav className="flex items-center gap-3 text-sm">
          <a href="/models" className="text-muted-foreground hover:underline">
            models
          </a>
          <a href="/chat" className="text-muted-foreground hover:underline">
            chat
          </a>
          <span className="text-xs text-muted-foreground">192.168.50.44</span>
        </nav>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <GpuPanel />
        <div className="space-y-3">
          <VramHolders />
          <ComfyQueue />
        </div>
      </div>

      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">
          Services
        </h2>
        <ServicesGrid />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ActivityFeed limit={10} />
        <DiskUsage />
      </div>

      <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <PanicButton />
      </div>
    </main>
  );
}
