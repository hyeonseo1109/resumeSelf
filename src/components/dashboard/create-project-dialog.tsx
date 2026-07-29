"use client";

import { Loader2, Plus, X } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { useFormStatus } from "react-dom";

export interface PendingProjectDraft {
  title: string;
  slug: string;
  mode: "template" | "free";
}

interface CreateProjectDialogProps {
  canCreate: boolean;
  action: (formData: FormData) => void | Promise<void>;
  onCreatePending?: (project: PendingProjectDraft) => void;
}

export function CreateProjectDialog({
  canCreate,
  action,
  onCreatePending,
}: CreateProjectDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get("title") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim();
    const rawMode = String(formData.get("mode") ?? "template");

    if (!title) {
      return;
    }

    setIsSubmitting(true);
    onCreatePending?.({
      title,
      slug,
      mode: rawMode === "free" ? "free" : "template",
    });
  };

  return (
    <>
      <button
        type="button"
        disabled={!canCreate || isSubmitting}
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
      >
        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        새 프로젝트
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/35 px-4">
          <div className="w-full max-w-lg rounded-lg border border-zinc-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <div>
                <h2 className="font-semibold text-zinc-950">새 프로젝트</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  템플릿 또는 빈 캔버스로 시작하세요.
                </p>
              </div>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsOpen(false)}
                className="inline-flex size-9 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-300"
              >
                <X className="size-4" />
              </button>
            </div>

            <form action={action} onSubmit={handleSubmit} className="grid gap-4 p-5">
              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-zinc-700">
                  프로젝트 이름
                </span>
                <input
                  required
                  name="title"
                  placeholder="예: Hendo Portfolio"
                  className="h-10 rounded-md border border-zinc-200 px-3 text-sm outline-emerald-500"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-zinc-700">
                  공개 URL slug
                </span>
                <input
                  name="slug"
                  placeholder="예: Hendo"
                  className="h-10 rounded-md border border-zinc-200 px-3 text-sm outline-emerald-500"
                />
                <span className="text-xs text-zinc-500">
                  비워두면 프로젝트 이름으로 자동 생성됩니다. 중복 slug는 자동
                  보정됩니다.
                </span>
              </label>

              <fieldset className="grid gap-2">
                <legend className="text-sm font-medium text-zinc-700">
                  시작 모드
                </legend>
                <label className="flex cursor-pointer gap-3 rounded-md border border-zinc-200 p-3 hover:bg-zinc-50">
                  <input
                    type="radio"
                    name="mode"
                    value="template"
                    defaultChecked
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-medium text-zinc-950">
                      Template Mode
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-zinc-500">
                      미리 구성된 이력서 템플릿에서 내용만 바꿉니다.
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer gap-3 rounded-md border border-zinc-200 p-3 hover:bg-zinc-50">
                  <input
                    type="radio"
                    name="mode"
                    value="free"
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-medium text-zinc-950">
                      Free Mode
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-zinc-500">
                      빈 캔버스에서 자유롭게 배치합니다.
                    </span>
                  </span>
                </label>
              </fieldset>

              <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsOpen(false)}
                  className="h-10 rounded-md border border-zinc-200 px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-300"
                >
                  취소
                </button>
                <CreateProjectSubmitButton />
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function CreateProjectSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 items-center gap-1.5 rounded-md bg-zinc-950 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {pending ? "생성 중..." : "생성하고 편집"}
    </button>
  );
}
