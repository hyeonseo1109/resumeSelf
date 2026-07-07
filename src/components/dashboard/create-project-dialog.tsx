"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";

interface CreateProjectDialogProps {
  canCreate: boolean;
  action: (formData: FormData) => void | Promise<void>;
}

export function CreateProjectDialog({
  canCreate,
  action,
}: CreateProjectDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        disabled={!canCreate}
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
      >
        <Plus className="size-4" />새 프로젝트
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
                onClick={() => setIsOpen(false)}
                className="inline-flex size-9 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100"
              >
                <X className="size-4" />
              </button>
            </div>

            <form action={action} className="grid gap-4 p-5">
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
                    rounded-md px-3 py-2 text-sm font-medium text-zinc-700
                    hover:bg-zinc-100
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
                  onClick={() => setIsOpen(false)}
                  className="h-10 rounded-md border border-zinc-200 px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="h-10 rounded-md bg-zinc-950 px-4 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  생성하고 편집
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
