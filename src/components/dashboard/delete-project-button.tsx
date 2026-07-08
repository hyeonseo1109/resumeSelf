"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";

export function DeleteProjectButton({
  projectId,
  projectTitle,
  disabled,
  deleteLocked,
  action,
  onOptimisticDelete,
}: {
  projectId: string;
  projectTitle: string;
  disabled: boolean;
  deleteLocked: boolean;
  action: (formData: FormData) => void | Promise<void>;
  onOptimisticDelete: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function deleteProject() {
    const formData = new FormData();
    formData.set("projectId", projectId);
    onOptimisticDelete();
    setIsOpen(false);
    startTransition(() => {
      void action(formData);
    });
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled || deleteLocked || isPending}
        onClick={() => setIsOpen(true)}
        className="inline-flex size-9 items-center justify-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:text-zinc-200 disabled:hover:bg-transparent"
        title={deleteLocked ? "삭제 잠금이 켜져 있습니다." : "프로젝트 삭제"}
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/30 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`delete-project-${projectId}`}
            className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-5 shadow-xl"
          >
            <h2 id={`delete-project-${projectId}`} className="text-base font-semibold text-zinc-950">
              프로젝트를 삭제할까요?
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              {projectTitle} 프로젝트가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="h-9 rounded-md border border-zinc-200 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                아니요
              </button>
              <button
                type="button"
                onClick={deleteProject}
                className="inline-flex h-9 items-center justify-center rounded-md border border-red-600 bg-red-600 px-3 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
              >
                예, 삭제
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
