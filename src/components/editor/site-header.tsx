import { cn } from "@/lib/utils/cn";
import type { ResumeProject } from "@/types/project";

export function SiteHeader({
  project,
  mode,
  activeTarget,
  onNavigate,
  onTitleClick,
}: {
  project: ResumeProject;
  mode: "edit" | "preview";
  activeTarget?: string;
  onNavigate: (target: string) => void;
  onTitleClick: () => void;
}) {
  return (
    <header className="flex min-h-16 items-center justify-between border-b border-zinc-100 px-8">
      <button
        type="button"
        onClick={onTitleClick}
        className="text-lg font-semibold text-zinc-950 hover:text-emerald-700"
      >
        {project.title}
      </button>
      {project.navigationMode === "scroll" ? (
        <span className="text-xs font-medium text-zinc-400">Scroll Mode</span>
      ) : (
        <nav className="flex flex-wrap items-center justify-end gap-2">
          {project.navigation.map((item) => (
            <a
              key={item.id}
              href={
                project.navigationMode === "scroll"
                  ? `#${item.target}`
                  : `/${project.slug}/${item.target}`
              }
              onClick={(event) => {
                if (mode === "edit" || mode === "preview") {
                  event.preventDefault();
                  onNavigate(item.target);
                }
              }}
              className={cn(
                "rounded-md px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50",
                activeTarget === item.target && "bg-zinc-100 text-zinc-950",
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
