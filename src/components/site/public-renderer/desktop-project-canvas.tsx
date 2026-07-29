"use client";

import { useEffect, useRef, useState } from "react";
import type { ResumeProject } from "@/types/project";
import {
  getCanvasBackgroundCss,
  getCanvasBackgroundStyle,
} from "@/features/editor/canvas-background";
import { getPageTitleSpacerOffset } from "@/features/editor/spacer-layout";
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
  const wrapperRef = useRef<HTMLElement | null>(null);
  const [scale, setScale] = useState(1);
  const canvasBackground = getCanvasBackgroundCss(
    getCanvasBackgroundStyle(pageLayouts[0]?.page),
  );

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) {
      return;
    }

    function updateScale() {
      const availableWidth = wrapper?.clientWidth ?? PUBLIC_CANVAS_WIDTH;
      setScale(Math.min(1, availableWidth / PUBLIC_CANVAS_WIDTH));
    }

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={wrapperRef}
      className="relative mx-auto block w-full max-w-[840px] px-0"
      style={{
        height: canvasHeight * scale,
      }}
    >
      <div
        className="relative origin-top-left shadow-sm ring-1 ring-zinc-200"
        style={{
          width: PUBLIC_CANVAS_WIDTH,
          minHeight: canvasHeight,
          background: canvasBackground,
          transform: `scale(${scale})`,
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
                  style={{
                    top:
                      layout.offset +
                      12 +
                      getPageTitleSpacerOffset(layout.components),
                    height: 44,
                  }}
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
