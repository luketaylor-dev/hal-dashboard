import Link from "next/link";
import { notFound } from "next/navigation";
import { getService, isKnownService } from "@/lib/config";
import { LogStream } from "@/components/LogStream";

export const dynamic = "force-dynamic";

export default async function LogsPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  if (!isKnownService(name)) notFound();
  const svc = getService(name);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <Link href="/" className="text-xs text-muted-foreground hover:underline">
            ← hal
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            {svc.displayName} <span className="text-muted-foreground text-base">logs</span>
          </h1>
        </div>
        <span className="text-xs text-muted-foreground">{svc.controller}</span>
      </header>
      <LogStream serviceName={name} />
    </main>
  );
}
