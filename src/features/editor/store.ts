"use client";

import { create } from "zustand";
import type { ComponentType, ResumeComponent, ResumeProject, SaveStatus } from "@/types/project";

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function createUniqueTarget(base: string, existingTargets: string[]) {
  const normalizedBase = normalizeSlug(base) || "page";
  let candidate = normalizedBase;
  let index = 2;

  while (existingTargets.includes(candidate)) {
    candidate = `${normalizedBase}-${index}`;
    index += 1;
  }

  return candidate;
}

function getNextPageLabel(existingLabels: string[]) {
  let index = existingLabels.length + 1;
  let label = `Page ${index}`;

  while (existingLabels.includes(label)) {
    index += 1;
    label = `Page ${index}`;
  }

  return label;
}

interface EditorState {
  project: ResumeProject;
  activePageId: string;
  selectedComponentId: string | null;
  openPopupId: string | null;
  saveStatus: SaveStatus;
  mode: "edit" | "preview";
  setActivePage: (id: string) => void;
  selectComponent: (id: string | null) => void;
  setOpenPopup: (id: string | null) => void;
  addComponent: (type: ComponentType) => void;
  addComponentAt: (type: ComponentType, position: { x: number; y: number }) => void;
  updateComponent: (id: string, patch: Partial<ResumeComponent>) => void;
  removeComponent: (id: string) => void;
  updateCanvasBackground: (color: string) => void;
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

function getComponentSize(type: ComponentType) {
  return {
    width:
      type === "divider"
        ? 520
        : type === "section" || type === "container"
          ? 620
          : type === "popup"
            ? 320
            : 360,
    height:
      type === "text"
        ? 96
        : type === "section"
          ? 320
          : type === "container"
            ? 220
            : type === "popup"
              ? 220
              : 140,
  };
}

function buildComponent(type: ComponentType, position: { x: number; y: number }, popupId?: string | null): ResumeComponent {
  const size = getComponentSize(type);
  const component: ResumeComponent = {
    id: crypto.randomUUID(),
    type,
    x: popupId && type !== "popup" ? 40 : position.x,
    y: popupId && type !== "popup" ? 96 : position.y,
    width: size.width,
    height: size.height,
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
                : type === "popup"
                  ? "Popup title"
                  : undefined,
    props:
      type === "link"
        ? { href: "https://example.com" }
        : type === "image"
          ? { objectFit: "cover", objectPositionX: 50, objectPositionY: 50 }
          : type === "section" || type === "container"
            ? { backgroundColor: "#f8fafc", borderColor: "#d4d4d8" }
            : type === "popup"
              ? {
                  description: "클릭하면 자세한 내용을 볼 수 있습니다.",
                  thumbnailUrl: "",
                  backgroundColor: "#ffffff",
                }
              : {},
  };

  return popupId && type !== "popup"
    ? { ...component, props: { ...component.props, popupId } }
    : component;
}

function addComponentToState(
  state: EditorState,
  type: ComponentType,
  position: { x: number; y: number } = { x: 96, y: 120 },
): Partial<EditorState> {
  if (state.project.navigationMode === "scroll" && type === "section") {
    const label = getNextPageLabel(state.project.navigation.map((item) => item.label));
    const target = createUniqueTarget(label, state.project.navigation.map((item) => item.target));
    const pageId = crypto.randomUUID();
    const navId = crypto.randomUUID();
    const order = state.project.navigation.length;

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
            canvasBackground: state.project.pages[0]?.canvasBackground,
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
  }

  const component = buildComponent(type, position, state.openPopupId);
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
}

export function createEditorStore(initialProject: ResumeProject) {
  return create<EditorState>((set) => ({
    project: initialProject,
    activePageId: initialProject.pages[0]?.id ?? "",
    selectedComponentId: null,
    openPopupId: null,
    saveStatus: "idle",
    mode: "edit",
    setActivePage: (id) => set({ activePageId: id, selectedComponentId: null }),
    selectComponent: (id) => set({ selectedComponentId: id }),
    setOpenPopup: (id) => set({ openPopupId: id }),
    setMode: (mode) => set({ mode }),
    markSaving: () => set({ saveStatus: "saving" }),
    markSaved: () => set({ saveStatus: "saved" }),
    markSaveError: () => set({ saveStatus: "error" }),
    addComponent: (type) =>
      set((state) => addComponentToState(state, type, undefined)),
    addComponentAt: (type, position) =>
      set((state) => addComponentToState(state, type, position)),
    updateCanvasBackground: (color) =>
      set((state) => ({
        saveStatus: "dirty",
        project: {
          ...state.project,
          pages: state.project.pages.map((page) => ({
            ...page,
            canvasBackground: color,
          })),
        },
      })),
    updateComponent: (id, patch) =>
      set((state) => {
        const sourceComponent = state.project.pages
          .flatMap((page) => page.sections)
          .flatMap((section) => section.components)
          .find((component) => component.id === id);
        const deltaX = typeof patch.x === "number" && sourceComponent ? patch.x - sourceComponent.x : 0;
        const deltaY = typeof patch.y === "number" && sourceComponent ? patch.y - sourceComponent.y : 0;
        const shouldMoveChildren =
          (sourceComponent?.type === "section" || sourceComponent?.type === "container") &&
          (deltaX !== 0 || deltaY !== 0);

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
                    component.id !== sourceComponent.id &&
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
        const label = getNextPageLabel(state.project.navigation.map((item) => item.label));
        const target = createUniqueTarget(label, state.project.navigation.map((item) => item.target));
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
        const requestedTarget = patch.target ?? currentItem?.target ?? "";
        const nextTarget = patch.target
          ? createUniqueTarget(requestedTarget, state.project.navigation.filter((item) => item.id !== id).map((item) => item.target))
          : requestedTarget;
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
