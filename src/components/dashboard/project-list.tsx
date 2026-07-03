import Link from "next/link";
import { Copy, ExternalLink, FilePenLine, Trash2 } from "lucide-react";
import { CreateProjectDialog } from "@/components/dashboard/create-project-dialog";
import type { ResumeProject, SubscriptionTier } from "@/types/project";

interface ProjectListProps {
  projects: ResumeProject[];
  tier: SubscriptionTier;
  limit: number;
  canEdit: boolean;
  createAction: (formData: FormData) => void | Promise<void>;
  duplicateAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
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
  updateSlugAction,
}: ProjectListProps) {
  const canCreate = canEdit && projects.length < limit;

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-950">Projects</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {tier === "premium" ? "Premium" : "Free"} plan · {projects.length}/{limit} projects
          </p>
        </div>
        <CreateProjectDialog canCreate={canCreate} action={createAction} />
      </div>

      {canEdit && !canCreate ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          현재 플랜의 프로젝트 생성 한도에 도달했습니다.
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {projects.map((project) => (
          <article key={project.id} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-zinc-950">{project.title}</h2>
                <form action={updateSlugAction} className="mt-2 flex max-w-sm items-center gap-2">
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
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
                {project.mode}
              </span>
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
              <form action={deleteAction} className="ml-auto">
                <input type="hidden" name="projectId" value={project.id} />
                <button
                  disabled={!canEdit}
                  className="inline-flex size-9 items-center justify-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:text-zinc-200 disabled:hover:bg-transparent"
                >
                  <Trash2 className="size-4" />
                </button>
              </form>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
