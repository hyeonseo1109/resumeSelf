"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import {
  Copy,
  ExternalLink,
  FilePenLine,
  Lock,
  Pencil,
  StickyNote,
  Unlock,
} from "lucide-react";
import { DeleteProjectButton } from "@/components/dashboard/delete-project-button";
import { cn } from "@/lib/utils/cn";
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

  if (isDeleted) {
    return null;
  }

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <form
            action={updateTitleAction}
            onSubmit={handleTitleSubmit}
            className="flex max-w-sm items-center gap-2"
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
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-300"
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
              className="h-8 rounded-md border border-zinc-200 px-2 text-xs font-medium text-zinc-600 disabled:cursor-not-allowed disabled:text-zinc-300"
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
            className="inline-flex items-center gap-1.5 rounded-md bg-zinc-950 px-3 py-2 text-sm font-medium text-white"
          >
            <FilePenLine className="size-4" />
            수정
          </Link>
        ) : null}
        <Link
          href={`/${project.slug}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700"
        >
          <ExternalLink className="size-4" />
          열기
        </Link>
        <form action={duplicateAction}>
          <input type="hidden" name="projectId" value={project.id} />
          <button
            disabled={!canEdit || !canCreate}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 disabled:cursor-not-allowed disabled:text-zinc-300"
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
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-300"
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
