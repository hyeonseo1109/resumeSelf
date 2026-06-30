"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

export function OAuthButtons({ className }: { className?: string }) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setIsPending(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signInError) {
        setError(signInError.message);
      }
    } catch {
      setError("Supabase 환경 변수를 설정하면 OAuth 로그인을 사용할 수 있습니다.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <button
        type="button"
        onClick={() => void signInWithGoogle()}
        className="flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50"
      >
        <span className="text-base font-bold">G</span>
        {isPending ? "연결 중..." : "Google로 로그인"}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
