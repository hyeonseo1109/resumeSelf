"use client";

import type { ResumeProject } from "@/types/project";
import { buildMobileComponentTree } from "./layout";
import { MobileComponentBlock } from "./mobile-component-block";
import type { PageLayout } from "./types";

export function MobileProjectView({
  project,
  pageLayouts,
  isScrollMode,
  onOpenPopup,
}: {
  project: ResumeProject;
  pageLayouts: PageLayout[];
  isScrollMode: boolean;
  onOpenPopup: (id: string) => void;
}) {
  return (
    <section className="mx-auto grid w-full max-w-[640px] gap-8 px-4 pb-10 lg:hidden">
      {pageLayouts.map((layout) => {
        const navItem = project.navigation.find((item) => item.target === layout.page.slug);
        const target = navItem?.target ?? layout.page.slug;
        const label = navItem?.label ?? layout.page.title;
        const componentTree = buildMobileComponentTree(
          layout.components.filter((component) => !component.props.popupId),
        );

        return (
          <div
            key={layout.page.id}
            id={isScrollMode ? target : undefined}
            className="grid scroll-mt-20 gap-3"
          >
            {isScrollMode ? (
              <p className="pt-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                {label}
              </p>
            ) : null}
            {componentTree.map((node) => (
              <MobileComponentBlock
                key={node.component.id}
                node={node}
                onOpenPopup={onOpenPopup}
              />
            ))}
          </div>
        );
      })}
    </section>
  );
}
