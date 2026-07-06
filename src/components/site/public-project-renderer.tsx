"use client";

import { useMemo, useState } from "react";
import type { ResumePage, ResumeProject } from "@/types/project";
import { DesktopProjectCanvas } from "./public-renderer/desktop-project-canvas";
import {
  getCanvasHeight,
  getPageLayouts,
  getRenderedComponents,
} from "./public-renderer/layout";
import { MobileProjectView } from "./public-renderer/mobile-project-view";
import { PublicPopupOverlay } from "./public-renderer/public-popup-overlay";
import { PublicToc } from "./public-renderer/public-toc";

export function PublicProjectRenderer({
  project,
  page,
}: {
  project: ResumeProject;
  page: ResumePage;
}) {
  const [openPopupId, setOpenPopupId] = useState<string | null>(null);
  const isScrollMode = project.navigationMode === "scroll";
  const pageLayouts = useMemo(
    () => getPageLayouts(isScrollMode ? project.pages : [page]),
    [isScrollMode, page, project.pages],
  );
  const components = useMemo(
    () => getRenderedComponents(pageLayouts, isScrollMode),
    [pageLayouts, isScrollMode],
  );
  const allComponents = useMemo(
    () => pageLayouts.flatMap((layout) => layout.components),
    [pageLayouts],
  );
  const openPopup = openPopupId
    ? allComponents.find(
        (component) => component.id === openPopupId && component.type === "popup",
      )
    : null;
  const popupChildren = openPopupId
    ? allComponents.filter((component) => component.props.popupId === openPopupId)
    : [];
  const canvasHeight = getCanvasHeight(pageLayouts);

  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-zinc-950">
      <header className="mx-auto flex min-h-16 w-full max-w-[920px] items-center justify-between gap-3 px-3 py-3 sm:px-4">
        <a
          href={isScrollMode ? "#" : `/${project.slug}`}
          className="min-w-0 truncate font-semibold hover:text-emerald-700"
        >
          {project.title}
        </a>
        {isScrollMode ? (
          <span className="text-xs font-medium text-zinc-400">Contents</span>
        ) : (
          <nav className="flex min-w-0 flex-wrap justify-end gap-2">
            {project.navigation.map((item) => (
              <a
                key={item.id}
                href={`/${project.slug}/${item.target}`}
                className="rounded-md px-2 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 sm:px-3 sm:py-2"
              >
                {item.label}
              </a>
            ))}
          </nav>
        )}
      </header>
      <MobileProjectView
        project={project}
        pageLayouts={pageLayouts}
        isScrollMode={isScrollMode}
        onOpenPopup={setOpenPopupId}
      />
      <DesktopProjectCanvas
        project={project}
        pageLayouts={pageLayouts}
        components={components}
        canvasHeight={canvasHeight}
        isScrollMode={isScrollMode}
        onOpenPopup={setOpenPopupId}
      />
      {openPopup ? (
        <PublicPopupOverlay
          popup={openPopup}
          components={popupChildren}
          onClose={() => setOpenPopupId(null)}
        />
      ) : null}
      {isScrollMode && project.navigation.length > 0 ? (
        <PublicToc navigation={project.navigation} />
      ) : null}
    </main>
  );
}
