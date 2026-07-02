"use client";

import { create } from "zustand";
import type { ComponentType, ResumeComponent, ResumeProject, SaveStatus } from "@/types/project";

interface EditorState {
  project: ResumeProject;
  activePageId: string;
  selectedComponentId: string | null;
  saveStatus: SaveStatus;
  mode: "edit" | "preview";
  setActivePage: (id: string) => void;
  selectComponent: (id: string | null) => void;
  addComponent: (type: ComponentType) => void;
  updateComponent: (id: string, patch: Partial<ResumeComponent>) => void;
  removeComponent: (id: string) => void;
  addNavigationPage: () => void;
  updateNavigationItem: (id: string, patch: { label?: string; target?: string }) => void;
  removeNavigationPage: (id: string) => void;
  setHomePage: (id: string) => void;
  setNavigationMode: (mode: ResumeProject["navigationMode"]) => void;
  setMode: (mode: "edit" | "preview") => void;
  markSaving: () => void;
  markSaved: () => void;
  markSaveError: () => void;
}

export function createEditorStore(initialProject: ResumeProject) {
  return create<EditorState>((set) => ({
    project: initialProject,
    activePageId: initialProject.pages[0]?.id ?? "",
    selectedComponentId: null,
    saveStatus: "idle",
    mode: "edit",
    setActivePage: (id) => set({ activePageId: id, selectedComponentId: null }),
    selectComponent: (id) => set({ selectedComponentId: id }),
    setMode: (mode) => set({ mode }),
    markSaving: () => set({ saveStatus: "saving" }),
    markSaved: () => set({ saveStatus: "saved" }),
    markSaveError: () => set({ saveStatus: "error" }),
    addComponent: (type) =>
      set((state) => {
        const component: ResumeComponent = {
          id: crypto.randomUUID(),
          type,
          x: 96,
          y: 120,
          width: type === "divider" ? 520 : type === "section" || type === "container" ? 620 : 360,
          height: type === "text" ? 96 : type === "section" ? 320 : type === "container" ? 220 : 140,
          content:
            type === "text"
              ? "새 텍스트를 입력하세요"
              : type === "button"
                ? "버튼"
                : type === "link"
                  ? "링크"
                  : type === "section"
                    ? "Section"
                    : type === "container"
                      ? "Container"
                  : undefined,
          props:
            type === "link"
              ? { href: "https://example.com" }
              : type === "image"
                ? { objectFit: "cover", objectPositionX: 50, objectPositionY: 50 }
                : type === "section" || type === "container"
                  ? { backgroundColor: "#f8fafc", borderColor: "#d4d4d8" }
                  : {},
        };

        const activePage = state.project.pages.find((page) => page.id === state.activePageId) ?? state.project.pages[0];

        return {
          saveStatus: "dirty",
          selectedComponentId: component.id,
          project: {
            ...state.project,
            pages: state.project.pages.map((page) =>
              page.id === activePage.id
                ? {
                ...page,
                    sections: page.sections.map((section, index) =>
                      index === 0 ? { ...section, components: [...section.components, component] } : section,
                    ),
                  }
                : page,
            ),
          },
        };
      }),
    updateComponent: (id, patch) =>
      set((state) => {
        const sourceComponent = state.project.pages
          .flatMap((page) => page.sections)
          .flatMap((section) => section.components)
          .find((component) => component.id === id);
        const deltaX = typeof patch.x === "number" && sourceComponent ? patch.x - sourceComponent.x : 0;
        const deltaY = typeof patch.y === "number" && sourceComponent ? patch.y - sourceComponent.y : 0;
        const shouldMoveChildren = sourceComponent?.type === "section" && (deltaX !== 0 || deltaY !== 0);

        return {
          saveStatus: "dirty",
          project: {
            ...state.project,
            pages: state.project.pages.map((page) => ({
              ...page,
              sections: page.sections.map((section) => ({
                ...section,
                components: section.components.map((component) => {
                  if (component.id === id) {
                    return { ...component, ...patch };
                  }

                  if (
                    shouldMoveChildren &&
                    sourceComponent &&
                    component.x >= sourceComponent.x &&
                    component.y >= sourceComponent.y &&
                    component.x + component.width <= sourceComponent.x + sourceComponent.width &&
                    component.y + component.height <= sourceComponent.y + sourceComponent.height
                  ) {
                    return { ...component, x: component.x + deltaX, y: component.y + deltaY };
                  }

                  return component;
                }),
              })),
            })),
          },
        };
      }),
    removeComponent: (id) =>
      set((state) => ({
        saveStatus: "dirty",
        selectedComponentId: state.selectedComponentId === id ? null : state.selectedComponentId,
        project: {
          ...state.project,
          pages: state.project.pages.map((page) => ({
            ...page,
            sections: page.sections.map((section) => ({
              ...section,
              components: section.components.filter((component) => component.id !== id),
            })),
          })),
        },
      })),
    addNavigationPage: () =>
      set((state) => {
        const order = state.project.navigation.length;
        const label = `Page ${order + 1}`;
        const target = `page-${order + 1}`;
        const pageId = crypto.randomUUID();
        const navId = crypto.randomUUID();

        return {
          saveStatus: "dirty",
          activePageId: pageId,
          selectedComponentId: null,
          project: {
            ...state.project,
            navigation: [...state.project.navigation, { id: navId, label, target, order }],
            pages: [
              ...state.project.pages,
              {
                id: pageId,
                slug: target,
                title: label,
                order,
                sections: [
                  {
                    id: crypto.randomUUID(),
                    title: label,
                    order: 0,
                    components: [],
                  },
                ],
              },
            ],
          },
        };
      }),
    updateNavigationItem: (id, patch) =>
      set((state) => {
        const currentItem = state.project.navigation.find((item) => item.id === id);
        const nextTarget = patch.target ?? currentItem?.target;
        const nextLabel = patch.label ?? currentItem?.label;

        return {
          saveStatus: "dirty",
          project: {
            ...state.project,
            navigation: state.project.navigation.map((item) =>
              item.id === id ? { ...item, ...patch, target: nextTarget ?? item.target } : item,
            ),
            pages: state.project.pages.map((page) =>
              currentItem && page.slug === currentItem.target
                ? { ...page, slug: nextTarget ?? page.slug, title: nextLabel ?? page.title }
                : page,
            ),
          },
        };
      }),
    removeNavigationPage: (id) =>
      set((state) => {
        const item = state.project.navigation.find((nav) => nav.id === id);
        const remainingNavigation = state.project.navigation
          .filter((nav) => nav.id !== id)
          .map((nav, order) => ({ ...nav, order }));
        const remainingPages =
          item && state.project.pages.length > 1
            ? state.project.pages.filter((page) => page.slug !== item.target)
            : state.project.pages;
        const activePageExists = remainingPages.some((page) => page.id === state.activePageId);

        return {
          saveStatus: "dirty",
          activePageId: activePageExists ? state.activePageId : remainingPages[0]?.id ?? "",
          selectedComponentId: null,
          project: {
            ...state.project,
            navigation: state.project.navigation.length > 1 ? remainingNavigation : state.project.navigation,
            pages: remainingPages,
          },
        };
      }),
    setHomePage: (id) =>
      set((state) => {
        const item = state.project.navigation.find((nav) => nav.id === id);
        if (!item) {
          return state;
        }

        const page = state.project.pages.find((candidate) => candidate.slug === item.target);
        if (!page) {
          return state;
        }

        return {
          saveStatus: "dirty",
          activePageId: page.id,
          project: {
            ...state.project,
            navigation: [
              item,
              ...state.project.navigation.filter((nav) => nav.id !== id),
            ].map((nav, order) => ({ ...nav, order })),
            pages: [
              page,
              ...state.project.pages.filter((candidate) => candidate.id !== page.id),
            ].map((candidate, order) => ({ ...candidate, order })),
          },
        };
      }),
    setNavigationMode: (navigationMode) =>
      set((state) => {
        if (state.project.navigationMode === navigationMode) {
          return state;
        }

        const pages = state.project.pages.map((page) => {
          const navigationItem = state.project.navigation.find((item) => item.target === page.slug);
          const sectionLabel = navigationItem?.label ?? page.title;
          const firstSection = page.sections[0] ?? {
            id: crypto.randomUUID(),
            title: sectionLabel,
            order: 0,
            components: [],
          };
          const hasSectionFrame = firstSection.components.some(
            (component) => component.type === "section" && component.props.sectionFrame === true,
          );

          if (navigationMode !== "scroll") {
            const normalizedComponents = firstSection.components
              .filter((component) => !(component.type === "section" && component.props.sectionFrame === true))
              .map((component) =>
                hasSectionFrame ? { ...component, y: Math.max(0, component.y - 72) } : component,
              );

            return {
              ...page,
              title: sectionLabel,
              sections: [{ ...firstSection, title: sectionLabel, components: normalizedComponents }, ...page.sections.slice(1)],
            };
          }

          return {
            ...page,
            title: sectionLabel,
            sections: [
              {
                ...firstSection,
                title: sectionLabel,
                components: firstSection.components.filter(
                  (component) => !(component.type === "section" && component.props.sectionFrame === true),
                ),
              },
              ...page.sections.slice(1),
            ],
          };
        });

        return {
          saveStatus: "dirty",
          activePageId: pages[0]?.id ?? state.activePageId,
          selectedComponentId: null,
          project: { ...state.project, navigationMode, pages },
        };
      }),
  }));
}
