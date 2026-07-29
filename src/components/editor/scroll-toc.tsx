import { cn } from "@/lib/utils/cn";
import type { ResumeProject } from "@/types/project";

export function ScrollToc({
  navigation,
  activeTarget,
  onSelect,
  placement = "floating",
}: {
  navigation: ResumeProject["navigation"];
  activeTarget: string;
  onSelect: (target: string) => void;
  placement?: "floating" | "rail";
}) {
  return (
    <aside
      className={cn(
        "z-40 p-1 text-right",
        placement === "rail"
          ? "sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto"
          : "fixed right-28 top-1/2 w-20 -translate-y-1/2 sm:right-40 sm:w-24 lg:right-80 lg:w-28",
      )}
    >
      <div className="grid justify-items-end gap-0.5">
        {navigation.map((item) => {
          const isActive = activeTarget === item.target;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.target)}
              className={cn(
                "max-w-full justify-self-end truncate rounded px-1.5 py-1 text-right leading-tight transition hover:bg-zinc-100 hover:text-[12px] hover:font-semibold hover:text-zinc-950",
                placement === "rail" ? "w-fit" : "w-full",
                isActive
                  ? "text-[12px] font-semibold text-zinc-950"
                  : "text-[10px] font-medium text-zinc-400",
              )}
              title={item.label}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
