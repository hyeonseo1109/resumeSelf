import type { ResumeProject } from "@/types/project";

export function PublicToc({
  navigation,
}: {
  navigation: ResumeProject["navigation"];
}) {
  return (
    <aside className="fixed right-2 top-1/2 z-40 w-28 -translate-y-1/2 p-2 text-right sm:right-4 sm:w-36 lg:left-[calc(50%+450px)] lg:right-auto lg:w-44">
      <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-300">
        Contents
      </p>
      <div className="grid gap-1">
        {navigation.map((item) => (
          <a
            key={item.id}
            href={`#${item.target}`}
            className="rounded-md px-2 py-1.5 text-right text-xs font-medium text-zinc-400 transition hover:text-base hover:font-semibold hover:text-zinc-950"
          >
            {item.label}
          </a>
        ))}
      </div>
    </aside>
  );
}
