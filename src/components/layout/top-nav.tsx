import Link from "next/link";
import { redirect } from "next/navigation";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/server/projects";

async function logoutAction() {
  "use server";

  const supabase = await createClient();
  await supabase?.auth.signOut();
  redirect("/");
}

export async function TopNav() {
  const user = await getCurrentUser();
  const displayName =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    user?.email ??
    null;

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="text-sm font-bold tracking-[0.18em] text-zinc-950"
        >
          RESUMESELF
        </Link>
        <nav className="flex items-center gap-2">
          {/* <Link
            href="/dashboard"
            className="rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          >
            Dashboard
          </Link> */}
          <div className="flex items-center gap-2">
            {displayName ? (
              <>
                <span className="hidden h-9 max-w-56 items-center truncate rounded-md px-3 text-xs font-medium text-zinc-700 sm:inline-flex">
                  {displayName}님, 안녕하세요!
                </span>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="inline-flex h-9 items-center rounded-md border border-zinc-200 px-3 text-xs font-medium text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50"
                  >
                    로그아웃
                  </button>
                </form>
              </>
            ) : (
              <OAuthButtons className="[&_button]:h-9 [&_button]:px-3 [&_button]:text-xs [&_p]:hidden" />
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
