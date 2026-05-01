import Link from "next/link";
import { ModelList } from "@/components/ModelList";

export default function ModelsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <Link href="/" className="text-xs text-muted-foreground hover:underline">
            ← hal
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Ollama models</h1>
        </div>
        <Link href="/chat" className="text-sm text-muted-foreground hover:underline">
          chat tester →
        </Link>
      </header>
      <ModelList />
    </main>
  );
}
