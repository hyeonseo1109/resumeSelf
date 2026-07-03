"use client";

import { DndContext, type DragEndEvent, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  Download,
  Eye,
  LayoutDashboard,
  Link2,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import NextLink from "next/link";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "zustand";
import { insertableComponents } from "@/config/editor";
import { createEditorStore } from "@/features/editor/store";
import { cn } from "@/lib/utils/cn";
import type { ResumeComponent, ResumeProject } from "@/types/project";

interface EditorShellProps {
  project: ResumeProject;
}

export function EditorShell({ project }: EditorShellProps) {
  const store = useMemo(() => createEditorStore(project), [project]);
  const editorProject = useStore(store, (state) => state.project);
  const activePageId = useStore(store, (state) => state.activePageId);
  const setActivePage = useStore(store, (state) => state.setActivePage);
  const addComponent = useStore(store, (state) => state.addComponent);
  const updateComponent = useStore(store, (state) => state.updateComponent);
  const removeComponent = useStore(store, (state) => state.removeComponent);
  const addNavigationPage = useStore(store, (state) => state.addNavigationPage);
  const updateNavigationItem = useStore(
    store,
    (state) => state.updateNavigationItem,
  );
  const removeNavigationPage = useStore(
    store,
    (state) => state.removeNavigationPage,
  );
  const setHomePage = useStore(store, (state) => state.setHomePage);
  const setNavigationMode = useStore(store, (state) => state.setNavigationMode);
  const selectedComponentId = useStore(
    store,
    (state) => state.selectedComponentId,
  );
  const selectComponent = useStore(store, (state) => state.selectComponent);
  const saveStatus = useStore(store, (state) => state.saveStatus);
  const markSaving = useStore(store, (state) => state.markSaving);
  const markSaved = useStore(store, (state) => state.markSaved);
  const markSaveError = useStore(store, (state) => state.markSaveError);
  const mode = useStore(store, (state) => state.mode);
  const setMode = useStore(store, (state) => state.setMode);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const [activeTocTarget, setActiveTocTarget] = useState(
    editorProject.navigation[0]?.target ?? "",
  );
  const scrollAreaRef = useRef<HTMLElement | null>(null);
  const projectRef = useRef(editorProject);
  const saveStatusRef = useRef(saveStatus);

  const activePage =
    editorProject.pages.find((page) => page.id === activePageId) ??
    editorProject.pages[0];
  const isScrollMode = editorProject.navigationMode === "scroll";
  const allComponents = editorProject.pages.flatMap(
    (page) => page.sections[0]?.components ?? [],
  );
  const activePageComponents = activePage?.sections[0]?.components ?? [];
  const pageLayouts = useMemo(() => {
    return editorProject.pages.reduce<
      Array<{
        page: ResumeProject["pages"][number];
        components: ResumeComponent[];
        offset: number;
        height: number;
      }>
    >((layouts, page) => {
      const pageComponents = (page.sections[0]?.components ?? []).filter(
        (component) =>
          !(
            component.type === "section" &&
            component.props.sectionFrame === true
          ),
      );
      const height = Math.max(
        240,
        ...pageComponents.map(
          (component) => component.y + component.height + 72,
        ),
      );
      const offset = layouts.reduce(
        (total, layout) => total + layout.height + 16,
        0,
      );
      const layout = { page, components: pageComponents, offset, height };
      return [...layouts, layout];
    }, []);
  }, [editorProject.pages]);
  const renderItems = isScrollMode
    ? pageLayouts.flatMap((layout) =>
        layout.components.map((component) => ({
          component,
          displayTop: component.y + layout.offset + 44,
        })),
      )
    : activePageComponents.map((component) => ({
        component,
        displayTop: component.y,
      }));
  const components = isScrollMode ? allComponents : activePageComponents;
  const selectedComponent =
    components.find((component) => component.id === selectedComponentId) ??
    null;
  const canvasHeight = isScrollMode
    ? Math.max(
        1120,
        pageLayouts.at(-1)
          ? pageLayouts.at(-1)!.offset + pageLayouts.at(-1)!.height
          : 1120,
      )
    : Math.max(
        1120,
        ...activePageComponents.map(
          (component) => component.y + component.height + 160,
        ),
      );

  useEffect(() => {
    projectRef.current = editorProject;
  }, [editorProject]);

  useEffect(() => {
    saveStatusRef.current = saveStatus;
  }, [saveStatus]);

  useEffect(() => {
    if (!isScrollMode) {
      return;
    }

    const scrollElement = scrollAreaRef.current;
    if (!scrollElement) {
      return;
    }
    const scrollRoot: HTMLElement = scrollElement;

    function updateActiveSection() {
      let currentTarget = editorProject.navigation[0]?.target ?? "";

      for (const item of editorProject.navigation) {
        const anchor = document.getElementById(`editor-section-${item.target}`);
        if (!anchor) {
          continue;
        }

        const scrollAreaTop = scrollRoot.getBoundingClientRect().top;
        const anchorTop = anchor.getBoundingClientRect().top - scrollAreaTop;

        if (anchorTop <= 140) {
          currentTarget = item.target;
        }
      }

      setActiveTocTarget(currentTarget);
    }

    updateActiveSection();
    scrollRoot.addEventListener("scroll", updateActiveSection);
    return () => scrollRoot.removeEventListener("scroll", updateActiveSection);
  }, [editorProject.navigation, isScrollMode]);

  const saveProject = useCallback(async () => {
    if (
      saveStatusRef.current !== "dirty" &&
      saveStatusRef.current !== "error"
    ) {
      return;
    }

    markSaving();

    try {
      const projectToSave = projectRef.current;
      const response = await fetch(`/api/projects/${projectToSave.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: projectToSave.title,
          navigationMode: projectToSave.navigationMode,
          navigation: projectToSave.navigation,
          pages: projectToSave.pages,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save project.");
      }

      markSaved();
    } catch {
      markSaveError();
    }
  }, [markSaveError, markSaved, markSaving]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (saveStatusRef.current === "dirty") {
        void saveProject();
      }
    }, 10_000);

    return () => window.clearInterval(interval);
  }, [saveProject]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (saveStatusRef.current !== "dirty") {
        return;
      }

      const projectToSave = projectRef.current;
      const body = JSON.stringify({
        title: projectToSave.title,
        navigationMode: projectToSave.navigationMode,
        navigation: projectToSave.navigation,
        pages: projectToSave.pages,
      });

      navigator.sendBeacon?.(
        `/api/projects/${projectToSave.id}`,
        new Blob([body], { type: "application/json" }),
      );
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  function handleDragEnd(event: DragEndEvent) {
    const { active, delta } = event;
    const component = components.find((item) => item.id === active.id);

    if (!component) {
      return;
    }

    updateComponent(component.id, {
      x: Math.round(component.x + delta.x),
      y: Math.round(component.y + delta.y),
    });
  }

  function resizeComponent(
    component: ResumeComponent,
    deltaWidth: number,
    deltaHeight: number,
  ) {
    updateComponent(component.id, {
      width: Math.max(48, Math.round(component.width + deltaWidth)),
      height: Math.max(36, Math.round(component.height + deltaHeight)),
    });
  }

  function handleHeaderNavigation(target: string) {
    if (editorProject.navigationMode === "scroll") {
      const nextPage = editorProject.pages.find((page) => page.slug === target);
      if (nextPage) {
        setActivePage(nextPage.id);
      }

      const anchor = document.getElementById(`editor-section-${target}`);
      anchor?.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveTocTarget(target);
      return;
    }

    const nextPage = editorProject.pages.find((page) => page.slug === target);

    if (nextPage) {
      setActivePage(nextPage.id);
    }
  }

  async function exportPdf() {
    const pdfTarget = createPdfExportNode({
      project: editorProject,
      activePage,
      isScrollMode,
      pageLayouts,
      canvasHeight,
    });
    const html2pdf = (await import("html2pdf.js")).default;

    try {
      await waitForPdfNode(pdfTarget);
      await html2pdf()
        .set({
          filename: `${editorProject.slug}.pdf`,
          margin: 8,
          html2canvas: { scale: 2, backgroundColor: "#ffffff", useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(pdfTarget.firstElementChild ?? pdfTarget)
        .save();
    } finally {
      pdfTarget.remove();
    }
  }

  async function shareUrl() {
    const url = `${window.location.origin}/${editorProject.slug}`;

    try {
      await navigator.clipboard.writeText(url);
      setShareStatus("copied");
      window.setTimeout(() => setShareStatus("idle"), 1800);
    } catch {
      setShareStatus("error");
      window.setTimeout(() => setShareStatus("idle"), 2200);
    }
  }

  async function uploadMedia(
    componentId: string,
    file: File,
    mediaType: "image" | "video",
  ) {
    const formData = new FormData();
    formData.set("file", file);
    formData.set("mediaType", mediaType);

    const response = await fetch(`/api/projects/${editorProject.id}/media`, {
      method: "POST",
      body: formData,
    });

    const result = (await response.json()) as {
      path?: string;
      url?: string;
      error?: string;
    };

    if (!response.ok || !result.url) {
      throw new Error(result.error ?? "파일 업로드에 실패했습니다.");
    }

    const component = components.find((item) => item.id === componentId);
    updateComponent(componentId, {
      content: result.url,
      props: { ...component?.props, storagePath: result.path ?? result.url },
    });
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100 text-zinc-950">
      <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-3">
        <div className="flex items-center gap-2">
          <NextLink
            href="/dashboard"
            className="inline-flex size-9 items-center justify-center rounded-md hover:bg-zinc-100"
          >
            <LayoutDashboard className="size-4" />
          </NextLink>
          <div>
            <p className="text-sm font-semibold">{editorProject.title}</p>
            <p className="text-xs text-zinc-500">/{editorProject.slug}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isScrollMode ? (
            <RouteSwitcher
              project={editorProject}
              activePageId={activePage?.id}
              onSelectPage={setActivePage}
              onAddNavigationPage={addNavigationPage}
              onUpdateNavigationItem={updateNavigationItem}
              onRemoveNavigationPage={removeNavigationPage}
              onSetHomePage={setHomePage}
            />
          ) : null}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600">
            <Save className="size-3.5" />
            {saveStatus === "dirty"
              ? "저장 대기 중"
              : saveStatus === "saving"
                ? "저장 중..."
                : saveStatus === "saved"
                  ? "방금 저장됨"
                  : saveStatus === "error"
                    ? "저장 실패"
                    : "저장됨"}
          </span>
          <button
            type="button"
            onClick={() => void saveProject()}
            disabled={
              saveStatus === "saving" ||
              saveStatus === "idle" ||
              saveStatus === "saved"
            }
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-sm disabled:cursor-not-allowed disabled:text-zinc-300"
          >
            <Save className="size-4" />
            저장
          </button>
          <button
            type="button"
            onClick={() => setMode("edit")}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm",
              mode === "edit" && "bg-zinc-950 text-white",
            )}
          >
            <Pencil className="size-4" />
            편집
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm",
              mode === "preview" && "bg-zinc-950 text-white",
            )}
          >
            <Eye className="size-4" />
            미리보기
          </button>
          <button
            type="button"
            onClick={() => void exportPdf()}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-sm"
          >
            <Download className="size-4" />
            PDF 저장
          </button>
          <button
            type="button"
            onClick={() => void shareUrl()}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-sm"
          >
            <Link2 className="size-4" />
            {shareStatus === "copied"
              ? "복사됨"
              : shareStatus === "error"
                ? "복사 실패"
                : "URL 공유"}
          </button>
        </div>
      </header>

      <div
        className={cn(
          "grid flex-1",
          mode === "edit" ? "grid-cols-[240px_1fr_280px]" : "grid-cols-1",
        )}
      >
        {mode === "edit" ? (
          <aside className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto border-r border-zinc-200 bg-white p-3">
            <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Insert
            </h2>
            <div className="mt-3 grid gap-2">
              {insertableComponents.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => addComponent(item.type)}
                  className="rounded-md border border-zinc-200 p-3 text-left transition hover:border-zinc-400 hover:bg-zinc-50"
                >
                  <span className="block text-sm font-medium">
                    {item.label}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-zinc-500">
                    {item.description}
                  </span>
                </button>
              ))}
            </div>
          </aside>
        ) : null}

        <main ref={scrollAreaRef} className="overflow-auto p-6">
          <DndContext onDragEnd={handleDragEnd}>
            <div
              id="resume-canvas"
              className="relative mx-auto w-full max-w-[840px] bg-white shadow-sm ring-1 ring-zinc-200"
              style={{ minHeight: canvasHeight }}
            >
              <SiteHeader
                project={editorProject}
                mode={mode}
                activeTarget={activePage?.slug}
                onNavigate={handleHeaderNavigation}
                onTitleClick={() => {
                  if (isScrollMode) {
                    scrollAreaRef.current?.scrollTo({
                      top: 0,
                      behavior: "smooth",
                    });
                    return;
                  }

                  const homePage = editorProject.pages[0];
                  if (homePage) {
                    setActivePage(homePage.id);
                  }
                }}
              />
              {isScrollMode
                ? pageLayouts.map((layout) => {
                    const navItem = editorProject.navigation.find(
                      (item) => item.target === layout.page.slug,
                    );
                    const target = navItem?.target ?? layout.page.slug;
                    const label = navItem?.label ?? layout.page.title;

                    return (
                      <div
                        key={layout.page.id}
                        id={`editor-section-${target}`}
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
              {renderItems.map(({ component, displayTop }) => (
                <CanvasComponent
                  key={component.id}
                  component={component}
                  displayTop={displayTop}
                  preview={mode === "preview"}
                  isSelected={selectedComponentId === component.id}
                  onSelect={() => selectComponent(component.id)}
                  onDelete={() => removeComponent(component.id)}
                  onResize={(deltaWidth, deltaHeight) =>
                    resizeComponent(component, deltaWidth, deltaHeight)
                  }
                />
              ))}
            </div>
          </DndContext>
        </main>

        {mode === "edit" ? (
          <PropertyPanel
            components={components}
            selectedComponent={selectedComponent}
            onUpdate={updateComponent}
            onDelete={removeComponent}
            onUpload={uploadMedia}
            project={editorProject}
            onSetNavigationMode={setNavigationMode}
          />
        ) : null}
      </div>
      {editorProject.navigationMode === "scroll" && editorProject.navigation.length > 0 ? (
        <ScrollToc
          navigation={editorProject.navigation}
          activeTarget={
            editorProject.navigation.some(
              (item) => item.target === activeTocTarget,
            )
              ? activeTocTarget
              : (editorProject.navigation[0]?.target ?? "")
          }
          onSelect={(target) => handleHeaderNavigation(target)}
        />
      ) : null}
    </div>
  );
}

function RouteSwitcher({
  project,
  activePageId,
  onSelectPage,
  onAddNavigationPage,
  onUpdateNavigationItem,
  onRemoveNavigationPage,
  onSetHomePage,
}: {
  project: ResumeProject;
  activePageId?: string;
  onSelectPage: (id: string) => void;
  onAddNavigationPage: () => void;
  onUpdateNavigationItem: (
    id: string,
    patch: { label?: string; target?: string },
  ) => void;
  onRemoveNavigationPage: (id: string) => void;
  onSetHomePage: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const activePage =
    project.pages.find((page) => page.id === activePageId) ?? project.pages[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="inline-flex h-9 min-w-36 items-center justify-between gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm"
      >
        {activePage?.title ?? "Page"}
        <ChevronDown className="size-4 text-zinc-400" />
      </button>
      {isOpen ? (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg">
          <div className="grid gap-2">
            {project.navigation.map((item, index) => {
              const linkedPage = project.pages.find(
                (page) => page.slug === item.target,
              );
              const isHome = index === 0;

              return (
                <div
                  key={item.id}
                  className="grid gap-2 rounded-md bg-zinc-50 p-2"
                >
                  <div className="flex items-center gap-1">
                    <input
                      value={item.label}
                      onChange={(event) =>
                        onUpdateNavigationItem(item.id, {
                          label: event.target.value,
                        })
                      }
                      className="h-8 min-w-0 flex-1 rounded border border-zinc-200 px-2 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => linkedPage && onSelectPage(linkedPage.id)}
                      className={cn(
                        "h-8 rounded border border-zinc-200 px-2 text-xs",
                        linkedPage?.id === activePageId &&
                          "bg-zinc-950 text-white",
                      )}
                    >
                      편집
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveNavigationPage(item.id)}
                      className="inline-flex size-8 items-center justify-center rounded border border-zinc-200 text-zinc-400 hover:text-red-600"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      value={item.target}
                      onChange={(event) =>
                        onUpdateNavigationItem(item.id, {
                          target: normalizeAnchor(event.target.value),
                        })
                      }
                      className="h-8 min-w-0 flex-1 rounded border border-zinc-200 px-2 text-xs text-zinc-500"
                    />
                    <button
                      type="button"
                      onClick={() => onSetHomePage(item.id)}
                      className={cn(
                        "h-8 rounded border border-zinc-200 px-2 text-xs",
                        isHome
                          ? "bg-emerald-50 text-emerald-700"
                          : "text-zinc-500",
                      )}
                    >
                      {isHome ? "대표" : "대표 지정"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={onAddNavigationPage}
            className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-zinc-300 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
          >
            <Plus className="size-4" />
            라우트 추가
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SiteHeader({
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
        className="text-sm font-semibold text-zinc-950 hover:text-emerald-700"
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

function CanvasComponent({
  component,
  displayTop,
  preview,
  isSelected,
  onSelect,
  onDelete,
  onResize,
}: {
  component: ResumeComponent;
  displayTop: number;
  preview: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onResize: (deltaWidth: number, deltaHeight: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: component.id,
    disabled: preview,
  });

  const style = {
    width: component.width,
    height: component.height,
    left: component.x,
    top: displayTop,
    transform: CSS.Translate.toString(transform),
    zIndex:
      component.type === "section" || component.type === "container" ? 0 : 5,
  };

  function handleResizeStart(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startY = event.clientY;

    function handlePointerMove(pointerEvent: PointerEvent) {
      onResize(pointerEvent.clientX - startX, pointerEvent.clientY - startY);
    }

    function handlePointerUp() {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onMouseDown={(event) => {
        if (!preview) {
          event.stopPropagation();
          onSelect();
        }
      }}
      className={cn(
        "absolute rounded-md",
        !preview &&
          "cursor-move outline outline-1 outline-dashed outline-zinc-300",
        isSelected && "outline-2 outline-emerald-500",
      )}
    >
      {!preview ? (
        <button
          type="button"
          data-editor-control="true"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          className="absolute right-1 top-1 z-20 inline-flex size-6 items-center justify-center rounded bg-white/95 text-zinc-500 shadow-sm ring-1 ring-zinc-200 hover:text-red-600"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
      {component.type === "text" ? (
        <div
          className="h-full w-full p-2 text-zinc-900"
          style={component.props as CSSProperties}
        >
          {component.content}
        </div>
      ) : component.type === "divider" ? (
        <div className="mt-4 border-t border-zinc-300" />
      ) : component.type === "image" && component.content ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={component.content}
          alt=""
          className="h-full w-full rounded-md"
          style={{
            objectFit: String(
              component.props.objectFit ?? "cover",
            ) as CSSProperties["objectFit"],
            objectPosition: `${Number(component.props.objectPositionX ?? 50)}% ${Number(component.props.objectPositionY ?? 50)}%`,
          }}
        />
      ) : component.type === "video" && component.content ? (
        <video
          src={component.content}
          className="h-full w-full rounded-md"
          controls={preview}
          style={{
            objectFit: String(
              component.props.objectFit ?? "cover",
            ) as CSSProperties["objectFit"],
            objectPosition: `${Number(component.props.objectPositionX ?? 50)}% ${Number(component.props.objectPositionY ?? 50)}%`,
          }}
        />
      ) : component.type === "button" ? (
        <button
          type="button"
          className="h-full w-full rounded-md bg-zinc-950 px-4 text-sm font-medium text-white"
        >
          {component.content ?? "버튼"}
        </button>
      ) : component.type === "link" ? (
        <a
          href={String(component.props.href ?? "#")}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => {
            if (!preview) {
              event.preventDefault();
            }
          }}
          className="flex h-full w-full items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 underline-offset-4 hover:underline"
        >
          {component.content ?? "링크"}
        </a>
      ) : component.type === "section" || component.type === "container" ? (
        <div
          className="flex h-full w-full items-start rounded-md border border-dashed p-3 text-sm font-medium text-zinc-600"
          id={
            component.type === "section"
              ? normalizeAnchor(component.content ?? component.id)
              : undefined
          }
          style={{
            backgroundColor: String(
              component.props.backgroundColor ?? "#f8fafc",
            ),
            borderColor: String(component.props.borderColor ?? "#d4d4d8"),
          }}
        >
          {component.content}
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-md bg-zinc-100 text-sm font-medium text-zinc-500">
          {component.type}
        </div>
      )}
      {!preview ? (
        <button
          type="button"
          data-editor-control="true"
          onPointerDown={handleResizeStart}
          className="absolute bottom-1 right-1 z-20 size-4 rounded-sm border border-zinc-300 bg-white shadow-sm cursor-nwse-resize"
          aria-label="Resize component"
        />
      ) : null}
    </div>
  );
}

function PropertyPanel({
  components,
  selectedComponent,
  onUpdate,
  onDelete,
  onUpload,
  project,
  onSetNavigationMode,
}: {
  components: ResumeComponent[];
  selectedComponent: ResumeComponent | null;
  onUpdate: (id: string, patch: Partial<ResumeComponent>) => void;
  onDelete: (id: string) => void;
  onUpload: (
    id: string,
    file: File,
    mediaType: "image" | "video",
  ) => Promise<void>;
  project: ResumeProject;
  onSetNavigationMode: (mode: ResumeProject["navigationMode"]) => void;
}) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleUpload(file: File, mediaType: "image" | "video") {
    if (!selectedComponent) {
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      await onUpload(selectedComponent.id, file, mediaType);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "파일 업로드에 실패했습니다.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <aside className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto border-l border-zinc-200 bg-white p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Properties
      </h2>
      <div className="mt-4 grid gap-4 text-sm">
        <label className="grid gap-1">
          <span className="text-zinc-500">Navigation Mode</span>
          <select
            value={project.navigationMode}
            onChange={(event) =>
              onSetNavigationMode(
                event.target.value as ResumeProject["navigationMode"],
              )
            }
            className="h-9 rounded-md border border-zinc-200 px-2"
          >
            <option value="scroll">Scroll</option>
            <option value="router">Router</option>
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-zinc-500">Canvas Components</span>
          <input
            readOnly
            value={`${components.length} items`}
            className="h-9 rounded-md border border-zinc-200 px-2"
          />
        </label>
        {selectedComponent ? (
          <div className="grid gap-4 border-t border-zinc-100 pt-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-medium text-zinc-950">
                  {selectedComponent.type}
                </p>
                <p className="text-xs text-zinc-500">
                  {selectedComponent.id.slice(0, 8)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onDelete(selectedComponent.id)}
                className="inline-flex size-9 items-center justify-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="size-4" />
              </button>
            </div>

            {selectedComponent.type === "text" ? (
              <label className="grid gap-1">
                <span className="text-zinc-500">Text</span>
                <textarea
                  value={selectedComponent.content ?? ""}
                  onChange={(event) =>
                    onUpdate(selectedComponent.id, {
                      content: event.target.value,
                    })
                  }
                  className="min-h-28 rounded-md border border-zinc-200 p-2"
                />
              </label>
            ) : null}

            {selectedComponent.type === "section" ||
            selectedComponent.type === "container" ? (
              <label className="grid gap-1">
                <span className="text-zinc-500">Label</span>
                <input
                  value={selectedComponent.content ?? ""}
                  onChange={(event) =>
                    onUpdate(selectedComponent.id, {
                      content: event.target.value,
                    })
                  }
                  className="h-9 rounded-md border border-zinc-200 px-2"
                />
              </label>
            ) : null}

            {selectedComponent.type === "image" ||
            selectedComponent.type === "video" ? (
              <div className="grid gap-3">
                <label className="grid gap-1">
                  <span className="text-zinc-500">
                    {selectedComponent.type === "image"
                      ? "Image File"
                      : "Video File"}
                  </span>
                  <input
                    type="file"
                    accept={
                      selectedComponent.type === "image" ? "image/*" : "video/*"
                    }
                    disabled={isUploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      const mediaType =
                        selectedComponent.type === "image" ? "image" : "video";
                      if (file) {
                        void handleUpload(file, mediaType);
                      }
                    }}
                    className="rounded-md border border-zinc-200 px-2 py-2 text-xs"
                  />
                  <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                    <Upload className="size-3.5" />
                    {isUploading
                      ? "업로드 중..."
                      : selectedComponent.content
                        ? "업로드됨"
                        : "내 컴퓨터에서 파일을 선택하세요."}
                  </span>
                  {uploadError ? (
                    <span className="text-xs text-red-600">{uploadError}</span>
                  ) : null}
                </label>
                <label className="grid gap-1">
                  <span className="text-zinc-500">Fit</span>
                  <select
                    value={String(selectedComponent.props.objectFit ?? "cover")}
                    onChange={(event) =>
                      onUpdate(selectedComponent.id, {
                        props: {
                          ...selectedComponent.props,
                          objectFit: event.target.value,
                        },
                      })
                    }
                    className="h-9 rounded-md border border-zinc-200 px-2"
                  >
                    <option value="cover">Crop</option>
                    <option value="contain">Fit</option>
                    <option value="fill">Stretch</option>
                  </select>
                </label>
                <NumberField
                  label="Crop X (%)"
                  value={Number(selectedComponent.props.objectPositionX ?? 50)}
                  onChange={(value) =>
                    onUpdate(selectedComponent.id, {
                      props: {
                        ...selectedComponent.props,
                        objectPositionX: clamp(value, 0, 100),
                      },
                    })
                  }
                />
                <NumberField
                  label="Crop Y (%)"
                  value={Number(selectedComponent.props.objectPositionY ?? 50)}
                  onChange={(value) =>
                    onUpdate(selectedComponent.id, {
                      props: {
                        ...selectedComponent.props,
                        objectPositionY: clamp(value, 0, 100),
                      },
                    })
                  }
                />
              </div>
            ) : null}

            {selectedComponent.type === "button" ||
            selectedComponent.type === "link" ? (
              <label className="grid gap-1">
                <span className="text-zinc-500">
                  {selectedComponent.type === "button"
                    ? "Button Label"
                    : "Link Label"}
                </span>
                <input
                  value={selectedComponent.content ?? ""}
                  onChange={(event) =>
                    onUpdate(selectedComponent.id, {
                      content: event.target.value,
                    })
                  }
                  className="h-9 rounded-md border border-zinc-200 px-2"
                />
              </label>
            ) : null}

            {selectedComponent.type === "link" ? (
              <label className="grid gap-1">
                <span className="text-zinc-500">Href</span>
                <input
                  value={String(selectedComponent.props.href ?? "")}
                  onChange={(event) =>
                    onUpdate(selectedComponent.id, {
                      props: {
                        ...selectedComponent.props,
                        href: event.target.value,
                      },
                    })
                  }
                  placeholder="https://example.com"
                  className="h-9 rounded-md border border-zinc-200 px-2"
                />
              </label>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="X"
                value={selectedComponent.x}
                onChange={(value) =>
                  onUpdate(selectedComponent.id, { x: value })
                }
              />
              <NumberField
                label="Y"
                value={selectedComponent.y}
                onChange={(value) =>
                  onUpdate(selectedComponent.id, { y: value })
                }
              />
              <NumberField
                label="Width"
                value={selectedComponent.width}
                onChange={(value) =>
                  onUpdate(selectedComponent.id, { width: value })
                }
              />
              <NumberField
                label="Height"
                value={selectedComponent.height}
                onChange={(value) =>
                  onUpdate(selectedComponent.id, { height: value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1">
                <span className="text-zinc-500">Text Color</span>
                <input
                  type="color"
                  value={String(selectedComponent.props.color ?? "#111827")}
                  onChange={(event) =>
                    onUpdate(selectedComponent.id, {
                      props: {
                        ...selectedComponent.props,
                        color: event.target.value,
                      },
                    })
                  }
                  className="h-9 w-full rounded-md border border-zinc-200"
                />
              </label>
              <NumberField
                label="Font Size"
                value={Number(selectedComponent.props.fontSize ?? 16)}
                onChange={(value) =>
                  onUpdate(selectedComponent.id, {
                    props: { ...selectedComponent.props, fontSize: value },
                  })
                }
              />
            </div>
          </div>
        ) : (
          <div className="rounded-md bg-zinc-50 p-3 text-xs leading-5 text-zinc-500">
            캔버스의 컴포넌트를 선택하면 내용, 위치, 크기, 색상을 수정할 수
            있습니다.
          </div>
        )}
      </div>
    </aside>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-zinc-500">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-9 rounded-md border border-zinc-200 px-2"
      />
    </label>
  );
}

function ScrollToc({
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
      {/* <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 ">
        Contents
      </p> */}
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

function normalizeAnchor(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function createPdfExportNode({
  project,
  activePage,
  isScrollMode,
  pageLayouts,
  canvasHeight,
}: {
  project: ResumeProject;
  activePage?: ResumeProject["pages"][number];
  isScrollMode: boolean;
  pageLayouts: Array<{
    page: ResumeProject["pages"][number];
    components: ResumeComponent[];
    offset: number;
    height: number;
  }>;
  canvasHeight: number;
}) {
  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "0";
  wrapper.style.top = "0";
  wrapper.style.background = "#ffffff";
  wrapper.style.color = "#111827";
  wrapper.style.width = "840px";
  wrapper.style.height = `${canvasHeight}px`;
  wrapper.style.minHeight = `${canvasHeight}px`;
  wrapper.style.zIndex = "2147483647";
  wrapper.style.pointerEvents = "none";
  wrapper.style.fontFamily = "Arial, Helvetica, sans-serif";

  const canvas = document.createElement("div");
  canvas.style.position = "relative";
  canvas.style.width = "840px";
  canvas.style.height = `${canvasHeight}px`;
  canvas.style.minHeight = `${canvasHeight}px`;
  canvas.style.background = "#ffffff";
  canvas.style.color = "#111827";

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.height = "64px";
  header.style.padding = "0 32px";
  header.style.borderBottom = "1px solid #f4f4f5";
  header.style.boxSizing = "border-box";
  header.style.fontSize = "14px";
  header.style.fontWeight = "700";
  header.textContent = project.title;
  canvas.appendChild(header);

  const layouts = isScrollMode
    ? pageLayouts
    : [
        {
          page: activePage ?? project.pages[0],
          components: activePage?.sections[0]?.components ?? [],
          offset: 0,
          height: canvasHeight,
        },
      ];

  layouts.forEach((layout) => {
    if (!layout.page) {
      return;
    }

    if (isScrollMode) {
      const label =
        project.navigation.find((item) => item.target === layout.page.slug)
          ?.label ?? layout.page.title;
      const title = document.createElement("div");
      title.style.position = "absolute";
      title.style.left = "48px";
      title.style.top = `${layout.offset + 76}px`;
      title.style.fontSize = "11px";
      title.style.fontWeight = "700";
      title.style.letterSpacing = "1.4px";
      title.style.color = "#a1a1aa";
      title.textContent = label.toUpperCase();
      canvas.appendChild(title);
    }

    layout.components.forEach((component) => {
      canvas.appendChild(
        createPdfComponent(
          component,
          component.y + layout.offset + (isScrollMode ? 44 : 0),
        ),
      );
    });
  });

  wrapper.appendChild(canvas);
  document.body.appendChild(wrapper);

  return wrapper;
}

async function waitForPdfNode(root: HTMLElement) {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }

          image.onload = () => resolve();
          image.onerror = () => resolve();
        }),
    ),
  );
}

function createPdfComponent(component: ResumeComponent, top: number) {
  const frame = document.createElement("div");
  frame.style.position = "absolute";
  frame.style.left = `${component.x}px`;
  frame.style.top = `${top}px`;
  frame.style.width = `${component.width}px`;
  frame.style.height = `${component.height}px`;
  frame.style.boxSizing = "border-box";
  frame.style.overflow = "hidden";
  frame.style.borderRadius = "6px";
  frame.style.color = String(component.props.color ?? "#111827");
  frame.style.fontSize = `${Number(component.props.fontSize ?? 16)}px`;
  frame.style.fontWeight = String(component.props.fontWeight ?? 400);

  if (component.type === "text") {
    frame.style.padding = "8px";
    frame.style.whiteSpace = "pre-wrap";
    frame.textContent = component.content ?? "";
    return frame;
  }

  if (component.type === "image" && component.content) {
    const image = document.createElement("img");
    image.src = component.content;
    image.crossOrigin = "anonymous";
    image.style.width = "100%";
    image.style.height = "100%";
    image.style.objectFit = String(component.props.objectFit ?? "cover");
    image.style.objectPosition = `${Number(component.props.objectPositionX ?? 50)}% ${Number(component.props.objectPositionY ?? 50)}%`;
    frame.appendChild(image);
    return frame;
  }

  if (component.type === "divider") {
    frame.style.borderTop = "1px solid #d4d4d8";
    return frame;
  }

  if (component.type === "button") {
    frame.style.display = "flex";
    frame.style.alignItems = "center";
    frame.style.justifyContent = "center";
    frame.style.background = "#09090b";
    frame.style.color = "#ffffff";
    frame.textContent = component.content ?? "버튼";
    return frame;
  }

  if (component.type === "link") {
    frame.style.display = "flex";
    frame.style.alignItems = "center";
    frame.style.justifyContent = "center";
    frame.style.border = "1px solid #d4d4d8";
    frame.style.textDecoration = "underline";
    frame.textContent = component.content ?? "링크";
    return frame;
  }

  if (component.type === "section" || component.type === "container") {
    frame.style.border = "1px dashed #d4d4d8";
    frame.style.background = String(component.props.backgroundColor ?? "#f8fafc");
    frame.style.padding = "12px";
    frame.textContent = component.content ?? component.type;
    return frame;
  }

  frame.style.display = "flex";
  frame.style.alignItems = "center";
  frame.style.justifyContent = "center";
  frame.style.background = "#f4f4f5";
  frame.style.color = "#71717a";
  frame.textContent = component.type;
  return frame;
}
