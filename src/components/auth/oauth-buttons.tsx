"use client";

import { Github } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

type Provider = "google" | "github";

const providers: Array<{ id: Provider; label: string }> = [
  { id: "google", label: "Google로 로그인" },
  { id: "github", label: "Github로 로그인" },
];

export function OAuthButtons({ className }: { className?: string }) {
  const [pendingProvider, setPendingProvider] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(provider: Provider) {
    setPendingProvider(provider);
    setError(null);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider,
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
      setPendingProvider(null);
    }
  }

  return (
    <div className={cn("grid gap-2", className)}>
      {providers.map((provider) => (
        <button
          key={provider.id}
          type="button"
          onClick={() => void signIn(provider.id)}
          className="flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50"
        >
          {provider.id === "github" ? <Github className="size-4" /> : <span className="text-base font-bold">G</span>}
          {pendingProvider === provider.id ? "연결 중..." : provider.label}
        </button>
      ))}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

