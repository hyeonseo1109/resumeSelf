"use client";

import type { ResumeProject } from "@/types/project";
import { PUBLIC_CANVAS_WIDTH } from "./layout";
import { PublicComponent } from "./public-component";
import type { PageLayout, RenderedComponent } from "./types";

export function DesktopProjectCanvas({
  project,
  pageLayouts,
  components,
  canvasHeight,
  isScrollMode,
  onOpenPopup,
}: {
  project: ResumeProject;
  pageLayouts: PageLayout[];
  components: RenderedComponent[];
  canvasHeight: number;
  isScrollMode: boolean;
  onOpenPopup: (id: string) => void;
}) {
  return (
    <section
      className="relative mx-auto hidden px-0 lg:block"
      style={{
        width: PUBLIC_CANVAS_WIDTH,
        minHeight: canvasHeight,
        backgroundColor: pageLayouts[0]?.page.canvasBackground ?? "#ffffff",
      }}
    >
      <div
        className="relative"
        style={{
          width: PUBLIC_CANVAS_WIDTH,
          minHeight: canvasHeight,
          backgroundColor: pageLayouts[0]?.page.canvasBackground ?? "#ffffff",
        }}
      >
        {isScrollMode
          ? pageLayouts.map((layout) => {
              const navItem = project.navigation.find((item) => item.target === layout.page.slug);
              const target = navItem?.target ?? layout.page.slug;
              const label = navItem?.label ?? layout.page.title;

              return (
                <div
                  key={layout.page.id}
                  id={target}
                  className="absolute left-0 w-full scroll-mt-6 px-12 pt-4"
                  style={{ top: layout.offset + 12, height: 44 }}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                    {label}
                  </p>
                </div>
              );
            })
          : null}
        {components.map(({ component, displayTop }) => (
          <PublicComponent
            key={component.id}
            component={component}
            displayTop={displayTop}
            onOpenPopup={() => onOpenPopup(component.id)}
          />
        ))}
      </div>
    </section>
  );
}
