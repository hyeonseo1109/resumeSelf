import { cn } from "@/lib/utils/cn";
import type { ResumeProject } from "@/types/project";

export function ScrollToc({
  navigation,
  activeTarget,
  onSelect,
}: {
  navigation: ResumeProject["navigation"];
  activeTarget: string;
  onSelect: (target: string) => void;
}) {
  return (
    <aside className="fixed right-2 top-1/2 z-40 w-28 -translate-y-1/2 p-2 text-right sm:right-4 sm:w-36 lg:left-[calc(50%+300px)] lg:right-auto lg:w-44">
      <div className="grid gap-1">
        {navigation.map((item) => {
          const isActive = activeTarget === item.target;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.target)}
              className={cn(
                "rounded-md px-2 py-1.5 text-right transition hover:bg-zinc-100 hover:text-base hover:font-semibold hover:text-zinc-950 ",
                isActive
                  ? "text-base font-semibold text-zinc-950"
                  : "text-xs font-medium text-zinc-400",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
