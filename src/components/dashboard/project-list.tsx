"use client";

import { useState } from "react";
import {
  CreateProjectDialog,
  type PendingProjectDraft,
} from "@/components/dashboard/create-project-dialog";
import { ProjectCard } from "@/components/dashboard/project-card";
import type { ResumeProject, SubscriptionTier } from "@/types/project";

interface ProjectListProps {
  projects: ResumeProject[];
  tier: SubscriptionTier;
  limit: number;
  canEdit: boolean;
  createAction: (formData: FormData) => void | Promise<void>;
  duplicateAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
  updateDeleteLockAction: (formData: FormData) => void | Promise<void>;
  updateMemoAction: (formData: FormData) => void | Promise<void>;
  updateSlugAction: (formData: FormData) => void | Promise<void>;
}

export function ProjectList({
  projects,
  tier,
  limit,
  canEdit,
  createAction,
  duplicateAction,
  deleteAction,
  updateDeleteLockAction,
  updateMemoAction,
  updateSlugAction,
}: ProjectListProps) {
  const [pendingProject, setPendingProject] = useState<PendingProjectDraft | null>(null);
  const optimisticProjectCount = projects.length + (pendingProject ? 1 : 0);
  const canCreate = canEdit && optimisticProjectCount < limit && !pendingProject;

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-950">Projects</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {tier === "premium" ? "Premium" : "Free"} plan · {optimisticProjectCount}/{limit} projects
          </p>
        </div>
        <CreateProjectDialog
          canCreate={canEdit && optimisticProjectCount < limit}
          action={createAction}
          onCreatePending={setPendingProject}
        />
      </div>

      {canEdit && !canCreate && !pendingProject ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          현재 플랜의 프로젝트 생성 한도에 도달했습니다.
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {pendingProject ? <PendingProjectCard project={pendingProject} /> : null}
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            canEdit={canEdit}
            canCreate={canCreate}
            duplicateAction={duplicateAction}
            deleteAction={deleteAction}
            updateDeleteLockAction={updateDeleteLockAction}
            updateMemoAction={updateMemoAction}
            updateSlugAction={updateSlugAction}
          />
        ))}
      </div>
    </section>
  );
}

function PendingProjectCard({ project }: { project: PendingProjectDraft }) {
  return (
    <article
      aria-live="polite"
      className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate font-semibold text-zinc-950">{project.title}</h2>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
              생성 중
            </span>
          </div>
          <p className="mt-2 text-sm text-zinc-400">
            /{project.slug || "slug 자동 생성 중"}
          </p>
        </div>
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500">
          {project.mode === "template" ? "Template" : "Free"}
        </span>
      </div>

      <div className="mt-5 grid gap-2">
        <div className="h-9 w-28 animate-pulse rounded-md bg-zinc-200" />
        <div className="flex gap-2">
          <div className="h-9 w-20 animate-pulse rounded-md bg-zinc-100" />
          <div className="h-9 w-20 animate-pulse rounded-md bg-zinc-100" />
          <div className="h-9 flex-1 animate-pulse rounded-md bg-zinc-100" />
        </div>
      </div>
    </article>
  );
}
