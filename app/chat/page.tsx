import Link from "next/link";
import { ChatTester } from "@/components/ChatTester";

export default function ChatPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <Link href="/" className="text-xs text-muted-foreground hover:underline">
            ← hal
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Chat tester</h1>
        </div>
        <Link href="/models" className="text-sm text-muted-foreground hover:underline">
          ← models
        </Link>
      </header>
      <ChatTester />
    </main>
  );
}
