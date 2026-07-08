import { CreateProjectDialog } from "@/components/dashboard/create-project-dialog";
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
