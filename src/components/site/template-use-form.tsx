"use client";

import { Loader2 } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useFormStatus } from "react-dom";

type TemplateUseFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  slug: string;
};

export function TemplateUseForm({ action, slug }: TemplateUseFormProps) {
  const isSubmitLockedRef = useRef(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (isSubmitLockedRef.current) {
      event.preventDefault();
      return;
    }

    isSubmitLockedRef.current = true;
    setIsSubmitted(true);
  }

  return (
    <form action={action} onSubmit={handleSubmit}>
      <input type="hidden" name="slug" value={slug} />
      <TemplateUseButton isSubmitLocked={isSubmitted} />
      {isSubmitted ? <TemplateUseLoadingOverlay /> : null}
    </form>
  );
}

function TemplateUseButton({ isSubmitLocked }: { isSubmitLocked: boolean }) {
  const { pending } = useFormStatus();
  const isDisabled = isSubmitLocked || pending;

  return (
    <button
      type="submit"
      disabled={isDisabled}
      className="inline-flex h-10 w-40 items-center justify-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-wait disabled:bg-zinc-400"
    >
      {isDisabled ? <Loader2 className="size-4 animate-spin" /> : null}
      {isDisabled ? "가져오는 중" : "내 프로젝트로 사용"}
    </button>
  );
}

function TemplateUseLoadingOverlay() {
  const overlay = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-5 shadow-2xl">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-zinc-950 text-white">
            <Loader2 className="size-5 animate-spin" />
          </span>
          <div>
            <p className="text-sm font-semibold text-zinc-950">
              내 프로젝트로 가져오는 중
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              템플릿을 복제하고 편집 화면을 준비하고 있습니다.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-2">
          <div className="h-3 w-5/6 animate-pulse rounded-full bg-zinc-200" />
          <div className="h-3 w-full animate-pulse rounded-full bg-zinc-100" />
          <div className="h-3 w-2/3 animate-pulse rounded-full bg-zinc-100" />
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(overlay, document.body);
}
