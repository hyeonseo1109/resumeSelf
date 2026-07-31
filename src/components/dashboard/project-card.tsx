"use client";

import type { FormEvent, MouseEvent as ReactMouseEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import {
  Copy,
  ExternalLink,
  FilePenLine,
  Lock,
  Pencil,
  Share2,
  StickyNote,
  Unlock,
} from "lucide-react";
import { DeleteProjectButton } from "@/components/dashboard/delete-project-button";
import { cn } from "@/lib/utils/cn";
import { getTemplateShareUrl } from "@/lib/utils/site-url";
import type { ResumeProject } from "@/types/project";

export function ProjectCard({
  project,
  canEdit,
  canCreate,
  duplicateAction,
  deleteAction,
  updateDeleteLockAction,
  updateMemoAction,
  updateSlugAction,
  updateTitleAction,
  existingProjects,
}: {
  project: ResumeProject;
  canEdit: boolean;
  canCreate: boolean;
  duplicateAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
  updateDeleteLockAction: (formData: FormData) => void | Promise<void>;
  updateMemoAction: (formData: FormData) => void | Promise<void>;
  updateSlugAction: (formData: FormData) => void | Promise<void>;
  updateTitleAction: (formData: FormData) => void | Promise<void>;
  existingProjects: Array<{ id: string; title: string }>;
}) {
  const [isDeleted, setIsDeleted] = useState(false);
  const [deleteLocked, setDeleteLocked] = useState(
    project.deleteLocked === true,
  );
  const [templateShareStatus, setTemplateShareStatus] = useState<
    "idle" | "copied" | "error"
  >("idle");
  const [isOpeningEditor, setIsOpeningEditor] = useState(false);

  function getAvailableTitle(value: string) {
    const baseTitle = value.trim();
    const existingTitles = existingProjects
      .filter((item) => item.id !== project.id)
      .map((item) => item.title.trim());

    if (!existingTitles.includes(baseTitle)) {
      return baseTitle;
    }

    let index = 1;
    let candidate = `${baseTitle} (${index})`;

    while (existingTitles.includes(candidate)) {
      index += 1;
      candidate = `${baseTitle} (${index})`;
    }

    return candidate;
  }

  function handleTitleSubmit(event: FormEvent<HTMLFormElement>) {
    const input = event.currentTarget.elements.namedItem("title");

    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const title = input.value.trim();
    if (!title || title === project.title) {
      return;
    }

    const availableTitle = getAvailableTitle(title);
    if (availableTitle === title) {
      return;
    }

    event.preventDefault();

    if (
      window.confirm(
        `이미 같은 프로젝트 이름이 있습니다. '${availableTitle}'로 저장하시겠습니까?`,
      )
    ) {
      input.value = availableTitle;
      event.currentTarget.requestSubmit();
    }
  }

  async function copyTemplateShareUrl() {
    try {
      await navigator.clipboard.writeText(getTemplateShareUrl(project.slug));
      setTemplateShareStatus("copied");
      window.setTimeout(() => setTemplateShareStatus("idle"), 1800);
    } catch {
      setTemplateShareStatus("error");
      window.setTimeout(() => setTemplateShareStatus("idle"), 2200);
    }
  }

  function handleEditorOpen(event: ReactMouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    setIsOpeningEditor(true);
  }

  if (isDeleted) {
    return null;
  }

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      {isOpeningEditor ? (
        <div className="fixed inset-0 z-[200] grid place-items-center bg-white/70 backdrop-blur-sm">
          <div className="w-[min(420px,calc(100vw-32px))] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-2xl">
            <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4">
              <span className="size-5 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-950" />
              <div>
                <p className="text-sm font-semibold text-zinc-950">
                  편집화면으로 이동 중
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  프로젝트 데이터를 불러오고 있습니다.
                </p>
              </div>
            </div>
            <div className="grid gap-3 p-5">
              <div className="h-8 w-2/3 animate-pulse rounded-md bg-zinc-200" />
              <div className="grid grid-cols-[88px_1fr] gap-3">
                <div className="h-28 animate-pulse rounded-md bg-zinc-100" />
                <div className="grid gap-2">
                  <div className="h-5 animate-pulse rounded bg-zinc-100" />
                  <div className="h-5 animate-pulse rounded bg-zinc-100" />
                  <div className="h-5 w-4/5 animate-pulse rounded bg-zinc-100" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <form
            action={updateTitleAction}
            onSubmit={handleTitleSubmit}
            className="group/title flex max-w-sm items-center gap-2"
          >
            <input type="hidden" name="projectId" value={project.id} />
            <input
              name="title"
              defaultValue={project.title}
              disabled={!canEdit}
              maxLength={120}
              className="h-9 min-w-0 flex-1 rounded-md border border-zinc-200 px-2 text-zinc-950 disabled:bg-zinc-50 disabled:text-zinc-300"
            />
            <button
              type="submit"
              disabled={!canEdit}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 transition hover:border-zinc-300 hover:bg-[#eeeeef] group-focus-within/title:bg-[#eeeeef] disabled:cursor-not-allowed disabled:text-zinc-300 disabled:hover:border-zinc-200 disabled:hover:bg-transparent"
              title="프로젝트 이름 저장"
            >
              <Pencil className="size-4" />
            </button>
          </form>
          <form
            action={updateSlugAction}
            className="mt-2 flex max-w-sm items-center gap-2"
          >
            <input type="hidden" name="projectId" value={project.id} />
            <span className="text-sm text-zinc-400">/</span>
            <input
              name="slug"
              defaultValue={project.slug}
              disabled={!canEdit}
              className="h-8 min-w-0 rounded-md border border-zinc-200 px-2 text-sm text-zinc-600 disabled:bg-zinc-50 disabled:text-zinc-300"
            />
            <button
              type="submit"
              disabled={!canEdit}
              className="h-8 rounded-md border border-zinc-200 px-2 text-xs font-medium text-zinc-600 transition hover:border-zinc-300 hover:bg-[#eeeeef] disabled:cursor-not-allowed disabled:text-zinc-300 disabled:hover:border-zinc-200 disabled:hover:bg-transparent"
            >
              URL 저장
            </button>
          </form>
        </div>
        <form
          action={updateDeleteLockAction}
          onSubmit={() => setDeleteLocked((current) => !current)}
        >
          <input type="hidden" name="projectId" value={project.id} />
          <input
            type="hidden"
            name="deleteLocked"
            value={deleteLocked ? "false" : "true"}
          />
          <button
            type="submit"
            disabled={!canEdit}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40",
              deleteLocked
                ? "bg-zinc-950 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
            )}
            title={deleteLocked ? "삭제 잠금 켜짐" : "삭제 잠금 꺼짐"}
          >
            {deleteLocked ? (
              <Lock className="size-3.5" />
            ) : (
              <Unlock className="size-3.5" />
            )}
            {deleteLocked ? "삭제 잠금" : "잠금 꺼짐"}
          </button>
        </form>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {canEdit ? (
          <Link
            href={`/editor/${project.id}`}
            onClick={handleEditorOpen}
            className="inline-flex items-center gap-1.5 rounded-md bg-zinc-950 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
          >
            <FilePenLine className="size-4" />
            수정
          </Link>
        ) : null}
        <Link
          href={`/${project.slug}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-[#eeeeef]"
        >
          <ExternalLink className="size-4" />
          열기
        </Link>
        <button
          type="button"
          onClick={() => void copyTemplateShareUrl()}
          className="inline-flex w-32 shrink-0 items-center justify-center gap-1.5 rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-[#eeeeef]"
        >
          <Share2 className="size-4" />
          {templateShareStatus === "copied"
            ? "링크 복사됨"
            : templateShareStatus === "error"
              ? "복사 실패"
              : "템플릿 공유"}
        </button>
        <form action={duplicateAction}>
          <input type="hidden" name="projectId" value={project.id} />
          <button
            disabled={!canEdit || !canCreate}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-[#eeeeef] disabled:cursor-not-allowed disabled:text-zinc-300 disabled:hover:border-zinc-200 disabled:hover:bg-transparent"
          >
            <Copy className="size-4" />
            복제
          </button>
        </form>
        <form
          action={updateMemoAction}
          className="flex min-w-52 flex-1 items-center gap-1.5"
        >
          <input type="hidden" name="projectId" value={project.id} />
          <input
            name="memo"
            defaultValue={project.memo ?? ""}
            disabled={!canEdit}
            placeholder="프로젝트 메모"
            maxLength={500}
            className="h-9 min-w-0 flex-1 rounded-md border border-zinc-200 px-2 text-sm text-zinc-600 disabled:bg-zinc-50 disabled:text-zinc-300"
          />
          <button
            type="submit"
            disabled={!canEdit}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 transition hover:border-zinc-300 hover:bg-[#eeeeef] disabled:cursor-not-allowed disabled:text-zinc-300 disabled:hover:border-zinc-200 disabled:hover:bg-transparent"
            title="메모 저장"
          >
            <StickyNote className="size-4" />
          </button>
        </form>
        <div className="ml-auto">
          <DeleteProjectButton
            projectId={project.id}
            projectTitle={project.title}
            disabled={!canEdit}
            deleteLocked={deleteLocked}
            action={deleteAction}
            onOptimisticDelete={() => setIsDeleted(true)}
          />
        </div>
      </div>
    </article>
  );
}
