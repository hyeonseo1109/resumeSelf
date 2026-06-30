import Link from "next/link";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

export function TopNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-sm font-bold tracking-[0.18em] text-zinc-950">
          RESUMESELF
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/dashboard" className="rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100">
            Dashboard
          </Link>
          <div className="hidden sm:block">
            <OAuthButtons className="[&_button]:h-9 [&_button]:px-3 [&_button]:text-xs [&_button:first-child]:hidden [&_p]:hidden" />
          </div>
        </nav>
      </div>
    </header>
  );
}

