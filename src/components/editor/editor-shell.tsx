"use client";

import { DndContext, type DragEndEvent, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Download, Eye, LayoutDashboard, Link2, Pencil, Save } from "lucide-react";
import NextLink from "next/link";
import { useEffect, useMemo } from "react";
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
  const addComponent = useStore(store, (state) => state.addComponent);
  const updateComponent = useStore(store, (state) => state.updateComponent);
  const saveStatus = useStore(store, (state) => state.saveStatus);
  const markSaved = useStore(store, (state) => state.markSaved);
  const mode = useStore(store, (state) => state.mode);
  const setMode = useStore(store, (state) => state.setMode);

  const components = editorProject.pages[0]?.sections[0]?.components ?? [];

  useEffect(() => {
    if (saveStatus !== "dirty") {
      return;
    }

    const timer = window.setTimeout(() => {
      markSaved();
    }, 10_000);

    return () => window.clearTimeout(timer);
  }, [markSaved, saveStatus]);

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

  async function exportPdf() {
    const element = document.querySelector("#resume-canvas");
    if (!element) {
      return;
    }

    const html2pdf = (await import("html2pdf.js")).default;
    await html2pdf()
      .set({
        filename: `${editorProject.slug}.pdf`,
        margin: 8,
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(element)
      .save();
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100 text-zinc-950">
      <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-3">
        <div className="flex items-center gap-2">
          <NextLink href="/dashboard" className="inline-flex size-9 items-center justify-center rounded-md hover:bg-zinc-100">
            <LayoutDashboard className="size-4" />
          </NextLink>
          <div>
            <p className="text-sm font-semibold">{editorProject.title}</p>
            <p className="text-xs text-zinc-500">/{editorProject.slug}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600">
            <Save className="size-3.5" />
            {saveStatus === "dirty" ? "10초 후 자동 저장" : saveStatus === "saved" ? "방금 저장됨" : "저장됨"}
          </span>
          <button
            type="button"
            onClick={() => setMode("edit")}
            className={cn("inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm", mode === "edit" && "bg-zinc-950 text-white")}
          >
            <Pencil className="size-4" />
            편집
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={cn("inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm", mode === "preview" && "bg-zinc-950 text-white")}
          >
            <Eye className="size-4" />
            미리보기
          </button>
          <button type="button" onClick={() => void exportPdf()} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-sm">
            <Download className="size-4" />
            PDF 저장
          </button>
          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(`${window.location.origin}/${editorProject.slug}`)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-sm"
          >
            <Link2 className="size-4" />
            URL 공유
          </button>
        </div>
      </header>

      <div className={cn("grid flex-1", mode === "edit" ? "grid-cols-[240px_1fr_280px]" : "grid-cols-1")}>
        {mode === "edit" ? (
          <aside className="border-r border-zinc-200 bg-white p-3">
            <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">Insert</h2>
            <div className="mt-3 grid gap-2">
              {insertableComponents.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => addComponent(item.type)}
                  className="rounded-md border border-zinc-200 p-3 text-left transition hover:border-zinc-400 hover:bg-zinc-50"
                >
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-zinc-500">{item.description}</span>
                </button>
              ))}
            </div>
          </aside>
        ) : null}

        <main className="overflow-auto p-6">
          <DndContext onDragEnd={handleDragEnd}>
            <div id="resume-canvas" className="relative mx-auto min-h-[1120px] w-full max-w-[840px] bg-white shadow-sm ring-1 ring-zinc-200">
              <SiteHeader project={editorProject} />
              {components.map((component) => (
                <CanvasComponent key={component.id} component={component} preview={mode === "preview"} />
              ))}
            </div>
          </DndContext>
        </main>

        {mode === "edit" ? <PropertyPanel components={components} /> : null}
      </div>
    </div>
  );
}

function SiteHeader({ project }: { project: ResumeProject }) {
  return (
    <header className="flex min-h-16 items-center justify-between border-b border-zinc-100 px-8">
      <strong className="text-sm">{project.title}</strong>
      <nav className="flex flex-wrap items-center justify-end gap-2">
        {project.navigation.map((item) => (
          <a key={item.id} href={project.navigationMode === "scroll" ? `#${item.target}` : `/${item.target}`} className="rounded-md px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50">
            {item.label}
          </a>
        ))}
      </nav>
    </header>
  );
}

function CanvasComponent({ component, preview }: { component: ResumeComponent; preview: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: component.id,
    disabled: preview,
  });

  const style = {
    width: component.width,
    height: component.height,
    left: component.x,
    top: component.y,
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn("absolute overflow-hidden rounded-md", !preview && "cursor-move outline outline-1 outline-dashed outline-zinc-300")}
    >
      {component.type === "text" ? (
        <div className="h-full w-full p-2 text-zinc-900" style={component.props}>
          {component.content}
        </div>
      ) : component.type === "divider" ? (
        <div className="mt-4 border-t border-zinc-300" />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-md bg-zinc-100 text-sm font-medium text-zinc-500">
          {component.type}
        </div>
      )}
    </div>
  );
}

function PropertyPanel({ components }: { components: ResumeComponent[] }) {
  return (
    <aside className="border-l border-zinc-200 bg-white p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Properties</h2>
      <div className="mt-4 grid gap-4 text-sm">
        <label className="grid gap-1">
          <span className="text-zinc-500">Navigation Mode</span>
          <select className="h-9 rounded-md border border-zinc-200 px-2">
            <option>Scroll</option>
            <option>Router</option>
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-zinc-500">Canvas Components</span>
          <input readOnly value={`${components.length} items`} className="h-9 rounded-md border border-zinc-200 px-2" />
        </label>
        <div className="rounded-md bg-zinc-50 p-3 text-xs leading-5 text-zinc-500">
          다음 단계에서 선택 컴포넌트별 색상, 크기, 폰트, Border, Radius, Margin, Padding 편집기를 연결합니다.
        </div>
      </div>
    </aside>
  );
}

