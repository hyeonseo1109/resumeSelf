"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, Plus, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { normalizeAnchor } from "@/features/editor/view-helpers";
import { cn } from "@/lib/utils/cn";
import type { ResumeProject } from "@/types/project";

export function RouteSwitcher({
  project,
  activePageId,
  onSelectPage,
  onAddNavigationPage,
  onUpdateNavigationItem,
  onRemoveNavigationPage,
  onReorderNavigationPage,
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
  onReorderNavigationPage: (activeId: string, overId: string) => void;
  onSetHomePage: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement | null>(null);
  const routeSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  const activePage =
    project.pages.find((page) => page.id === activePageId) ?? project.pages[0];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleOutsideClick(event: MouseEvent) {
      if (
        switcherRef.current &&
        !switcherRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  return (
    <div ref={switcherRef} className="relative">
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
          <DndContext
            sensors={routeSensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => {
              const activeId = String(event.active.id);
              const overId = event.over?.id ? String(event.over.id) : "";
              if (overId) {
                onReorderNavigationPage(activeId, overId);
              }
            }}
          >
            <SortableContext
              items={project.navigation.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid gap-2">
                {project.navigation.map((item, index) => {
                  const linkedPage = project.pages.find(
                    (page) => page.slug === item.target,
                  );
                  const isHome = index === 0;

                  return (
                    <SortableRouteItem key={item.id} itemId={item.id}>
                      <div className="flex min-w-0 items-center gap-1">
                        <input
                          value={item.label}
                          onPointerDown={(event) => event.stopPropagation()}
                          onChange={(event) =>
                            onUpdateNavigationItem(item.id, {
                              label: event.target.value,
                            })
                          }
                          className="h-8 min-w-0 flex-1 rounded border border-zinc-200 px-2 text-xs"
                        />
                        <button
                          type="button"
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={() =>
                            linkedPage && onSelectPage(linkedPage.id)
                          }
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
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={() => onRemoveNavigationPage(item.id)}
                          className="inline-flex size-8 items-center justify-center rounded border border-zinc-200 text-zinc-400 hover:text-red-600"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          value={item.target}
                          onPointerDown={(event) => event.stopPropagation()}
                          onChange={(event) =>
                            onUpdateNavigationItem(item.id, {
                              target: normalizeAnchor(event.target.value),
                            })
                          }
                          className="h-8 min-w-0 flex-1 rounded border border-zinc-200 px-2 text-xs text-zinc-500"
                        />
                        <button
                          type="button"
                          onPointerDown={(event) => event.stopPropagation()}
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
                    </SortableRouteItem>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
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

function SortableRouteItem({
  itemId,
  children,
}: {
  itemId: string;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: itemId });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      {...attributes}
      {...listeners}
      className={cn(
        "grid cursor-grab gap-2 rounded-md bg-zinc-50 p-2 active:cursor-grabbing",
        isDragging && "relative z-10 shadow-lg ring-1 ring-emerald-300",
      )}
    >
      {children}
    </div>
  );
}
