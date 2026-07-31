"use client";

import {
  DndContext,
  PointerSensor,
  type DragEndEvent,
  type DragMoveEvent,
  type PointerSensorOptions,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  Download,
  Eye,
  ChevronDown,
  LayoutDashboard,
  Link2,
  Lock,
  Magnet,
  PackageOpen,
  Pencil,
  Save,
  Share2,
  Trash2,
  Unlock,
  Upload,
  X,
} from "lucide-react";
import NextLink from "next/link";
import type {
  CSSProperties,
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "zustand";
import { iconOptions, insertableComponents } from "@/config/editor";
import { NumberField } from "@/components/editor/number-field";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { RouteSwitcher } from "@/components/editor/route-switcher";
import { ScrollToc } from "@/components/editor/scroll-toc";
import { SiteHeader } from "@/components/editor/site-header";
import { TableComponent } from "@/components/editor/table-component";
import {
  createGradientPoint,
  getCanvasBackgroundCss,
  getCanvasBackgroundStyle,
} from "@/features/editor/canvas-background";
import {
  createPdfExportNode,
  waitForPdfNode,
} from "@/features/editor/pdf-export";
import {
  getEffectiveComponentY,
  getPageTitleSpacerOffset,
} from "@/features/editor/spacer-layout";
import { createEditorStore } from "@/features/editor/store";
import {
  getSelectedTableRange,
  getTableCols,
  getTableRows,
  hasTrimmedTableContent,
  parseTableData,
  resizeTableData,
  serializeTableData,
  updateTableCellRangeTextAlign,
  updateTableCellRangeStyle,
  type TableCell,
} from "@/features/editor/table";
import {
  FONT_OPTIONS,
  FONT_WEIGHT_OPTIONS,
  PDF_PAGE_HEIGHT,
  PDF_PAGE_WIDTH,
  type GuideLine,
  type SpacingGuide,
  clamp,
  getAlignItemsFromVerticalAlign,
  getComponentLayer,
  getDividerStyle,
  getImageMediaStyle,
  getJustifyContentFromTextAlign,
  getTextStyle,
  hasTypography,
  normalizeAnchor,
  normalizeFontWeight,
  RICH_TEXT_COMPONENT_PADDING,
  withAlpha,
} from "@/features/editor/view-helpers";
import { cn } from "@/lib/utils/cn";
import { getPublicProjectUrl, getTemplateShareUrl } from "@/lib/utils/site-url";
import {
  resetRichTextLineSpacing,
  richTextToPlainText,
  sanitizeRichTextHtml,
} from "@/lib/utils/rich-text";
import type {
  CanvasBackgroundStyle,
  ComponentPreset,
  ComponentType,
  ResumeComponent,
  ResumeProject,
} from "@/types/project";

interface EditorShellProps {
  project: ResumeProject;
}

const SCROLL_CANVAS_HEADER_HEIGHT = 64;
const MIN_INSERT_SIZE = { width: 48, height: 36 };

type ResizeDirection =
  | "top"
  | "right"
  | "bottom"
  | "left"
  | "topLeft"
  | "topRight"
  | "bottomLeft"
  | "bottomRight";

function isEditorInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest(
      "[data-editor-control], [contenteditable='true'], .resume-rich-text-content, button, a, input, textarea, select",
    ),
  );
}

class EditorPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: "onPointerDown" as const,
      handler: (event: ReactPointerEvent, options: PointerSensorOptions) => {
        if (isEditorInteractiveTarget(event.target)) {
          return false;
        }

        return PointerSensor.activators[0]?.handler(event, options) ?? true;
      },
    },
  ];
}

export function EditorShell({ project }: EditorShellProps) {
  const store = useMemo(() => createEditorStore(project), [project]);
  const editorProject = useStore(store, (state) => state.project);
  const activePageId = useStore(store, (state) => state.activePageId);
  const setActivePage = useStore(store, (state) => state.setActivePage);
  const addComponentAt = useStore(store, (state) => state.addComponentAt);
  const addComponents = useStore(store, (state) => state.addComponents);
  const updateComponent = useStore(store, (state) => state.updateComponent);
  const removeComponents = useStore(store, (state) => state.removeComponents);
  const moveComponents = useStore(store, (state) => state.moveComponents);
  const replaceProject = useStore(store, (state) => state.replaceProject);
  const updateCanvasBackground = useStore(
    store,
    (state) => state.updateCanvasBackground,
  );
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
  const reorderNavigationPage = useStore(
    store,
    (state) => state.reorderNavigationPage,
  );
  const setHomePage = useStore(store, (state) => state.setHomePage);
  const setNavigationMode = useStore(store, (state) => state.setNavigationMode);
  const selectedComponentId = useStore(
    store,
    (state) => state.selectedComponentId,
  );
  const openPopupId = useStore(store, (state) => state.openPopupId);
  const setOpenPopup = useStore(store, (state) => state.setOpenPopup);
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
  const [templateShareStatus, setTemplateShareStatus] = useState<
    "idle" | "copied" | "error"
  >("idle");
  const [activeTocTarget, setActiveTocTarget] = useState(
    editorProject.navigation[0]?.target ?? "",
  );
  const [smartGuidesEnabled, setSmartGuidesEnabled] = useState(true);
  const [guideLines, setGuideLines] = useState<GuideLine[]>([]);
  const [spacingGuides, setSpacingGuides] = useState<SpacingGuide[]>([]);
  const [guidePopupId, setGuidePopupId] = useState<string | null>(null);
  const [canvasScale, setCanvasScale] = useState(1);
  const [selectedComponentIds, setSelectedComponentIds] = useState<string[]>(
    [],
  );
  const [cropEditingId, setCropEditingId] = useState<string | null>(null);
  const [iconsOpen, setIconsOpen] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [presets, setPresets] = useState<ComponentPreset[]>([]);
  const [presetsLoaded, setPresetsLoaded] = useState(false);
  const [presetsLoading, setPresetsLoading] = useState(false);
  const [presetError, setPresetError] = useState<string | null>(null);
  const [presetSaveTarget, setPresetSaveTarget] =
    useState<ResumeComponent | null>(null);
  const [presetEditTarget, setPresetEditTarget] =
    useState<ComponentPreset | null>(null);
  const [lasso, setLasso] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const [pendingInsertType, setPendingInsertType] =
    useState<ComponentType | null>(null);
  const [insertDraft, setInsertDraft] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const sensors = useSensors(
    useSensor(EditorPointerSensor, { activationConstraint: { distance: 6 } }),
  );
  const scrollAreaRef = useRef<HTMLElement | null>(null);
  const presetsMenuRef = useRef<HTMLDivElement | null>(null);
  const projectRef = useRef(editorProject);
  const saveStatusRef = useRef(saveStatus);
  const saveProjectRef = useRef<() => void>(() => undefined);
  const copyBufferRef = useRef<ResumeComponent[]>([]);
  const historyRef = useRef<ResumeProject[]>([]);
  const historyActionRef = useRef<Array<"general" | "textAlign">>([]);
  const redoHistoryRef = useRef<ResumeProject[]>([]);
  const redoHistoryActionRef = useRef<Array<"general" | "textAlign">>([]);
  const coalescedHistoryRef = useRef<Record<string, number>>({});

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
          !component.props.popupId &&
          !(
            component.type === "section" &&
            component.props.sectionFrame === true
          ),
      );
      const height = Math.max(
        240,
        ...pageComponents.map(
          (component) =>
            getEffectiveComponentY(pageComponents, component) +
            component.height +
            72 +
            (isScrollMode ? SCROLL_CANVAS_HEADER_HEIGHT : 0),
        ),
      );
      const offset = layouts.reduce(
        (total, layout) => total + layout.height + 16,
        0,
      );
      const layout = { page, components: pageComponents, offset, height };
      return [...layouts, layout];
    }, []);
  }, [editorProject.pages, isScrollMode]);
  const renderItems = (
    isScrollMode
      ? pageLayouts.flatMap((layout) =>
          layout.components.map((component) => ({
            component,
            displayTop:
              getEffectiveComponentY(layout.components, component) +
              layout.offset +
              44 +
              SCROLL_CANVAS_HEADER_HEIGHT,
          })),
        )
      : activePageComponents.map((component) => ({
          component,
          displayTop: getEffectiveComponentY(activePageComponents, component),
        }))
  )
    .filter(({ component }) => !component.props.popupId)
    .filter(({ component }) => mode === "edit" || component.type !== "spacer")
    .sort(
      (a, b) => getComponentLayer(a.component) - getComponentLayer(b.component),
    );
  const components = isScrollMode ? allComponents : activePageComponents;
  const popupComponent =
    components.find(
      (component) => component.id === openPopupId && component.type === "popup",
    ) ?? null;
  const popupChildren = openPopupId
    ? components.filter((component) => component.props.popupId === openPopupId)
    : [];
  const selectedComponent =
    components.find((component) => component.id === selectedComponentId) ??
    null;
  const lockedComponentIds = useMemo(
    () =>
      new Set(
        components
          .filter((component) => component.props.locked === true)
          .map((component) => component.id),
      ),
    [components],
  );
  const activeCropEditingId =
    selectedComponent?.type === "image" &&
    selectedComponent.id === cropEditingId
      ? cropEditingId
      : null;

  const canvasHeight = isScrollMode
    ? Math.max(
        1120,
        pageLayouts.at(-1)
          ? pageLayouts.at(-1)!.offset + pageLayouts.at(-1)!.height
          : 1120,
      )
    : Math.max(
        1120,
        ...activePageComponents
          .filter((component) => !component.props.popupId)
          .map(
            (component) =>
              getEffectiveComponentY(activePageComponents, component) +
              component.height +
              160,
          ),
      );
  const canvasBackground =
    activePage?.canvasBackground ??
    editorProject.pages[0]?.canvasBackground ??
    "#ffffff";
  const canvasBackgroundStyle = getCanvasBackgroundStyle(activePage);

  useEffect(() => {
    projectRef.current = editorProject;
  }, [editorProject]);

  useEffect(() => {
    saveStatusRef.current = saveStatus;
  }, [saveStatus]);

  function recordHistory(action: "general" | "textAlign" = "general") {
    historyRef.current = [...historyRef.current.slice(-29), projectRef.current];
    historyActionRef.current = [...historyActionRef.current.slice(-29), action];
    redoHistoryRef.current = [];
    redoHistoryActionRef.current = [];
  }

  function recordCoalescedHistory(key: string, delay = 1000) {
    const now = Date.now();
    const lastRecordedAt = coalescedHistoryRef.current[key] ?? 0;

    if (now - lastRecordedAt < delay) {
      return;
    }

    coalescedHistoryRef.current[key] = now;
    recordHistory();
  }

  function updateComponentWithHistory(
    id: string,
    patch: Partial<ResumeComponent>,
    action: "general" | "textAlign" = "general",
  ) {
    recordHistory(action);
    updateComponent(id, patch);
  }

  function updateComponentWithCoalescedHistory(
    id: string,
    patch: Partial<ResumeComponent>,
    key: string,
  ) {
    recordCoalescedHistory(key);
    updateComponent(id, patch);
  }

  function undoLastChange() {
    const previous = historyRef.current.at(-1);
    if (!previous) {
      return;
    }

    redoHistoryRef.current = [
      ...redoHistoryRef.current.slice(-29),
      projectRef.current,
    ];
    redoHistoryActionRef.current = [
      ...redoHistoryActionRef.current.slice(-29),
      historyActionRef.current.at(-1) ?? "general",
    ];
    historyRef.current = historyRef.current.slice(0, -1);
    historyActionRef.current = historyActionRef.current.slice(0, -1);
    coalescedHistoryRef.current = {};
    replaceProject(previous);
    setSelectedComponentIds([]);
  }

  function redoLastChange() {
    const next = redoHistoryRef.current.at(-1);
    if (!next) {
      return;
    }

    historyRef.current = [...historyRef.current.slice(-29), projectRef.current];
    historyActionRef.current = [
      ...historyActionRef.current.slice(-29),
      redoHistoryActionRef.current.at(-1) ?? "general",
    ];
    redoHistoryRef.current = redoHistoryRef.current.slice(0, -1);
    redoHistoryActionRef.current = redoHistoryActionRef.current.slice(0, -1);
    coalescedHistoryRef.current = {};
    replaceProject(next);
    setSelectedComponentIds([]);
  }

  function getPopupRelatedIds(ids: string[]) {
    const relatedIds = new Set(ids);

    ids.forEach((id) => {
      const popup = components.find(
        (component) => component.id === id && component.type === "popup",
      );
      if (!popup) {
        return;
      }

      components
        .filter((component) => component.props.popupId === popup.id)
        .forEach((component) => relatedIds.add(component.id));
    });

    return Array.from(relatedIds);
  }

  function cloneComponentsForPaste(sourceComponents: ResumeComponent[]) {
    const idMap = new Map<string, string>();
    sourceComponents.forEach((component) =>
      idMap.set(component.id, crypto.randomUUID()),
    );

    return sourceComponents.map((component) => {
      const nextId = idMap.get(component.id) ?? crypto.randomUUID();
      const popupId =
        typeof component.props.popupId === "string"
          ? component.props.popupId
          : null;
      const isClonedPopupChild = Boolean(popupId && idMap.has(popupId));

      return {
        ...component,
        id: nextId,
        x: isClonedPopupChild ? component.x : component.x + 28,
        y: isClonedPopupChild ? component.y : component.y + 28,
        props: {
          ...component.props,
          popupId:
            popupId && idMap.has(popupId)
              ? idMap.get(popupId)!
              : component.props.popupId,
        },
      };
    });
  }

  function copySelectedComponents() {
    const ids = getPopupRelatedIds(selectedComponentIds);
    copyBufferRef.current = components.filter((component) =>
      ids.includes(component.id),
    );
  }

  function pasteCopiedComponents() {
    if (copyBufferRef.current.length === 0) {
      return;
    }

    recordHistory();
    const clonedComponents = cloneComponentsForPaste(copyBufferRef.current);
    addComponents(clonedComponents);
    const pastedRootIds = clonedComponents
      .filter((component) => !component.props.popupId)
      .map((component) => component.id);
    const idsToSelect =
      pastedRootIds.length > 0
        ? pastedRootIds
        : clonedComponents.map((component) => component.id);
    setSelectedComponentIds(idsToSelect);
    selectComponent(idsToSelect[0] ?? null);
  }

  function deleteSelectedComponents() {
    if (selectedComponentIds.length === 0) {
      return;
    }

    const removableSelectedIds = selectedComponentIds.filter(
      (id) => !lockedComponentIds.has(id),
    );

    if (removableSelectedIds.length === 0) {
      return;
    }

    recordHistory();
    const idsToRemove = getPopupRelatedIds(removableSelectedIds);
    removeComponents(idsToRemove);
    setSelectedComponentIds((ids) =>
      ids.filter((id) => !removableSelectedIds.includes(id)),
    );
    if (
      selectedComponentId &&
      removableSelectedIds.includes(selectedComponentId)
    ) {
      selectComponent(null);
    }
  }

  function isEditableTarget(target: EventTarget | null) {
    const element = target as HTMLElement | null;
    return Boolean(
      element?.closest("input, textarea, select, [contenteditable='true']"),
    );
  }

  function alignSelectedTextComponents(textAlign: "left" | "center" | "right") {
    const ids =
      selectedComponentIds.length > 0
        ? selectedComponentIds
        : selectedComponentId
          ? [selectedComponentId]
          : [];
    const editableTextIds = ids.filter((id) => {
      const component = components.find((item) => item.id === id);
      return (
        component?.type === "text" ||
        component?.type === "textbox" ||
        component?.type === "link"
      );
    });

    if (editableTextIds.length === 0) {
      return false;
    }

    recordHistory("textAlign");
    editableTextIds.forEach((id) => {
      const component = components.find((item) => item.id === id);
      if (!component) {
        return;
      }

      updateComponent(id, {
        props: {
          ...component.props,
          textAlign,
        },
      });
    });
    return true;
  }

  function toggleSelectedTableRangeBold() {
    const tableComponent =
      selectedComponent?.type === "table" ? selectedComponent : null;

    if (!tableComponent) {
      return false;
    }

    const data = parseTableData(tableComponent);
    const range = getSelectedTableRange(tableComponent);
    const selectedCells = data
      .slice(range.startRow, range.endRow + 1)
      .flatMap((row) => row.slice(range.startCol, range.endCol + 1));

    if (selectedCells.length === 0) {
      return false;
    }

    const fallbackWeight = normalizeFontWeight(tableComponent.props.fontWeight);
    const shouldUnbold = selectedCells.every(
      (cell) => Number(cell.fontWeight ?? fallbackWeight) >= 700,
    );

    recordHistory();
    updateComponent(tableComponent.id, {
      props: {
        ...tableComponent.props,
        tableData: serializeTableData(
          updateTableCellRangeStyle(data, range, {
            fontWeight: shouldUnbold ? 400 : 700,
          }),
        ),
      },
    });
    return true;
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isModifierPressed = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (isModifierPressed && key === "s") {
        event.preventDefault();
        saveProjectRef.current();
        return;
      }

      if (isModifierPressed && event.shiftKey && key === "z") {
        event.preventDefault();
        redoLastChange();
        return;
      }

      if (
        isModifierPressed &&
        key === "z" &&
        historyActionRef.current.at(-1) === "textAlign"
      ) {
        event.preventDefault();
        undoLastChange();
        return;
      }

      if (
        isModifierPressed &&
        event.shiftKey &&
        ["l", "r", "e"].includes(key)
      ) {
        const textAlign =
          key === "l" ? "left" : key === "r" ? "right" : "center";

        if (alignSelectedTextComponents(textAlign)) {
          event.preventDefault();
          return;
        }
      }

      if (isModifierPressed && key === "b") {
        if (toggleSelectedTableRangeBold()) {
          event.preventDefault();
          return;
        }
      }

      if (mode !== "edit" || isEditableTarget(event.target)) {
        return;
      }

      if (isModifierPressed && key === "c") {
        event.preventDefault();
        copySelectedComponents();
        return;
      }

      if (isModifierPressed && key === "v") {
        event.preventDefault();
        pasteCopiedComponents();
        return;
      }

      if (isModifierPressed && key === "z") {
        event.preventDefault();
        undoLastChange();
        return;
      }

      const arrowDelta =
        event.key === "ArrowLeft"
          ? { x: -1, y: 0 }
          : event.key === "ArrowRight"
            ? { x: 1, y: 0 }
            : event.key === "ArrowUp"
              ? { x: 0, y: -1 }
              : event.key === "ArrowDown"
                ? { x: 0, y: 1 }
                : null;

      if (arrowDelta) {
        const ids =
          selectedComponentIds.length > 0
            ? selectedComponentIds
            : selectedComponentId
              ? [selectedComponentId]
              : [];

        if (ids.length > 0) {
          event.preventDefault();
          recordHistory();
          const distance = event.shiftKey ? 10 : 1;
          moveComponents(ids, {
            x: arrowDelta.x * distance,
            y: arrowDelta.y * distance,
          });
        }
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelectedComponents();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  useEffect(() => {
    if (!presetsOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (presetsMenuRef.current?.contains(event.target as Node)) {
        return;
      }

      setPresetsOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPresetsOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [presetsOpen]);

  useEffect(() => {
    if (presetsLoaded || presetsLoading) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void loadPresets();
    }, 600);

    return () => window.clearTimeout(timeout);
  }, [presetsLoaded, presetsLoading]);

  useEffect(() => {
    const observedElement = scrollAreaRef.current;
    if (!observedElement) {
      return;
    }
    const element: HTMLElement = observedElement;

    function updateScale() {
      const availableWidth = element.clientWidth - 48;
      setCanvasScale(Math.min(1, Math.max(0.42, availableWidth / 840)));
    }

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(element);
    window.addEventListener("resize", updateScale);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, []);

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
    saveProjectRef.current = () => {
      void saveProject();
    };
  }, [saveProject]);

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

  function getComparableComponents(component: ResumeComponent) {
    if (typeof component.props.popupId === "string") {
      return components.filter(
        (item) =>
          item.id !== component.id &&
          item.props.popupId === component.props.popupId,
      );
    }

    return components.filter(
      (item) => item.id !== component.id && !item.props.popupId,
    );
  }

  function getInteractionScale(component: ResumeComponent) {
    return typeof component.props.popupId === "string" ? 1 : canvasScale;
  }

  function getCanvasPoint(
    event: PointerEvent | ReactPointerEvent<HTMLElement>,
  ) {
    const canvas = document.getElementById("resume-canvas");
    const rect = canvas?.getBoundingClientRect();

    if (!rect) {
      return { x: 0, y: 0 };
    }

    return {
      x: (event.clientX - rect.left) / canvasScale,
      y: (event.clientY - rect.top) / canvasScale,
    };
  }

  function getDragRect(selection: {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  }) {
    return {
      left: Math.min(selection.startX, selection.currentX),
      top: Math.min(selection.startY, selection.currentY),
      right: Math.max(selection.startX, selection.currentX),
      bottom: Math.max(selection.startY, selection.currentY),
    };
  }

  function getLassoRect(selection: NonNullable<typeof lasso>) {
    return getDragRect(selection);
  }

  function rectsIntersect(
    a: { left: number; top: number; right: number; bottom: number },
    b: { left: number; top: number; right: number; bottom: number },
  ) {
    return (
      a.left <= b.right &&
      a.right >= b.left &&
      a.top <= b.bottom &&
      a.bottom >= b.top
    );
  }

  function getInsertTarget(rect: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  }) {
    if (!isScrollMode) {
      return {
        pageId: activePage?.id,
        x: rect.left,
        y: rect.top,
      };
    }

    const centerY = (rect.top + rect.bottom) / 2;
    const layout =
      pageLayouts.find(
        (item, index) =>
          centerY >= item.offset &&
          centerY <
            item.offset +
              item.height +
              (index === pageLayouts.length - 1 ? 0 : 16),
      ) ??
      pageLayouts.find((item) => centerY < item.offset) ??
      pageLayouts.at(-1);

    if (!layout) {
      return {
        pageId: activePage?.id,
        x: rect.left,
        y: rect.top,
      };
    }

    return {
      pageId: layout.page.id,
      x: rect.left,
      y: Math.max(
        0,
        rect.top - layout.offset - 44 - SCROLL_CANVAS_HEADER_HEIGHT,
      ),
    };
  }

  function handleComponentSelect(
    id: string,
    event?: ReactMouseEvent<HTMLDivElement>,
  ) {
    if (cropEditingId && cropEditingId !== id) {
      setCropEditingId(null);
    }

    if (event?.shiftKey || event?.metaKey || event?.ctrlKey) {
      setSelectedComponentIds((ids) => {
        const nextIds = ids.includes(id)
          ? ids.filter((selectedId) => selectedId !== id)
          : [...ids, id];
        selectComponent(nextIds.at(-1) ?? null);
        return nextIds;
      });
      return;
    }

    if (selectedComponentIds.length > 1 && selectedComponentIds.includes(id)) {
      selectComponent(id);
      return;
    }

    setSelectedComponentIds([id]);
    selectComponent(id);
  }

  function handleCanvasPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (
      mode === "edit" &&
      pendingInsertType &&
      event.button === 0 &&
      !(event.target as HTMLElement).closest(
        "[data-component-id], [data-editor-control], button, a, input, textarea, select",
      )
    ) {
      event.preventDefault();
      const insertType = pendingInsertType;
      const start = getCanvasPoint(event);
      setSelectedComponentIds([]);
      selectComponent(null);
      setInsertDraft({
        startX: start.x,
        startY: start.y,
        currentX: start.x,
        currentY: start.y,
      });

      function handlePointerMove(pointerEvent: PointerEvent) {
        const point = getCanvasPoint(pointerEvent);
        setInsertDraft((current) =>
          current
            ? { ...current, currentX: point.x, currentY: point.y }
            : current,
        );
      }

      function handlePointerUp(pointerEvent: PointerEvent) {
        const point = getCanvasPoint(pointerEvent);
        const rect = getDragRect({
          startX: start.x,
          startY: start.y,
          currentX: point.x,
          currentY: point.y,
        });
        const width = Math.max(MIN_INSERT_SIZE.width, rect.right - rect.left);
        const height = Math.max(MIN_INSERT_SIZE.height, rect.bottom - rect.top);
        const target = getInsertTarget(rect);

        recordHistory();
        addComponentAt(insertType, {
          pageId: target.pageId,
          x: Math.round(target.x),
          y: Math.round(target.y),
          width: Math.round(width),
          height: Math.round(height),
        });
        setPendingInsertType(null);
        setInsertDraft(null);
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      }

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      return;
    }

    if (
      mode !== "edit" ||
      event.button !== 0 ||
      (event.target as HTMLElement).closest(
        "[data-component-id], [data-editor-control], button, a, input, textarea, select",
      )
    ) {
      return;
    }

    const start = getCanvasPoint(event);
    setSelectedComponentIds([]);
    selectComponent(null);
    setLasso({
      startX: start.x,
      startY: start.y,
      currentX: start.x,
      currentY: start.y,
    });

    function handlePointerMove(pointerEvent: PointerEvent) {
      const point = getCanvasPoint(pointerEvent);
      setLasso((current) =>
        current
          ? { ...current, currentX: point.x, currentY: point.y }
          : current,
      );
    }

    function handlePointerUp(pointerEvent: PointerEvent) {
      const point = getCanvasPoint(pointerEvent);
      const selection = {
        startX: start.x,
        startY: start.y,
        currentX: point.x,
        currentY: point.y,
      };
      const rect = getLassoRect(selection);
      const nextIds = renderItems
        .filter(({ component, displayTop }) =>
          rectsIntersect(rect, {
            left: component.x,
            top: displayTop,
            right: component.x + component.width,
            bottom: displayTop + component.height,
          }),
        )
        .map(({ component }) => component.id);

      setSelectedComponentIds(nextIds);
      selectComponent(nextIds[0] ?? null);
      setLasso(null);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  function getSmartSnap(
    component: ResumeComponent,
    nextX: number,
    nextY: number,
    nextWidth = component.width,
    nextHeight = component.height,
  ) {
    if (!smartGuidesEnabled) {
      return {
        x: Math.round(nextX),
        y: Math.round(nextY),
        width: Math.round(nextWidth),
        height: Math.round(nextHeight),
        guides: [] as GuideLine[],
      };
    }

    const tolerance = 7;
    const guides: GuideLine[] = [];
    let snappedX = nextX;
    let snappedY = nextY;
    let snappedWidth = nextWidth;
    let snappedHeight = nextHeight;
    const canvasTargetsX = [0, 420, 840];
    const canvasTargetsY = [64, canvasHeight / 2, canvasHeight];
    const otherComponents = getComparableComponents(component);
    const xTargets = [
      ...canvasTargetsX,
      ...otherComponents.flatMap((item) => [
        item.x,
        item.x + item.width / 2,
        item.x + item.width,
      ]),
    ];
    const yTargets = [
      ...canvasTargetsY,
      ...otherComponents.flatMap((item) => [
        item.y,
        item.y + item.height / 2,
        item.y + item.height,
      ]),
    ];
    const xPoints = [
      { kind: "left", value: nextX },
      { kind: "center", value: nextX + nextWidth / 2 },
      { kind: "right", value: nextX + nextWidth },
    ];
    const yPoints = [
      { kind: "top", value: nextY },
      { kind: "middle", value: nextY + nextHeight / 2 },
      { kind: "bottom", value: nextY + nextHeight },
    ];

    for (const target of xTargets) {
      const match = xPoints.find(
        (point) => Math.abs(point.value - target) <= tolerance,
      );
      if (!match) continue;
      guides.push({ axis: "x", position: target });
      if (match.kind === "left") snappedX = target;
      if (match.kind === "center") snappedX = target - nextWidth / 2;
      if (match.kind === "right") snappedWidth = Math.max(48, target - nextX);
      break;
    }

    for (const target of yTargets) {
      const match = yPoints.find(
        (point) => Math.abs(point.value - target) <= tolerance,
      );
      if (!match) continue;
      guides.push({ axis: "y", position: target });
      if (match.kind === "top") snappedY = target;
      if (match.kind === "middle") snappedY = target - nextHeight / 2;
      if (match.kind === "bottom") snappedHeight = Math.max(36, target - nextY);
      break;
    }

    const horizontalPeers = otherComponents
      .filter(
        (item) => nextY + nextHeight > item.y && nextY < item.y + item.height,
      )
      .sort((a, b) => a.x - b.x);
    for (
      let leftIndex = 0;
      leftIndex < horizontalPeers.length;
      leftIndex += 1
    ) {
      for (
        let rightIndex = leftIndex + 1;
        rightIndex < horizontalPeers.length;
        rightIndex += 1
      ) {
        const left = horizontalPeers[leftIndex];
        const right = horizontalPeers[rightIndex];
        const leftRight = left.x + left.width;
        const available = right.x - leftRight - nextWidth;
        if (available < 0) continue;

        const candidateX = leftRight + available / 2;
        if (Math.abs(candidateX - nextX) > tolerance) continue;

        snappedX = Math.round(candidateX);
        guides.push({ axis: "x", position: leftRight });
        guides.push({ axis: "x", position: right.x });
        leftIndex = horizontalPeers.length;
        break;
      }
    }

    for (let index = 0; index < horizontalPeers.length - 1; index += 1) {
      const first = horizontalPeers[index];
      const second = horizontalPeers[index + 1];
      const gap = second.x - (first.x + first.width);
      if (gap < 0) continue;

      const afterSecondX = second.x + second.width + gap;
      const beforeFirstX = first.x - nextWidth - gap;
      if (Math.abs(afterSecondX - nextX) <= tolerance) {
        snappedX = Math.round(afterSecondX);
        guides.push({ axis: "x", position: second.x + second.width });
        guides.push({ axis: "x", position: afterSecondX });
        break;
      }

      if (Math.abs(beforeFirstX - nextX) <= tolerance) {
        snappedX = Math.round(beforeFirstX);
        guides.push({ axis: "x", position: beforeFirstX + nextWidth });
        guides.push({ axis: "x", position: first.x });
        break;
      }
    }

    const verticalPeers = otherComponents
      .filter(
        (item) => nextX + nextWidth > item.x && nextX < item.x + item.width,
      )
      .sort((a, b) => a.y - b.y);
    for (let topIndex = 0; topIndex < verticalPeers.length; topIndex += 1) {
      for (
        let bottomIndex = topIndex + 1;
        bottomIndex < verticalPeers.length;
        bottomIndex += 1
      ) {
        const top = verticalPeers[topIndex];
        const bottom = verticalPeers[bottomIndex];
        const topBottom = top.y + top.height;
        const available = bottom.y - topBottom - nextHeight;
        if (available < 0) continue;

        const candidateY = topBottom + available / 2;
        if (Math.abs(candidateY - nextY) > tolerance) continue;

        snappedY = Math.round(candidateY);
        guides.push({ axis: "y", position: topBottom });
        guides.push({ axis: "y", position: bottom.y });
        topIndex = verticalPeers.length;
        break;
      }
    }

    for (let index = 0; index < verticalPeers.length - 1; index += 1) {
      const first = verticalPeers[index];
      const second = verticalPeers[index + 1];
      const gap = second.y - (first.y + first.height);
      if (gap < 0) continue;

      const afterSecondY = second.y + second.height + gap;
      const beforeFirstY = first.y - nextHeight - gap;
      if (Math.abs(afterSecondY - nextY) <= tolerance) {
        snappedY = Math.round(afterSecondY);
        guides.push({ axis: "y", position: second.y + second.height });
        guides.push({ axis: "y", position: afterSecondY });
        break;
      }

      if (Math.abs(beforeFirstY - nextY) <= tolerance) {
        snappedY = Math.round(beforeFirstY);
        guides.push({ axis: "y", position: beforeFirstY + nextHeight });
        guides.push({ axis: "y", position: first.y });
        break;
      }
    }

    return {
      x: Math.round(snappedX),
      y: Math.round(snappedY),
      width: Math.round(snappedWidth),
      height: Math.round(snappedHeight),
      guides,
    };
  }

  function getSpacingGuides(
    component: ResumeComponent,
    nextX: number,
    nextY: number,
    nextWidth = component.width,
    nextHeight = component.height,
  ) {
    if (!smartGuidesEnabled) {
      return [];
    }

    const moving = {
      left: nextX,
      right: nextX + nextWidth,
      top: nextY,
      bottom: nextY + nextHeight,
      midX: nextX + nextWidth / 2,
      midY: nextY + nextHeight / 2,
    };
    const otherComponents = getComparableComponents(component);
    const horizontalRaw: SpacingGuide[] = [];

    for (const item of otherComponents) {
      if (!(moving.bottom > item.y && moving.top < item.y + item.height)) {
        continue;
      }

      const itemRightToMovingLeft = moving.left - (item.x + item.width);
      const movingRightToItemLeft = item.x - moving.right;
      const cross = Math.round(
        (Math.max(moving.top, item.y) +
          Math.min(moving.bottom, item.y + item.height)) /
          2,
      );

      if (itemRightToMovingLeft >= 0) {
        horizontalRaw.push({
          axis: "x",
          start: item.x + item.width,
          end: moving.left,
          cross,
          distance: Math.round(itemRightToMovingLeft),
        });
      }

      if (movingRightToItemLeft >= 0) {
        horizontalRaw.push({
          axis: "x",
          start: moving.right,
          end: item.x,
          cross,
          distance: Math.round(movingRightToItemLeft),
        });
      }
    }

    const horizontal: SpacingGuide[] = [...horizontalRaw].sort(
      (a, b) => a.distance - b.distance,
    );
    const verticalRaw: SpacingGuide[] = [];

    for (const item of otherComponents) {
      if (!(moving.right > item.x && moving.left < item.x + item.width)) {
        continue;
      }

      const itemBottomToMovingTop = moving.top - (item.y + item.height);
      const movingBottomToItemTop = item.y - moving.bottom;
      const cross = Math.round(
        (Math.max(moving.left, item.x) +
          Math.min(moving.right, item.x + item.width)) /
          2,
      );

      if (itemBottomToMovingTop >= 0) {
        verticalRaw.push({
          axis: "y",
          start: item.y + item.height,
          end: moving.top,
          cross,
          distance: Math.round(itemBottomToMovingTop),
        });
      }

      if (movingBottomToItemTop >= 0) {
        verticalRaw.push({
          axis: "y",
          start: moving.bottom,
          end: item.y,
          cross,
          distance: Math.round(movingBottomToItemTop),
        });
      }
    }

    const vertical: SpacingGuide[] = [...verticalRaw].sort(
      (a, b) => a.distance - b.distance,
    );

    return [horizontal[0], vertical[0]].filter((guide): guide is SpacingGuide =>
      Boolean(guide),
    );
  }

  function handleDragMove(event: DragMoveEvent) {
    const component = components.find((item) => item.id === event.active.id);
    if (!component || !smartGuidesEnabled) {
      return;
    }

    const snap = getSmartSnap(
      component,
      component.x + event.delta.x / getInteractionScale(component),
      component.y + event.delta.y / getInteractionScale(component),
    );
    setGuideLines(snap.guides);
    setSpacingGuides(getSpacingGuides(component, snap.x, snap.y));
    setGuidePopupId(
      typeof component.props.popupId === "string"
        ? component.props.popupId
        : null,
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, delta } = event;
    const component = components.find((item) => item.id === active.id);

    if (!component) {
      return;
    }

    const snap = getSmartSnap(
      component,
      component.x + delta.x / getInteractionScale(component),
      component.y + delta.y / getInteractionScale(component),
    );
    setGuideLines(snap.guides);
    setSpacingGuides(getSpacingGuides(component, snap.x, snap.y));
    setGuidePopupId(
      typeof component.props.popupId === "string"
        ? component.props.popupId
        : null,
    );
    window.setTimeout(() => {
      setGuideLines([]);
      setSpacingGuides([]);
      setGuidePopupId(null);
    }, 450);
    recordHistory();
    if (
      selectedComponentIds.length > 1 &&
      selectedComponentIds.includes(component.id)
    ) {
      moveComponents(selectedComponentIds, {
        x: delta.x / getInteractionScale(component),
        y: delta.y / getInteractionScale(component),
      });
      return;
    }

    updateComponent(component.id, {
      x: snap.x,
      y: snap.y,
    });
  }

  function resizeComponent(
    component: ResumeComponent,
    deltaX: number,
    deltaY: number,
    direction: ResizeDirection = "bottomRight",
  ) {
    const scale = getInteractionScale(component);
    const scaledDeltaX = deltaX / scale;
    const scaledDeltaY = deltaY / scale;
    let nextX = component.x;
    let nextY = component.y;
    let nextWidth = component.width;
    let nextHeight = component.height;
    const normalizedDirection = direction.toLowerCase();

    if (normalizedDirection.includes("right")) {
      nextWidth = Math.max(48, component.width + scaledDeltaX);
    }
    if (normalizedDirection.includes("left")) {
      nextWidth = Math.max(48, component.width - scaledDeltaX);
      nextX = component.x + (component.width - nextWidth);
    }
    if (normalizedDirection.includes("bottom")) {
      nextHeight = Math.max(36, component.height + scaledDeltaY);
    }
    if (normalizedDirection.includes("top")) {
      nextHeight = Math.max(36, component.height - scaledDeltaY);
      nextY = component.y + (component.height - nextHeight);
    }

    const snap = getSmartSnap(component, nextX, nextY, nextWidth, nextHeight);
    setGuideLines(snap.guides);
    setSpacingGuides(
      getSpacingGuides(component, snap.x, snap.y, snap.width, snap.height),
    );
    setGuidePopupId(
      typeof component.props.popupId === "string"
        ? component.props.popupId
        : null,
    );
    updateComponent(component.id, {
      x: snap.x,
      y: snap.y,
      width: snap.width,
      height: snap.height,
    });
    window.setTimeout(() => {
      setGuideLines([]);
      setSpacingGuides([]);
      setGuidePopupId(null);
    }, 450);
  }

  function addIconToVisibleCenter(icon: (typeof iconOptions)[number]) {
    const canvas = document.getElementById("resume-canvas");
    const canvasTop = canvas?.getBoundingClientRect().top ?? 0;
    const visibleCenter = (window.innerHeight / 2 - canvasTop) / canvasScale;
    const size = { width: 72, height: 72 };
    const x = Math.max(24, Math.round(420 - size.width / 2));
    const y = Math.max(88, Math.round(visibleCenter - size.height / 2));

    addComponents([
      {
        id: crypto.randomUUID(),
        type: "icon",
        x,
        y,
        width: size.width,
        height: size.height,
        content: icon.label,
        props: {
          iconSrc: icon.src,
          color: "#111827",
          backgroundColor: "#ffffff",
          backgroundOpacity: 0,
          borderRadius: 12,
        },
      },
    ]);
  }

  async function loadPresets() {
    setPresetsLoading(true);
    setPresetError(null);

    try {
      const response = await fetch("/api/presets", { method: "GET" });
      const result = (await response.json()) as {
        presets?: ComponentPreset[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "프리셋을 불러오지 못했습니다.");
      }

      setPresets(result.presets ?? []);
      setPresetsLoaded(true);
    } catch (error) {
      setPresetError(
        error instanceof Error
          ? error.message
          : "프리셋을 불러오지 못했습니다.",
      );
    } finally {
      setPresetsLoading(false);
    }
  }

  async function savePreset(input: {
    title: string;
    memo: string;
    component: ResumeComponent;
  }) {
    const response = await fetch("/api/presets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const result = (await response.json()) as {
      preset?: ComponentPreset;
      error?: string;
    };

    if (!response.ok || !result.preset) {
      throw new Error(result.error ?? "프리셋 저장에 실패했습니다.");
    }

    setPresets((items) => [
      result.preset!,
      ...items.filter((item) => item.id !== result.preset!.id),
    ]);
    setPresetsLoaded(true);
  }

  async function updatePreset(input: {
    id: string;
    title: string;
    memo: string;
  }) {
    const response = await fetch("/api/presets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const result = (await response.json()) as {
      preset?: ComponentPreset;
      error?: string;
    };

    if (!response.ok || !result.preset) {
      throw new Error(result.error ?? "프리셋 수정에 실패했습니다.");
    }

    setPresets((items) =>
      items.map((item) =>
        item.id === result.preset!.id ? result.preset! : item,
      ),
    );
  }

  async function deletePreset(preset: ComponentPreset) {
    if (!window.confirm(`'${preset.title}' 프리셋을 삭제할까요?`)) {
      return;
    }

    const response = await fetch(`/api/presets?id=${preset.id}`, {
      method: "DELETE",
    });
    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      setPresetError(result.error ?? "프리셋 삭제에 실패했습니다.");
      return;
    }

    setPresets((items) => items.filter((item) => item.id !== preset.id));
  }

  function addPresetToVisibleCenter(preset: ComponentPreset) {
    const canvas = document.getElementById("resume-canvas");
    const canvasTop = canvas?.getBoundingClientRect().top ?? 0;
    const visibleCenter = (window.innerHeight / 2 - canvasTop) / canvasScale;
    const source = preset.component;
    const x = Math.max(24, Math.round(420 - source.width / 2));
    const y = Math.max(88, Math.round(visibleCenter - source.height / 2));

    recordHistory();
    addComponents([
      {
        ...source,
        id: crypto.randomUUID(),
        x,
        y,
        props: { ...source.props },
      },
    ]);
    setPresetsOpen(false);
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
          margin: 0,
          html2canvas: {
            scale: 2,
            backgroundColor: "#ffffff",
            useCORS: true,
            width: PDF_PAGE_WIDTH,
            windowWidth: PDF_PAGE_WIDTH,
            scrollX: 0,
            scrollY: 0,
          },
          jsPDF: {
            unit: "px",
            format: [PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT],
            orientation: "portrait",
          },
        })
        .from(pdfTarget.firstElementChild ?? pdfTarget)
        .save();
    } finally {
      pdfTarget.remove();
    }
  }

  async function shareUrl() {
    const url = getPublicProjectUrl(editorProject.slug);

    try {
      await navigator.clipboard.writeText(url);
      setShareStatus("copied");
      window.setTimeout(() => setShareStatus("idle"), 1800);
    } catch {
      setShareStatus("error");
      window.setTimeout(() => setShareStatus("idle"), 2200);
    }
  }

  async function shareTemplateUrl() {
    const url = getTemplateShareUrl(editorProject.slug);

    try {
      await navigator.clipboard.writeText(url);
      setTemplateShareStatus("copied");
      window.setTimeout(() => setTemplateShareStatus("idle"), 1800);
    } catch {
      setTemplateShareStatus("error");
      window.setTimeout(() => setTemplateShareStatus("idle"), 2200);
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
    if (component?.type === "popup") {
      updateComponent(componentId, {
        props: {
          ...component.props,
          thumbnailUrl: result.url,
          thumbnailStoragePath: result.path ?? result.url,
        },
      });
      return;
    }

    updateComponent(componentId, {
      content: result.url,
      props: { ...component?.props, storagePath: result.path ?? result.url },
    });
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100 text-zinc-950">
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-3">
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
          <div ref={presetsMenuRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setPresetsOpen((value) => !value);
                if (!presetsOpen && !presetsLoaded) {
                  void loadPresets();
                }
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-sm"
            >
              <PackageOpen className="size-4" />
              프리셋
            </button>
            {presetsOpen ? (
              <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-lg border border-zinc-200 bg-white text-sm shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2">
                  <p className="font-semibold text-zinc-950">프리셋 보관함</p>
                  <button
                    type="button"
                    onClick={() => void loadPresets()}
                    className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-50"
                  >
                    새로고침
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto p-2">
                  {presetsLoading ? (
                    <div className="grid gap-2 p-1">
                      <div className="h-12 animate-pulse rounded-md bg-zinc-100" />
                      <div className="h-12 animate-pulse rounded-md bg-zinc-100" />
                    </div>
                  ) : presetError ? (
                    <p className="rounded-md bg-red-50 p-3 text-xs leading-5 text-red-600">
                      {presetError}
                    </p>
                  ) : presets.length === 0 ? (
                    <p className="rounded-md bg-zinc-50 p-3 text-xs leading-5 text-zinc-500">
                      저장된 프리셋이 없습니다. 컴포넌트를 선택한 뒤
                      Properties에서 프리셋으로 저장해보세요.
                    </p>
                  ) : (
                    <div className="divide-y divide-zinc-100">
                      {presets.map((preset) => (
                        <div
                          key={preset.id}
                          className="flex items-center gap-2 py-1"
                        >
                          <button
                            type="button"
                            onClick={() => addPresetToVisibleCenter(preset)}
                            className="min-w-0 flex-1 rounded-md px-3 py-2 text-left hover:bg-zinc-50"
                          >
                            <span className="block truncate font-medium text-zinc-950">
                              {preset.title}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-zinc-500">
                              {preset.memo || preset.component.type}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPresetEditTarget(preset)}
                            className="shrink-0 rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={() => void deletePreset(preset)}
                            className="shrink-0 rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-red-50 hover:text-red-600"
                          >
                            삭제
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
          {!isScrollMode ? (
            <RouteSwitcher
              project={editorProject}
              activePageId={activePage?.id}
              onSelectPage={setActivePage}
              onAddNavigationPage={addNavigationPage}
              onUpdateNavigationItem={updateNavigationItem}
              onRemoveNavigationPage={removeNavigationPage}
              onReorderNavigationPage={reorderNavigationPage}
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
            onClick={() => setSmartGuidesEnabled((value) => !value)}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm",
              smartGuidesEnabled
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-zinc-200 bg-white text-zinc-500",
            )}
          >
            <Magnet className="size-4" />
            Snap
          </button>
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
          <button
            type="button"
            onClick={() => void shareTemplateUrl()}
            className="inline-flex h-9 w-28 shrink-0 items-center justify-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-sm"
          >
            <Share2 className="size-4" />
            {templateShareStatus === "copied"
              ? "링크 복사됨"
              : templateShareStatus === "error"
                ? "복사 실패"
                : "템플릿 공유"}
          </button>
        </div>
      </header>

      <div
        className={cn(
          "grid flex-1",
          mode === "edit"
            ? isScrollMode
              ? "grid-cols-[240px_minmax(0,1fr)_132px_360px]"
              : "grid-cols-[240px_minmax(0,1fr)_360px]"
            : "grid-cols-1",
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
                  onClick={() =>
                    setPendingInsertType((current) =>
                      current === item.type ? null : item.type,
                    )
                  }
                  className={cn(
                    "rounded-md border p-3 text-left transition hover:border-zinc-400 hover:bg-zinc-50",
                    pendingInsertType === item.type
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-zinc-200",
                  )}
                >
                  <span className="block text-sm font-medium">
                    {item.label}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-zinc-500">
                    {pendingInsertType === item.type
                      ? "캔버스에서 드래그해 크기와 위치를 정하세요."
                      : item.description}
                  </span>
                </button>
              ))}
              <div className="rounded-md border border-zinc-200">
                <button
                  type="button"
                  onClick={() => setIconsOpen((isOpen) => !isOpen)}
                  className="flex w-full items-center justify-between gap-2 p-3 text-left transition hover:bg-zinc-50"
                >
                  <span>
                    <span className="block text-sm font-medium">Icon</span>
                    <span className="mt-1 block text-xs leading-5 text-zinc-500">
                      연락처, 홈, 사람 아이콘
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-zinc-400 transition",
                      iconsOpen && "rotate-180",
                    )}
                  />
                </button>
                {iconsOpen ? (
                  <div className="grid grid-cols-2 gap-2 border-t border-zinc-100 p-2">
                    {iconOptions.map((icon) => (
                      <button
                        key={icon.id}
                        type="button"
                        onClick={() => addIconToVisibleCenter(icon)}
                        className="grid place-items-center gap-1 rounded-md border border-zinc-100 p-2 text-xs text-zinc-500 hover:border-emerald-200 hover:bg-emerald-50"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={icon.src}
                          alt=""
                          className="size-8 object-contain"
                        />
                        <span>{icon.label}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </aside>
        ) : null}

        <main
          ref={scrollAreaRef}
          className={cn(
            "min-w-0 overflow-auto p-6",
            isScrollMode && mode === "edit" && "pr-3",
          )}
        >
          <DndContext
            sensors={sensors}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            onDragCancel={() => {
              setGuideLines([]);
              setSpacingGuides([]);
              setGuidePopupId(null);
            }}
          >
            <div
              className={cn(
                "relative",
                isScrollMode && mode === "edit" ? "ml-6 mr-auto" : "mx-auto",
              )}
              style={{
                width: 840 * canvasScale,
                minHeight: canvasHeight * canvasScale,
              }}
            >
              <div
                id="resume-canvas"
                className={cn(
                  "relative w-[840px] origin-top-left bg-white shadow-sm ring-1 ring-zinc-200",
                  pendingInsertType && mode === "edit" && "cursor-crosshair",
                )}
                onPointerDown={handleCanvasPointerDown}
                style={{
                  minHeight: canvasHeight,
                  background: getCanvasBackgroundCss(canvasBackgroundStyle),
                  transform: `scale(${canvasScale})`,
                }}
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
                          style={{
                            top:
                              layout.offset +
                              SCROLL_CANVAS_HEADER_HEIGHT +
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
                {mode === "edit" && canvasHeight > PDF_PAGE_HEIGHT ? (
                  <PageBreakGuides canvasHeight={canvasHeight} />
                ) : null}
                {renderItems.map(({ component, displayTop }) => (
                  <CanvasComponent
                    key={component.id}
                    component={component}
                    displayTop={displayTop}
                    preview={mode === "preview"}
                    isSelected={selectedComponentIds.includes(component.id)}
                    isLocked={component.props.locked === true}
                    isCropEditing={activeCropEditingId === component.id}
                    onSelect={(event) =>
                      handleComponentSelect(component.id, event)
                    }
                    onDelete={() => {
                      if (component.props.locked === true) {
                        return;
                      }
                      recordHistory();
                      removeComponents(getPopupRelatedIds([component.id]));
                      setSelectedComponentIds((ids) =>
                        ids.filter((id) => id !== component.id),
                      );
                    }}
                    onResize={(deltaX, deltaY, direction) =>
                      resizeComponent(component, deltaX, deltaY, direction)
                    }
                    onResizeStart={recordHistory}
                    onInlineTextChange={(content) =>
                      updateComponentWithCoalescedHistory(
                        component.id,
                        { content },
                        `inline-text:${component.id}`,
                      )
                    }
                    onOpenPopup={() => setOpenPopup(component.id)}
                    interactionScale={canvasScale}
                    onUpdate={(patch) => {
                      if (patch.content || patch.props?.tableData) {
                        updateComponentWithCoalescedHistory(
                          component.id,
                          patch,
                          `component-content:${component.id}`,
                        );
                        return;
                      }

                      updateComponent(component.id, patch);
                    }}
                  />
                ))}
                {!guidePopupId ? (
                  <GuideOverlay
                    guideLines={guideLines}
                    spacingGuides={spacingGuides}
                  />
                ) : null}
                {lasso ? <LassoOverlay lasso={lasso} /> : null}
                {insertDraft ? (
                  <InsertDraftOverlay draft={insertDraft} />
                ) : null}
              </div>
              {popupComponent ? (
                <PopupOverlay
                  popup={popupComponent}
                  childrenComponents={popupChildren}
                  preview={mode === "preview"}
                  selectedComponentId={selectedComponentId}
                  onClose={() => setOpenPopup(null)}
                  onSelect={selectComponent}
                  onDelete={removeComponent}
                  onResize={resizeComponent}
                  onInlineTextChange={(id, content) =>
                    updateComponentWithCoalescedHistory(
                      id,
                      { content },
                      `popup-inline-text:${id}`,
                    )
                  }
                  onUpdateComponent={(id, patch) => {
                    if (patch.content || patch.props?.tableData) {
                      updateComponentWithCoalescedHistory(
                        id,
                        patch,
                        `popup-component-content:${id}`,
                      );
                      return;
                    }

                    updateComponent(id, patch);
                  }}
                  guideLines={
                    guidePopupId === popupComponent.id ? guideLines : []
                  }
                  spacingGuides={
                    guidePopupId === popupComponent.id ? spacingGuides : []
                  }
                />
              ) : null}
            </div>
          </DndContext>
        </main>

        {mode === "edit" &&
        editorProject.navigationMode === "scroll" &&
        editorProject.navigation.length > 0 ? (
          <aside className="min-w-0 border-l border-zinc-100 bg-zinc-50/40 px-2 py-6">
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
              onRename={(id, label) => {
                recordHistory();
                updateNavigationItem(id, { label });
              }}
              onDelete={(id) => {
                recordHistory();
                removeNavigationPage(id);
              }}
              placement="rail"
            />
          </aside>
        ) : null}

        {mode === "edit" ? (
          <PropertyPanel
            components={components}
            selectedComponent={selectedComponent}
            onUpdate={updateComponentWithHistory}
            onUpload={uploadMedia}
            project={editorProject}
            onSetNavigationMode={(navigationMode) => {
              recordHistory();
              setNavigationMode(navigationMode);
            }}
            canvasBackground={canvasBackground}
            canvasBackgroundStyle={canvasBackgroundStyle}
            canvasHeight={canvasHeight}
            onUpdateCanvasBackgroundStyle={(style, options) => {
              recordCoalescedHistory("canvas-background", 700);
              updateCanvasBackground(style.color, { ...options, style });
            }}
            isImageCropEditing={activeCropEditingId === selectedComponent?.id}
            onToggleImageCrop={(id) =>
              setCropEditingId((currentId) => (currentId === id ? null : id))
            }
            onRecordTextAlignHistory={() => undefined}
            onDelete={(id) => {
              if (lockedComponentIds.has(id)) {
                return;
              }
              recordHistory();
              removeComponents(getPopupRelatedIds([id]));
              setSelectedComponentIds((ids) =>
                ids.filter((selectedId) => selectedId !== id),
              );
              selectComponent(null);
            }}
            onOpenPresetSave={setPresetSaveTarget}
          />
        ) : null}
      </div>
      {mode !== "edit" &&
      editorProject.navigationMode === "scroll" &&
      editorProject.navigation.length > 0 ? (
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
      {presetSaveTarget ? (
        <PresetSaveDialog
          component={presetSaveTarget}
          onClose={() => setPresetSaveTarget(null)}
          onSave={async (input) => {
            await savePreset(input);
            setPresetSaveTarget(null);
          }}
        />
      ) : null}
      {presetEditTarget ? (
        <PresetEditDialog
          preset={presetEditTarget}
          onClose={() => setPresetEditTarget(null)}
          onSave={async (input) => {
            await updatePreset(input);
            setPresetEditTarget(null);
          }}
        />
      ) : null}
    </div>
  );
}

function PresetEditDialog({
  preset,
  onClose,
  onSave,
}: {
  preset: ComponentPreset;
  onClose: () => void;
  onSave: (input: { id: string; title: string; memo: string }) => Promise<void>;
}) {
  const [title, setTitle] = useState(preset.title);
  const [memo, setMemo] = useState(preset.memo);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTitle = title.trim();

    if (!nextTitle) {
      setError("프리셋 제목을 입력해주세요.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave({
        id: preset.id,
        title: nextTitle,
        memo,
      });
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "프리셋 수정에 실패했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-zinc-950/35 px-4">
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="w-full max-w-md rounded-lg border border-zinc-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 className="font-semibold text-zinc-950">프리셋 수정</h2>
            <p className="mt-1 text-sm text-zinc-500">
              제목과 메모만 수정합니다. 저장된 컴포넌트 내용은 유지됩니다.
            </p>
          </div>
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="inline-flex size-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-300"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="grid gap-4 p-5">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-zinc-700">제목</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="h-10 rounded-md border border-zinc-200 px-3 text-sm outline-emerald-500"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-zinc-700">메모</span>
            <textarea
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              className="min-h-20 rounded-md border border-zinc-200 p-3 text-sm outline-emerald-500"
            />
          </label>
          {error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-100 px-5 py-4">
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="h-10 rounded-md border border-zinc-200 px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-300"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="h-10 rounded-md bg-zinc-950 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {isSaving ? "수정 중..." : "수정"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PresetSaveDialog({
  component,
  onClose,
  onSave,
}: {
  component: ResumeComponent;
  onClose: () => void;
  onSave: (input: {
    title: string;
    memo: string;
    component: ResumeComponent;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [memo, setMemo] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTitle = title.trim();

    if (!nextTitle) {
      setError("프리셋 제목을 입력해주세요.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave({
        title: nextTitle,
        memo,
        component: {
          ...component,
          props: { ...component.props },
        },
      });
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "프리셋 저장에 실패했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-zinc-950/35 px-4">
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="w-full max-w-md rounded-lg border border-zinc-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 className="font-semibold text-zinc-950">프리셋 저장</h2>
            <p className="mt-1 text-sm text-zinc-500">
              선택한 {component.type} 컴포넌트를 보관함에 저장합니다.
            </p>
          </div>
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="inline-flex size-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-300"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="grid gap-4 p-5">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-zinc-700">제목</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="예: 인삿말"
              className="h-10 rounded-md border border-zinc-200 px-3 text-sm outline-emerald-500"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-zinc-700">메모</span>
            <textarea
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              placeholder="어디에 쓰는 컴포넌트인지 적어두세요."
              className="min-h-20 rounded-md border border-zinc-200 p-3 text-sm outline-emerald-500"
            />
          </label>
          {error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-100 px-5 py-4">
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="h-10 rounded-md border border-zinc-200 px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-300"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="h-10 rounded-md bg-zinc-950 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PageBreakGuides({ canvasHeight }: { canvasHeight: number }) {
  const totalPages = Math.max(1, Math.ceil(canvasHeight / PDF_PAGE_HEIGHT));

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
      {Array.from({ length: totalPages - 1 }, (_, index) => {
        const pageNumber = index + 2;
        const top =
          pageNumber - 1 === 0 ? 0 : (pageNumber - 1) * PDF_PAGE_HEIGHT;

        return (
          <div
            key={pageNumber}
            className="absolute left-0 right-0 border-t border-dashed border-rose-300"
            style={{ top }}
          >
            <span className="absolute right-3 top-1 rounded bg-white/90 px-2 py-0.5 text-[11px] font-medium text-rose-500 shadow-sm ring-1 ring-rose-100">
              PDF {pageNumber}/{totalPages}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function GuideOverlay({
  guideLines,
  spacingGuides,
}: {
  guideLines: GuideLine[];
  spacingGuides: SpacingGuide[];
}) {
  return (
    <>
      {guideLines.map((guide, index) => (
        <div
          key={`${guide.axis}-${guide.position}-${index}`}
          className="pointer-events-none absolute z-[90] border-emerald-500"
          style={
            guide.axis === "x"
              ? {
                  left: guide.position,
                  top: 0,
                  bottom: 0,
                  borderLeftWidth: 1,
                  borderStyle: "dashed",
                }
              : {
                  top: guide.position,
                  left: 0,
                  right: 0,
                  borderTopWidth: 1,
                  borderStyle: "dashed",
                }
          }
        />
      ))}
      {spacingGuides.map((guide, index) => (
        <div
          key={`${guide.axis}-${guide.start}-${guide.end}-${index}`}
          className="pointer-events-none absolute z-[91]"
          style={
            guide.axis === "x"
              ? {
                  left: Math.min(guide.start, guide.end),
                  top: guide.cross,
                  width: Math.abs(guide.end - guide.start),
                  height: 1,
                  borderTop: "1px solid #10b981",
                }
              : {
                  left: guide.cross,
                  top: Math.min(guide.start, guide.end),
                  width: 1,
                  height: Math.abs(guide.end - guide.start),
                  borderLeft: "1px solid #10b981",
                }
          }
        >
          <span
            className="absolute rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm"
            style={
              guide.axis === "x"
                ? {
                    left: "50%",
                    top: -18,
                    transform: "translateX(-50%)",
                  }
                : {
                    left: 6,
                    top: "50%",
                    transform: "translateY(-50%)",
                  }
            }
          >
            {guide.distance}px
          </span>
        </div>
      ))}
    </>
  );
}

function LassoOverlay({
  lasso,
}: {
  lasso: {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  };
}) {
  const left = Math.min(lasso.startX, lasso.currentX);
  const top = Math.min(lasso.startY, lasso.currentY);
  const width = Math.abs(lasso.currentX - lasso.startX);
  const height = Math.abs(lasso.currentY - lasso.startY);

  return (
    <div
      className="pointer-events-none absolute z-[95] border border-emerald-500 bg-emerald-400/10"
      style={{ left, top, width, height }}
    />
  );
}

function InsertDraftOverlay({
  draft,
}: {
  draft: {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  };
}) {
  const left = Math.min(draft.startX, draft.currentX);
  const top = Math.min(draft.startY, draft.currentY);
  const width = Math.abs(draft.currentX - draft.startX);
  const height = Math.abs(draft.currentY - draft.startY);

  return (
    <div
      className="pointer-events-none absolute z-[96] border border-emerald-500 bg-emerald-400/10"
      style={{ left, top, width, height }}
    />
  );
}

function CanvasComponent({
  component,
  displayTop,
  preview,
  isSelected,
  isLocked,
  isCropEditing,
  onSelect,
  onDelete,
  onResize,
  onResizeStart,
  onInlineTextChange,
  onOpenPopup,
  interactionScale,
  onUpdate,
}: {
  component: ResumeComponent;
  displayTop: number;
  preview: boolean;
  isSelected: boolean;
  isLocked: boolean;
  isCropEditing: boolean;
  onSelect: (event?: ReactMouseEvent<HTMLDivElement>) => void;
  onDelete: () => void;
  onResize: (
    deltaX: number,
    deltaY: number,
    direction?: ResizeDirection,
  ) => void;
  onResizeStart: () => void;
  onInlineTextChange: (content: string) => void;
  onOpenPopup: () => void;
  interactionScale: number;
  onUpdate: (patch: Partial<ResumeComponent>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: component.id,
    disabled: preview,
  });
  const [cropDraft, setCropDraft] = useState<{
    left: number;
    top: number;
    right: number;
    bottom: number;
  } | null>(null);
  const textStyle = getTextStyle(component);
  const borderRadius = Number(component.props.borderRadius ?? 6);
  const isRichTextComponent =
    component.type === "text" ||
    component.type === "textbox" ||
    component.type === "link";
  const cropHandleFrame = cropDraft ?? {
    left: (Number(component.props.cropLeft ?? 0) / 100) * component.width,
    top: (Number(component.props.cropTop ?? 0) / 100) * component.height,
    right: (Number(component.props.cropRight ?? 0) / 100) * component.width,
    bottom: (Number(component.props.cropBottom ?? 0) / 100) * component.height,
  };

  const style: CSSProperties = {
    width: component.width,
    height: component.height,
    left: component.x,
    top: displayTop,
    transform: transform
      ? `translate3d(${transform.x / interactionScale}px, ${transform.y / interactionScale}px, 0)`
      : undefined,
    zIndex: getComponentLayer(component),
    backgroundColor:
      component.type === "image" || component.type === "video"
        ? component.props.backgroundColor
          ? withAlpha(
              String(component.props.backgroundColor),
              Number(component.props.backgroundOpacity ?? 100),
            )
          : "transparent"
        : undefined,
    borderColor:
      component.type === "image" || component.type === "video"
        ? String(component.props.borderColor ?? "transparent")
        : undefined,
    borderStyle:
      component.type === "image" || component.type === "video"
        ? (String(
            component.props.borderStyle ?? "solid",
          ) as CSSProperties["borderStyle"])
        : undefined,
    borderWidth:
      component.type === "image" || component.type === "video" ? 1 : undefined,
    borderRadius,
  };
  function handleResizeStart(
    event: ReactPointerEvent<HTMLButtonElement>,
    direction: ResizeDirection,
  ) {
    event.preventDefault();
    event.stopPropagation();
    onResizeStart();

    const startX = event.clientX;
    const startY = event.clientY;

    function handlePointerMove(pointerEvent: PointerEvent) {
      onResize(
        pointerEvent.clientX - startX,
        pointerEvent.clientY - startY,
        direction,
      );
    }

    function handlePointerUp() {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  function handleCropStart(
    event: ReactPointerEvent<HTMLButtonElement>,
    corner: "topLeft" | "topRight" | "bottomLeft" | "bottomRight",
  ) {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startY = event.clientY;
    const initialCrop = {
      top: Number(component.props.cropTop ?? 0),
      right: Number(component.props.cropRight ?? 0),
      bottom: Number(component.props.cropBottom ?? 0),
      left: Number(component.props.cropLeft ?? 0),
    };
    const maxCrop = 92;
    let currentCrop = { ...initialCrop };

    function handlePointerMove(pointerEvent: PointerEvent) {
      const deltaXPercent =
        ((pointerEvent.clientX - startX) /
          interactionScale /
          Math.max(component.width, 1)) *
        100;
      const deltaYPercent =
        ((pointerEvent.clientY - startY) /
          interactionScale /
          Math.max(component.height, 1)) *
        100;
      const nextCrop = { ...initialCrop };

      if (corner.includes("top")) {
        nextCrop.top = Math.round(
          clamp(
            initialCrop.top + deltaYPercent,
            0,
            maxCrop - initialCrop.bottom,
          ),
        );
      }
      if (corner.includes("bottom")) {
        nextCrop.bottom = Math.round(
          clamp(
            initialCrop.bottom - deltaYPercent,
            0,
            maxCrop - initialCrop.top,
          ),
        );
      }
      if (corner.includes("Left")) {
        nextCrop.left = Math.round(
          clamp(
            initialCrop.left + deltaXPercent,
            0,
            maxCrop - initialCrop.right,
          ),
        );
      }
      if (corner.includes("Right")) {
        nextCrop.right = Math.round(
          clamp(
            initialCrop.right - deltaXPercent,
            0,
            maxCrop - initialCrop.left,
          ),
        );
      }

      currentCrop = nextCrop;
      setCropDraft({
        left: (nextCrop.left / 100) * component.width,
        top: (nextCrop.top / 100) * component.height,
        right: (nextCrop.right / 100) * component.width,
        bottom: (nextCrop.bottom / 100) * component.height,
      });
    }

    function handlePointerUp() {
      onUpdate({
        props: {
          ...component.props,
          cropTop: currentCrop.top,
          cropRight: currentCrop.right,
          cropBottom: currentCrop.bottom,
          cropLeft: currentCrop.left,
          mediaWidth: null,
          mediaHeight: null,
          mediaOffsetX: null,
          mediaOffsetY: null,
        },
      });
      setCropDraft(null);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  return (
    <div
      ref={setNodeRef}
      data-component-id={component.id}
      style={style}
      {...listeners}
      {...attributes}
      onMouseDown={(event) => {
        if (!preview) {
          event.stopPropagation();
          onSelect(event);
        }
      }}
      className={cn(
        "absolute rounded-md",
        !preview && (isRichTextComponent ? "cursor-default" : "cursor-move"),
        !preview &&
          isSelected &&
          "outline outline-2 outline-dashed outline-emerald-500",
      )}
    >
      {!preview && isSelected ? (
        <button
          type="button"
          data-editor-control="true"
          disabled={isLocked}
          title={isLocked ? "잠긴 컴포넌트는 삭제할 수 없습니다." : "삭제"}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            if (isLocked) {
              return;
            }
            onDelete();
          }}
          className={cn(
            "absolute right-1 top-1 z-20 inline-flex size-6 items-center justify-center rounded bg-white/95 text-zinc-500 shadow-sm ring-1 ring-zinc-200 hover:text-red-600",
            isLocked && "cursor-not-allowed opacity-35 hover:text-zinc-500",
          )}
        >
          <X className="size-3.5" />
        </button>
      ) : null}
      {component.type === "text" || component.type === "textbox" ? (
        <div
          className="flex h-full w-full overflow-visible"
          style={{
            alignItems: getAlignItemsFromVerticalAlign(
              component.props.verticalAlign,
            ),
            padding: RICH_TEXT_COMPONENT_PADDING,
            backgroundColor: String(
              component.props.backgroundColor
                ? withAlpha(
                    String(component.props.backgroundColor),
                    Number(component.props.backgroundOpacity ?? 100),
                  )
                : "transparent",
            ),
            borderRadius,
          }}
        >
          <RichTextEditor
            readOnly={preview}
            value={component.content ?? ""}
            baseStyle={textStyle}
            className="!h-auto min-h-0 w-full"
            onFocus={() => onSelect()}
            onChange={onInlineTextChange}
          />
        </div>
      ) : component.type === "divider" ? (
        <div className="flex h-full w-full items-center justify-center">
          <span style={getDividerStyle(component)} />
        </div>
      ) : component.type === "table" ? (
        <TableComponent
          component={component}
          preview={preview}
          isSelected={isSelected}
          onSelect={() => onSelect()}
          onUpdate={onUpdate}
          onResizeStart={onResizeStart}
          interactionScale={interactionScale}
        />
      ) : component.type === "image" && component.content ? (
        <div
          data-image-crop-frame="true"
          className="relative h-full w-full overflow-hidden"
          style={{ borderRadius }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={component.content}
            alt=""
            className="absolute"
            style={{
              ...getImageMediaStyle(component),
              clipPath: cropDraft
                ? `inset(${cropDraft.top}px ${cropDraft.right}px ${cropDraft.bottom}px ${cropDraft.left}px)`
                : getImageMediaStyle(component).clipPath,
            }}
          />
          {!preview && isCropEditing ? (
            <>
              {cropDraft ? (
                <>
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-zinc-950/25"
                    style={{ height: cropHandleFrame.top }}
                  />
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-zinc-950/25"
                    style={{ height: cropHandleFrame.bottom }}
                  />
                  <div
                    className="pointer-events-none absolute z-10 bg-zinc-950/25"
                    style={{
                      left: 0,
                      top: cropHandleFrame.top,
                      bottom: cropHandleFrame.bottom,
                      width: cropHandleFrame.left,
                    }}
                  />
                  <div
                    className="pointer-events-none absolute z-10 bg-zinc-950/25"
                    style={{
                      right: 0,
                      top: cropHandleFrame.top,
                      bottom: cropHandleFrame.bottom,
                      width: cropHandleFrame.right,
                    }}
                  />
                </>
              ) : null}
              {(
                ["topLeft", "topRight", "bottomLeft", "bottomRight"] as const
              ).map((corner) => (
                <button
                  key={corner}
                  type="button"
                  data-editor-control="true"
                  onPointerDown={(event) => handleCropStart(event, corner)}
                  className={cn(
                    "absolute z-20 size-5 bg-transparent",
                    corner === "topLeft" &&
                      "cursor-nwse-resize border-l-2 border-t-2 border-emerald-600",
                    corner === "topRight" &&
                      "cursor-nesw-resize border-r-2 border-t-2 border-emerald-600",
                    corner === "bottomLeft" &&
                      "cursor-nesw-resize border-b-2 border-l-2 border-emerald-600",
                    corner === "bottomRight" &&
                      "cursor-nwse-resize border-b-2 border-r-2 border-emerald-600",
                  )}
                  style={{
                    left:
                      corner === "topLeft" || corner === "bottomLeft"
                        ? cropHandleFrame.left
                        : undefined,
                    right:
                      corner === "topRight" || corner === "bottomRight"
                        ? cropHandleFrame.right
                        : undefined,
                    top:
                      corner === "topLeft" || corner === "topRight"
                        ? cropHandleFrame.top
                        : undefined,
                    bottom:
                      corner === "bottomLeft" || corner === "bottomRight"
                        ? cropHandleFrame.bottom
                        : undefined,
                  }}
                  aria-label="Crop image"
                />
              ))}
            </>
          ) : null}
        </div>
      ) : component.type === "video" && component.content ? (
        <video
          src={component.content}
          className="h-full w-full"
          controls={preview}
          style={{
            borderRadius,
            objectFit: String(
              component.props.objectFit ?? "contain",
            ) as CSSProperties["objectFit"],
            objectPosition: `${Number(component.props.objectPositionX ?? 50)}% ${Number(component.props.objectPositionY ?? 50)}%`,
          }}
        />
      ) : component.type === "button" ? (
        <button
          type="button"
          className="h-full w-full bg-zinc-950 px-4 text-sm font-medium text-white"
          style={{
            ...textStyle,
            borderRadius,
            backgroundColor: String(
              withAlpha(
                String(component.props.backgroundColor ?? "#09090b"),
                Number(component.props.backgroundOpacity ?? 100),
              ),
            ),
            color: String(component.props.color ?? "#ffffff"),
          }}
        >
          {component.content ?? "버튼"}
        </button>
      ) : component.type === "link" && !preview ? (
        <div
          className="flex h-full w-full border border-zinc-300 bg-white text-sm font-medium text-zinc-900 underline-offset-4"
          style={{
            ...textStyle,
            alignItems: getAlignItemsFromVerticalAlign(
              component.props.verticalAlign,
            ),
            padding: RICH_TEXT_COMPONENT_PADDING,
            borderRadius,
            backgroundColor: String(
              withAlpha(
                String(component.props.backgroundColor ?? "#ffffff"),
                Number(component.props.backgroundOpacity ?? 100),
              ),
            ),
            color: String(component.props.color ?? "#18181b"),
          }}
        >
          <RichTextEditor
            readOnly={false}
            value={component.content ?? "링크"}
            baseStyle={{
              ...textStyle,
              display: "flex",
              minHeight: 0,
              alignItems: "center",
              justifyContent: getJustifyContentFromTextAlign(
                component.props.textAlign,
              ),
            }}
            className="!h-auto min-h-0 w-full"
            onFocus={() => onSelect()}
            onChange={onInlineTextChange}
          />
        </div>
      ) : component.type === "link" ? (
        <a
          href={String(component.props.href ?? "#")}
          target="_blank"
          rel="noreferrer"
          className="flex h-full w-full min-w-0 overflow-hidden border border-zinc-300 bg-white text-sm font-medium text-zinc-900 underline-offset-4 hover:underline"
          style={{
            ...textStyle,
            borderRadius,
            alignItems: getAlignItemsFromVerticalAlign(
              component.props.verticalAlign,
            ),
            justifyContent: getJustifyContentFromTextAlign(
              component.props.textAlign,
            ),
            padding: RICH_TEXT_COMPONENT_PADDING,
            backgroundColor: String(
              withAlpha(
                String(component.props.backgroundColor ?? "#ffffff"),
                Number(component.props.backgroundOpacity ?? 100),
              ),
            ),
            color: String(component.props.color ?? "#18181b"),
          }}
        >
          <span
            className="resume-link-content resume-public-rich-text"
            style={
              {
                "--resume-line-height": `${Number(component.props.lineHeight ?? 150)}%`,
                "--resume-letter-spacing": `${Number(component.props.letterSpacing ?? 0)}px`,
              } as CSSProperties
            }
            dangerouslySetInnerHTML={{
              __html: sanitizeRichTextHtml(component.content ?? "링크").replace(
                /<\/?a\b[^>]*>/gi,
                "",
              ),
            }}
          />
        </a>
      ) : component.type === "popup" ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenPopup();
          }}
          className="flex h-full w-full flex-col overflow-hidden border border-zinc-200 bg-white text-left shadow-sm"
          style={{
            borderRadius,
            backgroundColor: String(
              withAlpha(
                String(component.props.backgroundColor ?? "#ffffff"),
                Number(component.props.backgroundOpacity ?? 100),
              ),
            ),
            borderColor: String(component.props.borderColor ?? "#e4e4e7"),
            borderStyle: String(
              component.props.borderStyle ?? "solid",
            ) as CSSProperties["borderStyle"],
          }}
        >
          {component.props.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={String(component.props.thumbnailUrl)}
              alt=""
              className="h-32 w-full object-cover"
            />
          ) : null}
          <span
            className={cn(
              "px-3 text-sm font-semibold text-zinc-950",
              component.props.thumbnailUrl ? "pt-3" : "pt-4",
            )}
            dangerouslySetInnerHTML={{
              __html: sanitizeRichTextHtml(component.content ?? "Popup title"),
            }}
          />
          <span className="line-clamp-2 px-3 pb-3 pt-1 text-xs leading-5 text-zinc-500">
            {String(
              component.props.description ??
                "클릭하면 자세한 내용을 볼 수 있습니다.",
            )}
          </span>
        </button>
      ) : component.type === "icon" ? (
        <div
          className="flex h-full w-full items-center justify-center overflow-hidden"
          style={{
            borderRadius,
            backgroundColor: withAlpha(
              String(component.props.backgroundColor ?? "#ffffff"),
              Number(component.props.backgroundOpacity ?? 0),
            ),
          }}
        >
          <span
            className="block h-[72%] w-[72%]"
            style={{
              backgroundColor: String(component.props.color ?? "#111827"),
              maskImage: `url(${String(component.props.iconSrc ?? "/icons/icon_home.png")})`,
              maskPosition: "center",
              maskRepeat: "no-repeat",
              maskSize: "contain",
              WebkitMaskImage: `url(${String(component.props.iconSrc ?? "/icons/icon_home.png")})`,
              WebkitMaskPosition: "center",
              WebkitMaskRepeat: "no-repeat",
              WebkitMaskSize: "contain",
            }}
          />
        </div>
      ) : component.type === "section" || component.type === "container" ? (
        <div
          className="flex h-full w-full items-start border p-3 text-sm font-medium text-zinc-600"
          id={
            component.type === "section"
              ? normalizeAnchor(
                  richTextToPlainText(component.content ?? component.id),
                )
              : undefined
          }
          style={{
            ...textStyle,
            backgroundColor: withAlpha(
              String(component.props.backgroundColor ?? "#f8fafc"),
              Number(component.props.backgroundOpacity ?? 100),
            ),
            borderColor: String(component.props.borderColor ?? "#d4d4d8"),
            borderRadius,
            borderStyle: String(
              component.props.borderStyle ?? "dashed",
            ) as CSSProperties["borderStyle"],
          }}
          dangerouslySetInnerHTML={{
            __html: sanitizeRichTextHtml(component.content ?? ""),
          }}
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center bg-zinc-100 text-sm font-medium text-zinc-500"
          style={{ borderRadius }}
        >
          {component.type}
        </div>
      )}
      {!preview && isSelected ? (
        <>
          {[
            {
              direction: "top" as const,
              className:
                "left-3 right-3 top-0 h-2 -translate-y-1 cursor-ns-resize",
            },
            {
              direction: "right" as const,
              className:
                "bottom-3 right-0 top-3 w-2 translate-x-1 cursor-ew-resize",
            },
            {
              direction: "bottom" as const,
              className:
                "bottom-0 left-3 right-3 h-2 translate-y-1 cursor-ns-resize",
            },
            {
              direction: "left" as const,
              className:
                "bottom-3 left-0 top-3 w-2 -translate-x-1 cursor-ew-resize",
            },
            {
              direction: "topLeft" as const,
              className:
                "left-0 top-0 size-3 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize rounded-full border border-emerald-500 bg-white",
            },
            {
              direction: "topRight" as const,
              className:
                "right-0 top-0 size-3 -translate-y-1/2 translate-x-1/2 cursor-nesw-resize rounded-full border border-emerald-500 bg-white",
            },
            {
              direction: "bottomLeft" as const,
              className:
                "bottom-0 left-0 size-3 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize rounded-full border border-emerald-500 bg-white",
            },
            {
              direction: "bottomRight" as const,
              className:
                "bottom-0 right-0 size-3 translate-x-1/2 translate-y-1/2 cursor-nwse-resize rounded-full border border-emerald-500 bg-white",
            },
          ].map((handle) => (
            <button
              key={handle.direction}
              type="button"
              data-editor-control="true"
              onPointerDown={(event) =>
                handleResizeStart(event, handle.direction)
              }
              className={cn(
                "absolute z-30 bg-emerald-400/0 hover:bg-emerald-400/30",
                handle.className,
              )}
              aria-label="Resize component"
            />
          ))}
        </>
      ) : null}
    </div>
  );
}

function PopupOverlay({
  popup,
  childrenComponents,
  preview,
  selectedComponentId,
  onClose,
  onSelect,
  onDelete,
  onResize,
  onInlineTextChange,
  onUpdateComponent,
  guideLines,
  spacingGuides,
}: {
  popup: ResumeComponent;
  childrenComponents: ResumeComponent[];
  preview: boolean;
  selectedComponentId: string | null;
  onClose: () => void;
  onSelect: (id: string | null) => void;
  onDelete: (id: string) => void;
  onResize: (
    component: ResumeComponent,
    deltaX: number,
    deltaY: number,
    direction?: ResizeDirection,
  ) => void;
  onInlineTextChange: (id: string, content: string) => void;
  onUpdateComponent: (id: string, patch: Partial<ResumeComponent>) => void;
  guideLines: GuideLine[];
  spacingGuides: SpacingGuide[];
}) {
  const overlayHeight = Math.max(
    560,
    ...childrenComponents.map(
      (component) => component.y + component.height + 120,
    ),
  );
  const popupWindowBackground = String(
    popup.props.popupBackgroundColor ?? "#ffffff",
  );
  const canvasRect =
    !preview && typeof document !== "undefined"
      ? document.getElementById("resume-canvas")?.getBoundingClientRect()
      : null;
  const popupFrameStyle: CSSProperties = {
    left: canvasRect ? `${canvasRect.left + canvasRect.width / 2}px` : "50%",
    width: canvasRect
      ? `${Math.min(840, Math.max(320, canvasRect.width - 32))}px`
      : "min(calc(100vw - 2rem), 840px)",
    transform: "translateX(-50%)",
    backgroundColor: popupWindowBackground,
  };

  return (
    <div
      className="fixed top-20 z-[120] max-h-[78vh] min-w-[320px] overflow-hidden rounded-lg border border-zinc-200 shadow-2xl"
      style={popupFrameStyle}
    >
      <div
        className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-zinc-100 px-5"
        style={{ backgroundColor: popupWindowBackground }}
      >
        <div>
          <p className="text-sm font-semibold text-zinc-950">
            {popup.content ?? "Popup title"}
          </p>
          <p className="text-xs text-zinc-500">
            {String(popup.props.description ?? "")}
          </p>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          className="inline-flex size-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100"
        >
          <X className="size-4" />
        </button>
      </div>
      <div
        className="relative overflow-y-auto"
        style={{ height: "calc(78vh - 56px)" }}
      >
        <div className="relative" style={{ minHeight: overlayHeight }}>
          {childrenComponents.length === 0 ? (
            <div className="absolute left-10 top-10 rounded-md border border-dashed border-zinc-300 px-4 py-3 text-sm text-zinc-400">
              Insert에서 컴포넌트를 추가하면 이 팝업 안에 들어갑니다.
            </div>
          ) : null}
          {childrenComponents.map((component) => (
            <CanvasComponent
              key={component.id}
              component={component}
              displayTop={component.y}
              preview={preview}
              isSelected={selectedComponentId === component.id}
              isLocked={component.props.locked === true}
              isCropEditing={false}
              onSelect={(event) => {
                event?.stopPropagation();
                onSelect(component.id);
              }}
              onDelete={() => {
                if (component.props.locked === true) {
                  return;
                }
                onDelete(component.id);
              }}
              onResize={(deltaX, deltaY, direction) =>
                onResize(component, deltaX, deltaY, direction)
              }
              onResizeStart={() => undefined}
              onInlineTextChange={(content) =>
                onInlineTextChange(component.id, content)
              }
              onOpenPopup={() => undefined}
              interactionScale={1}
              onUpdate={(patch) => onUpdateComponent(component.id, patch)}
            />
          ))}
          <div className="pointer-events-none absolute inset-0 z-[140]">
            <GuideOverlay
              guideLines={guideLines}
              spacingGuides={spacingGuides}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function CanvasBackgroundControl({
  project,
  canvasBackground,
  canvasBackgroundStyle,
  canvasHeight,
  onUpdateCanvasBackgroundStyle,
}: {
  project: ResumeProject;
  canvasBackground: string;
  canvasBackgroundStyle: CanvasBackgroundStyle;
  canvasHeight: number;
  onUpdateCanvasBackgroundStyle: (
    style: CanvasBackgroundStyle,
    options?: { allPages?: boolean },
  ) => void;
}) {
  const [activePointId, setActivePointId] = useState<string | null>(null);
  const [isPointDragging, setIsPointDragging] = useState(false);
  const pointEditorRef = useRef<HTMLDivElement | null>(null);
  const minimapRef = useRef<HTMLDivElement | null>(null);
  const pointScrollRef = useRef<HTMLDivElement | null>(null);
  const copiedPointRef = useRef<CanvasBackgroundStyle["points"][number] | null>(
    null,
  );
  const pointHistoryRef = useRef<CanvasBackgroundStyle[]>([]);
  const pointRedoHistoryRef = useRef<CanvasBackgroundStyle[]>([]);
  const activePoint =
    canvasBackgroundStyle.points.find((point) => point.id === activePointId) ??
    null;

  useEffect(() => {
    if (!activePointId) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (pointEditorRef.current?.contains(event.target as Node)) {
        return;
      }

      setActivePointId(null);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActivePointId(null);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [activePointId]);

  function updateStyle(style: CanvasBackgroundStyle) {
    onUpdateCanvasBackgroundStyle(style);
  }

  function recordPointHistory() {
    pointHistoryRef.current = [
      ...pointHistoryRef.current.slice(-29),
      canvasBackgroundStyle,
    ];
    pointRedoHistoryRef.current = [];
  }

  function restorePointStyle(style: CanvasBackgroundStyle) {
    updateStyle(style);
    setActivePointId((currentId) =>
      currentId && style.points.some((point) => point.id === currentId)
        ? currentId
        : (style.points.at(-1)?.id ?? null),
    );
  }

  function undoPointChange() {
    const previous = pointHistoryRef.current.at(-1);
    if (!previous) {
      return;
    }

    pointRedoHistoryRef.current = [
      ...pointRedoHistoryRef.current.slice(-29),
      canvasBackgroundStyle,
    ];
    pointHistoryRef.current = pointHistoryRef.current.slice(0, -1);
    restorePointStyle(previous);
  }

  function redoPointChange() {
    const next = pointRedoHistoryRef.current.at(-1);
    if (!next) {
      return;
    }

    pointHistoryRef.current = [
      ...pointHistoryRef.current.slice(-29),
      canvasBackgroundStyle,
    ];
    pointRedoHistoryRef.current = pointRedoHistoryRef.current.slice(0, -1);
    restorePointStyle(next);
  }

  function setMode(mode: CanvasBackgroundStyle["mode"]) {
    updateStyle({
      mode,
      color: canvasBackgroundStyle.color || canvasBackground,
      points: canvasBackgroundStyle.points,
    });
  }

  function updateBaseColor(color: string) {
    updateStyle({
      ...canvasBackgroundStyle,
      color,
      points: canvasBackgroundStyle.points,
    });
  }

  function clearGradientPoints() {
    if (canvasBackgroundStyle.points.length === 0) {
      return;
    }

    recordPointHistory();
    updateStyle({
      ...canvasBackgroundStyle,
      mode: "gradient",
      points: [],
    });
    setActivePointId(null);
  }

  function getMinimapPoint(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100),
    };
  }

  function addPoint(event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("[data-gradient-point='true']")) {
      return;
    }

    if (activePointId) {
      event.preventDefault();
      event.stopPropagation();
      setActivePointId(null);
      return;
    }

    const point = getMinimapPoint(event);
    const nextPoint = createGradientPoint(point.x, point.y);
    recordPointHistory();
    updateStyle({
      mode: "gradient",
      color: canvasBackgroundStyle.color,
      points: [...canvasBackgroundStyle.points, nextPoint],
    });
    setActivePointId(nextPoint.id);
  }

  function updatePoint(
    id: string,
    patch: Partial<CanvasBackgroundStyle["points"][number]>,
    shouldRecordHistory = false,
  ) {
    if (shouldRecordHistory) {
      recordPointHistory();
    }

    updateStyle({
      ...canvasBackgroundStyle,
      mode: "gradient",
      points: canvasBackgroundStyle.points.map((point) =>
        point.id === id ? { ...point, ...patch } : point,
      ),
    });
  }

  function deletePoint(id: string) {
    recordPointHistory();
    updateStyle({
      ...canvasBackgroundStyle,
      mode: "gradient",
      points: canvasBackgroundStyle.points.filter((point) => point.id !== id),
    });
    setActivePointId(null);
  }

  function copyActivePoint() {
    if (!activePoint) {
      return false;
    }

    copiedPointRef.current = { ...activePoint };
    return true;
  }

  function pasteCopiedPoint() {
    const copiedPoint = copiedPointRef.current;
    if (!copiedPoint) {
      return false;
    }

    const nextPoint = {
      ...copiedPoint,
      id: crypto.randomUUID(),
      x: clamp(copiedPoint.x + 4, 0, 100),
      y: clamp(copiedPoint.y + 4, 0, 100),
    };

    recordPointHistory();
    updateStyle({
      ...canvasBackgroundStyle,
      mode: "gradient",
      points: [...canvasBackgroundStyle.points, nextPoint],
    });
    setActivePointId(nextPoint.id);
    return true;
  }

  function handleGradientKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const isModifierPressed = event.metaKey || event.ctrlKey;
    const key = event.key.toLowerCase();
    const isInputTarget = Boolean(
      (event.target as HTMLElement | null)?.closest("input, textarea, select"),
    );

    if (!activePointId) {
      return;
    }

    if (isModifierPressed && event.shiftKey && key === "z") {
      event.preventDefault();
      event.stopPropagation();
      redoPointChange();
      return;
    }

    if (isModifierPressed && key === "z") {
      event.preventDefault();
      event.stopPropagation();
      undoPointChange();
      return;
    }

    if (isModifierPressed && key === "c") {
      if (copyActivePoint()) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }

    if (isModifierPressed && key === "v") {
      if (pasteCopiedPoint()) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }

    if (
      !isInputTarget &&
      (event.key === "Delete" || event.key === "Backspace")
    ) {
      event.preventDefault();
      event.stopPropagation();
      deletePoint(activePointId);
    }
  }

  function startPointDrag(
    event: ReactPointerEvent<HTMLButtonElement>,
    id: string,
  ) {
    event.preventDefault();
    event.stopPropagation();
    setActivePointId(id);
    setIsPointDragging(true);
    requestAnimationFrame(() => pointScrollRef.current?.focus());
    recordPointHistory();

    function handlePointerMove(pointerEvent: PointerEvent) {
      const rect = minimapRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      updatePoint(id, {
        x: clamp(
          ((pointerEvent.clientX - rect.left) / rect.width) * 100,
          0,
          100,
        ),
        y: clamp(
          ((pointerEvent.clientY - rect.top) / rect.height) * 100,
          0,
          100,
        ),
      });
    }

    function handlePointerUp() {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      setIsPointDragging(false);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  return (
    <div className="grid min-w-0 gap-3 rounded-md border border-zinc-200 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-zinc-700">Canvas Background</p>
        {project.navigationMode === "router" ? (
          <button
            type="button"
            onClick={() =>
              onUpdateCanvasBackgroundStyle(canvasBackgroundStyle, {
                allPages: true,
              })
            }
            className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
          >
            모든 페이지에 적용
          </button>
        ) : null}
      </div>
      <label className="grid min-w-0 gap-1">
        <span className="text-zinc-500">배경 방식</span>
        <select
          value={canvasBackgroundStyle.mode}
          onChange={(event) =>
            setMode(event.target.value as CanvasBackgroundStyle["mode"])
          }
          className="h-9 rounded-md border border-zinc-200 px-2"
        >
          <option value="solid">단색</option>
          <option value="gradient">그라데이션</option>
        </select>
      </label>
      <label className="grid min-w-0 gap-1">
        <span className="text-zinc-500">기본 색상</span>
        <input
          type="color"
          value={canvasBackgroundStyle.color || canvasBackground}
          onChange={(event) => updateBaseColor(event.target.value)}
          className="h-9 w-full rounded-md border border-zinc-200"
        />
      </label>
      {canvasBackgroundStyle.mode === "gradient" ? (
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-zinc-500">그라데이션 편집</span>
            <button
              type="button"
              disabled={canvasBackgroundStyle.points.length === 0}
              onClick={clearGradientPoints}
              className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-300"
            >
              전체 지우기
            </button>
          </div>
          <div
            ref={pointScrollRef}
            tabIndex={0}
            className={cn(
              "max-h-72 rounded-md border border-zinc-200 bg-zinc-50 p-2 outline-none focus:ring-2 focus:ring-emerald-500/40",
              isPointDragging ? "overflow-y-hidden" : "overflow-y-auto",
            )}
            onPointerDown={(event) => event.stopPropagation()}
            onKeyDownCapture={handleGradientKeyDown}
          >
            <div
              ref={minimapRef}
              role="button"
              tabIndex={0}
              className="relative mb-20 w-full overflow-visible rounded-sm ring-1 ring-zinc-200"
              style={{
                aspectRatio: `840 / ${Math.max(840, canvasHeight)}`,
                background: getCanvasBackgroundCss(canvasBackgroundStyle),
              }}
              onPointerDown={addPoint}
            >
              {canvasBackgroundStyle.points.map((point) => (
                <button
                  key={point.id}
                  type="button"
                  data-gradient-point="true"
                  aria-label="그라데이션 편집점"
                  className={cn(
                    "absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow ring-1 ring-zinc-400",
                    activePointId === point.id && "ring-2 ring-emerald-500",
                  )}
                  style={{
                    left: `${point.x}%`,
                    top: `${point.y}%`,
                    backgroundColor: point.color,
                  }}
                  onPointerDown={(event) => startPointDrag(event, point.id)}
                  onClick={(event) => {
                    event.stopPropagation();
                    setActivePointId(point.id);
                    pointScrollRef.current?.focus();
                  }}
                />
              ))}
              {activePoint ? (
                <div
                  ref={pointEditorRef}
                  data-editor-control="true"
                  className="absolute z-20 grid w-36 gap-2 rounded-md border border-zinc-200 bg-white p-2 text-xs shadow-lg"
                  style={{
                    left: `min(${activePoint.x}%, calc(100% - 9rem))`,
                    top:
                      activePoint.y > 78
                        ? `calc(${activePoint.y}% - 8.5rem)`
                        : `calc(${activePoint.y}% + 12px)`,
                  }}
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <label className="grid gap-1">
                    <span className="text-zinc-500">색상</span>
                    <input
                      type="color"
                      value={activePoint.color}
                      onChange={(event) =>
                        updatePoint(
                          activePoint.id,
                          { color: event.target.value },
                          true,
                        )
                      }
                      className="h-8 w-full rounded border border-zinc-200"
                    />
                  </label>
                  <NumberField
                    label="크기"
                    value={activePoint.size}
                    min={5}
                    max={160}
                    onChange={(value) =>
                      updatePoint(
                        activePoint.id,
                        { size: clamp(value, 5, 160) },
                        true,
                      )
                    }
                  />
                  <NumberField
                    label="투명도"
                    value={activePoint.opacity}
                    min={0}
                    max={100}
                    onChange={(value) =>
                      updatePoint(
                        activePoint.id,
                        {
                          opacity: clamp(value, 0, 100),
                        },
                        true,
                      )
                    }
                  />
                  <button
                    type="button"
                    className="h-8 rounded-md border border-red-100 text-red-600 hover:bg-red-50"
                    onClick={() => deletePoint(activePoint.id)}
                  >
                    편집점 삭제
                  </button>
                </div>
              ) : null}
            </div>
          </div>
          <p className="text-xs leading-5 text-zinc-400">
            미니맵 빈 곳을 누르면 편집점이 추가되고, 점을 드래그하면 위치가
            바뀝니다.
          </p>
        </div>
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
  canvasBackground,
  canvasBackgroundStyle,
  canvasHeight,
  onUpdateCanvasBackgroundStyle,
  isImageCropEditing,
  onToggleImageCrop,
  onRecordTextAlignHistory,
  onOpenPresetSave,
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
  canvasBackground: string;
  canvasBackgroundStyle: CanvasBackgroundStyle;
  canvasHeight: number;
  onUpdateCanvasBackgroundStyle: (
    style: CanvasBackgroundStyle,
    options?: { allPages?: boolean },
  ) => void;
  isImageCropEditing: boolean;
  onToggleImageCrop: (id: string) => void;
  onRecordTextAlignHistory: () => void;
  onOpenPresetSave: (component: ResumeComponent) => void;
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

  function updateTableSize(
    component: ResumeComponent,
    rows: number,
    cols: number,
  ) {
    const currentData = parseTableData(component);
    const nextRows = clamp(Math.round(rows), 1, 50);
    const nextCols = clamp(Math.round(cols), 1, 20);

    if (
      (nextRows < getTableRows(component) ||
        nextCols < getTableCols(component)) &&
      hasTrimmedTableContent(currentData, nextRows, nextCols) &&
      !window.confirm(
        "행/열 변경으로 기존 셀 내용이 삭제됩니다. 계속 진행할까요?",
      )
    ) {
      return;
    }

    onUpdate(component.id, {
      props: {
        ...component.props,
        tableRows: nextRows,
        tableCols: nextCols,
        tableData: serializeTableData(
          resizeTableData(currentData, nextRows, nextCols),
        ),
        selectedCellRow: Math.min(
          Number(component.props.selectedCellRow ?? 0),
          nextRows - 1,
        ),
        selectedCellCol: Math.min(
          Number(component.props.selectedCellCol ?? 0),
          nextCols - 1,
        ),
      },
    });
  }

  function updateSelectedTableRangeStyle(
    component: ResumeComponent,
    style: Partial<Omit<TableCell, "text">>,
  ) {
    const data = parseTableData(component);
    const range = getSelectedTableRange(component);

    onUpdate(component.id, {
      props: {
        ...component.props,
        tableData: serializeTableData(
          updateTableCellRangeStyle(data, range, style),
        ),
      },
    });
  }

  function updateSelectedTableRangeTextAlign(
    component: ResumeComponent,
    textAlign: "left" | "center" | "right",
  ) {
    const data = parseTableData(component);
    const range = getSelectedTableRange(component);

    onUpdate(component.id, {
      props: {
        ...component.props,
        tableData: serializeTableData(
          updateTableCellRangeTextAlign(data, range, textAlign),
        ),
      },
    });
  }

  function updateSelectedTableRangeVerticalAlign(
    component: ResumeComponent,
    verticalAlign: "top" | "middle" | "bottom",
  ) {
    updateSelectedTableRangeStyle(component, { verticalAlign });
  }

  const selectedTableRange =
    selectedComponent?.type === "table"
      ? getSelectedTableRange(selectedComponent)
      : null;
  const selectedTableCellData =
    selectedComponent?.type === "table" && selectedTableRange
      ? parseTableData(selectedComponent)[selectedTableRange.startRow]?.[
          selectedTableRange.startCol
        ]
      : null;
  const selectedTableRangeLabel = selectedTableRange
    ? selectedTableRange.startRow === selectedTableRange.endRow &&
      selectedTableRange.startCol === selectedTableRange.endCol
      ? `${selectedTableRange.startRow + 1}행 ${selectedTableRange.startCol + 1}열 셀`
      : `${selectedTableRange.startRow + 1}:${selectedTableRange.endRow + 1}행, ${selectedTableRange.startCol + 1}:${selectedTableRange.endCol + 1}열`
    : "";

  return (
    <aside className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto overflow-x-hidden border-l border-zinc-200 bg-white p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Properties
      </h2>
      <div className="mt-4 grid min-w-0 gap-4 text-sm">
        <label className="grid min-w-0 gap-1">
          <span className="text-zinc-500">Navigation Mode</span>
          <select
            value={project.navigationMode}
            onChange={(event) =>
              onSetNavigationMode(
                event.target.value as ResumeProject["navigationMode"],
              )
            }
            className="h-9 min-w-0 rounded-md border border-zinc-200 px-2"
          >
            <option value="scroll">Scroll</option>
            <option value="router">Router</option>
          </select>
        </label>
        <label className="grid min-w-0 gap-1">
          <span className="text-zinc-500">Canvas Components</span>
          <input
            readOnly
            value={`${components.length} items`}
            className="h-9 min-w-0 rounded-md border border-zinc-200 px-2"
          />
        </label>
        <CanvasBackgroundControl
          project={project}
          canvasBackground={canvasBackground}
          canvasBackgroundStyle={canvasBackgroundStyle}
          canvasHeight={canvasHeight}
          onUpdateCanvasBackgroundStyle={onUpdateCanvasBackgroundStyle}
        />
        {selectedComponent ? (
          <div className="grid min-w-0 gap-4 border-t border-zinc-100 pt-4">
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
                disabled={selectedComponent.props.locked === true}
                title={
                  selectedComponent.props.locked === true
                    ? "잠긴 컴포넌트는 삭제할 수 없습니다."
                    : "삭제"
                }
                onClick={() => onDelete(selectedComponent.id)}
                className={cn(
                  "inline-flex size-9 items-center justify-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-red-600",
                  selectedComponent.props.locked === true &&
                    "cursor-not-allowed opacity-35 hover:bg-transparent hover:text-zinc-400",
                )}
              >
                <Trash2 className="size-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                onUpdate(selectedComponent.id, {
                  props: {
                    ...selectedComponent.props,
                    locked:
                      selectedComponent.props.locked === true ? false : true,
                  },
                })
              }
              className={cn(
                "inline-flex h-9 items-center justify-center gap-2 rounded-md border border-zinc-200 px-3 text-sm font-medium",
                selectedComponent.props.locked === true
                  ? "bg-zinc-950 text-white"
                  : "text-zinc-700 hover:bg-zinc-50",
              )}
            >
              {selectedComponent.props.locked === true ? (
                <Lock className="size-4" />
              ) : (
                <Unlock className="size-4" />
              )}
              {selectedComponent.props.locked === true
                ? "삭제 잠금 켜짐"
                : "삭제 잠금"}
            </button>

            <div className="grid gap-1">
              <button
                type="button"
                onClick={() => onOpenPresetSave(selectedComponent)}
                className="h-9 rounded-md border border-zinc-200 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                프리셋 저장
              </button>
              <p className="text-xs leading-5 text-zinc-400">
                이 컴포넌트를 저장하여 어디에서든지 불러올 수 있습니다.
              </p>
            </div>

            {selectedComponent.type === "text" ||
            selectedComponent.type === "textbox" ? (
              <div className="rounded-md bg-zinc-50 p-3 text-xs leading-5 text-zinc-500">
                텍스트 내용과 일부 선택 스타일은 캔버스 안에서 직접 수정합니다.
              </div>
            ) : null}

            {selectedComponent.type === "table" ? (
              <div className="grid gap-3 rounded-md border border-zinc-200 p-3">
                <p className="text-sm font-medium text-zinc-700">Table</p>
                <div className="grid grid-cols-2 gap-2">
                  <NumberField
                    label="Rows"
                    value={getTableRows(selectedComponent)}
                    min={1}
                    max={50}
                    onChange={(value) =>
                      updateTableSize(
                        selectedComponent,
                        value,
                        getTableCols(selectedComponent),
                      )
                    }
                  />
                  <NumberField
                    label="Columns"
                    value={getTableCols(selectedComponent)}
                    min={1}
                    max={20}
                    onChange={(value) =>
                      updateTableSize(
                        selectedComponent,
                        getTableRows(selectedComponent),
                        value,
                      )
                    }
                  />
                </div>
                <label className="grid min-w-0 gap-1">
                  <span className="text-zinc-500">
                    Selected Cell Range Background
                  </span>
                  <input
                    type="color"
                    value={selectedTableCellData?.backgroundColor ?? "#ffffff"}
                    onChange={(event) =>
                      updateSelectedTableRangeStyle(selectedComponent, {
                        backgroundColor: event.target.value,
                      })
                    }
                    className="h-9 w-full rounded-md border border-zinc-200"
                  />
                  <span className="text-xs text-zinc-400">
                    {selectedTableRangeLabel}에 적용됩니다.
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="grid min-w-0 gap-1">
                    <span className="text-zinc-500">좌우 정렬</span>
                    <select
                      value={selectedTableCellData?.textAlign ?? "left"}
                      onChange={(event) =>
                        updateSelectedTableRangeTextAlign(
                          selectedComponent,
                          event.target.value as "left" | "center" | "right",
                        )
                      }
                      className="h-9 rounded-md border border-zinc-200 px-2"
                    >
                      <option value="left">좌측</option>
                      <option value="center">가운데</option>
                      <option value="right">우측</option>
                    </select>
                  </label>
                  <label className="grid min-w-0 gap-1">
                    <span className="text-zinc-500">상하 정렬</span>
                    <select
                      value={selectedTableCellData?.verticalAlign ?? "top"}
                      onChange={(event) =>
                        updateSelectedTableRangeVerticalAlign(
                          selectedComponent,
                          event.target.value as "top" | "middle" | "bottom",
                        )
                      }
                      className="h-9 rounded-md border border-zinc-200 px-2"
                    >
                      <option value="top">위</option>
                      <option value="middle">가운데</option>
                      <option value="bottom">아래</option>
                    </select>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="grid gap-1">
                    <span className="text-zinc-500">글자색</span>
                    <input
                      type="color"
                      value={String(
                        selectedTableCellData?.color ??
                          selectedComponent.props.color ??
                          "#111827",
                      )}
                      onChange={(event) =>
                        updateSelectedTableRangeStyle(selectedComponent, {
                          color: event.target.value,
                        })
                      }
                      className="h-9 w-full rounded-md border border-zinc-200"
                    />
                  </label>
                  <NumberField
                    label="크기"
                    value={Number(
                      selectedTableCellData?.fontSize ??
                        selectedComponent.props.fontSize ??
                        14,
                    )}
                    min={1}
                    max={200}
                    onChange={(value) =>
                      updateSelectedTableRangeStyle(selectedComponent, {
                        fontSize: value,
                      })
                    }
                  />
                </div>
                <label className="grid gap-1">
                  <span className="text-zinc-500">글꼴</span>
                  <select
                    value={String(
                      selectedTableCellData?.fontFamily ??
                        selectedComponent.props.fontFamily ??
                        FONT_OPTIONS[0].value,
                    )}
                    onChange={(event) =>
                      updateSelectedTableRangeStyle(selectedComponent, {
                        fontFamily: event.target.value,
                      })
                    }
                    className="h-9 rounded-md border border-zinc-200 px-2"
                  >
                    {FONT_OPTIONS.map((font) => (
                      <option key={font.value} value={font.value}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-zinc-500">두께</span>
                  <select
                    value={String(
                      normalizeFontWeight(
                        selectedTableCellData?.fontWeight ??
                          selectedComponent.props.fontWeight,
                      ),
                    )}
                    onChange={(event) =>
                      updateSelectedTableRangeStyle(selectedComponent, {
                        fontWeight: Number(event.target.value),
                      })
                    }
                    className="h-9 rounded-md border border-zinc-200 px-2"
                  >
                    {FONT_WEIGHT_OPTIONS.map((weight) => (
                      <option key={weight.value} value={weight.value}>
                        {weight.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <NumberField
                    label="줄간격 (%)"
                    value={Number(
                      selectedTableCellData?.lineHeight ??
                        selectedComponent.props.lineHeight ??
                        150,
                    )}
                    min={0}
                    max={300}
                    onChange={(value) =>
                      updateSelectedTableRangeStyle(selectedComponent, {
                        lineHeight: value,
                      })
                    }
                  />
                  <NumberField
                    label="자간 (px)"
                    value={Number(
                      selectedTableCellData?.letterSpacing ??
                        selectedComponent.props.letterSpacing ??
                        0,
                    )}
                    min={-5}
                    max={30}
                    onChange={(value) =>
                      updateSelectedTableRangeStyle(selectedComponent, {
                        letterSpacing: value,
                      })
                    }
                  />
                </div>
              </div>
            ) : null}

            {selectedComponent.type === "section" ||
            selectedComponent.type === "container" ||
            selectedComponent.type === "popup" ? (
              <label className="grid min-w-0 gap-1">
                <span className="text-zinc-500">
                  {selectedComponent.type === "popup" ? "Title" : "Label"}
                </span>
                <input
                  value={selectedComponent.content ?? ""}
                  onChange={(event) =>
                    onUpdate(selectedComponent.id, {
                      content: event.target.value,
                    })
                  }
                  className="h-9 min-w-0 rounded-md border border-zinc-200 px-2"
                />
              </label>
            ) : null}

            {selectedComponent.type === "popup" ? (
              <div className="grid gap-3">
                <label className="grid min-w-0 gap-1">
                  <span className="text-zinc-500">Description</span>
                  <textarea
                    value={String(selectedComponent.props.description ?? "")}
                    onChange={(event) =>
                      onUpdate(selectedComponent.id, {
                        props: {
                          ...selectedComponent.props,
                          description: event.target.value,
                        },
                      })
                    }
                    className="min-h-20 rounded-md border border-zinc-200 p-2"
                  />
                </label>
                <label className="grid min-w-0 gap-1">
                  <span className="text-zinc-500">Thumbnail Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void handleUpload(file, "image");
                      }
                    }}
                    className="w-full min-w-0 rounded-md border border-zinc-200 px-2 py-2 text-xs"
                  />
                  <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                    <Upload className="size-3.5" />
                    {isUploading
                      ? "업로드 중..."
                      : selectedComponent.props.thumbnailUrl
                        ? "썸네일 업로드됨"
                        : "팝업 썸네일은 한 장만 사용합니다."}
                  </span>
                  {uploadError ? (
                    <span className="text-xs text-red-600">{uploadError}</span>
                  ) : null}
                </label>
                <label className="grid min-w-0 gap-1">
                  <span className="text-zinc-500">Popup Window Background</span>
                  <input
                    type="color"
                    value={String(
                      selectedComponent.props.popupBackgroundColor ?? "#ffffff",
                    )}
                    onChange={(event) =>
                      onUpdate(selectedComponent.id, {
                        props: {
                          ...selectedComponent.props,
                          popupBackgroundColor: event.target.value,
                        },
                      })
                    }
                    className="h-9 w-full rounded-md border border-zinc-200"
                  />
                </label>
              </div>
            ) : null}

            {selectedComponent.type === "icon" ? (
              <div className="grid gap-2 rounded-md border border-zinc-200 p-3">
                <p className="text-sm font-medium text-zinc-700">Icon</p>
                <div className="grid grid-cols-2 gap-2">
                  {iconOptions.map((icon) => (
                    <button
                      key={icon.id}
                      type="button"
                      onClick={() =>
                        onUpdate(selectedComponent.id, {
                          content: icon.label,
                          props: {
                            ...selectedComponent.props,
                            iconSrc: icon.src,
                          },
                        })
                      }
                      className={cn(
                        "grid place-items-center gap-1 rounded-md border p-2 text-xs text-zinc-500",
                        selectedComponent.props.iconSrc === icon.src
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-zinc-100 hover:border-zinc-300",
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={icon.src}
                        alt=""
                        className="size-7 object-contain"
                      />
                      <span>{icon.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {selectedComponent.type === "image" ||
            selectedComponent.type === "video" ? (
              <div className="grid min-w-0 gap-3">
                <label className="grid min-w-0 gap-1">
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
                    className="w-full min-w-0 rounded-md border border-zinc-200 px-2 py-2 text-xs"
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
                <label className="grid min-w-0 gap-1">
                  <span className="text-zinc-500">Fit</span>
                  <select
                    value={String(
                      selectedComponent.props.objectFit ?? "contain",
                    )}
                    onChange={(event) =>
                      onUpdate(selectedComponent.id, {
                        props: {
                          ...selectedComponent.props,
                          objectFit: event.target.value,
                        },
                      })
                    }
                    className="h-9 min-w-0 rounded-md border border-zinc-200 px-2"
                  >
                    <option value="contain">Fit</option>
                    <option value="fill">Stretch</option>
                  </select>
                </label>
                {selectedComponent.type === "image" ? (
                  <button
                    type="button"
                    onClick={() => onToggleImageCrop(selectedComponent.id)}
                    className={cn(
                      "h-9 rounded-md border px-3 text-sm font-medium transition",
                      isImageCropEditing
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-zinc-200 text-zinc-700 hover:bg-zinc-50",
                    )}
                  >
                    {isImageCropEditing
                      ? "이미지 자르기 종료"
                      : "이미지 자르기"}
                  </button>
                ) : null}
              </div>
            ) : null}

            {selectedComponent.type === "button" ||
            selectedComponent.type === "link" ? (
              <label className="grid min-w-0 gap-1">
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
                  className="h-9 min-w-0 rounded-md border border-zinc-200 px-2"
                />
              </label>
            ) : null}

            {selectedComponent.type === "link" ? (
              <label className="grid min-w-0 gap-1">
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
                  className="h-9 min-w-0 rounded-md border border-zinc-200 px-2"
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

            {hasTypography(selectedComponent) ? (
              <details className="rounded-md border border-zinc-200 p-3" open>
                <summary className="cursor-pointer text-sm font-medium text-zinc-700">
                  Typography
                </summary>
                <div className="mt-3 grid gap-3">
                  <div
                    className={cn(
                      "grid gap-2",
                      selectedComponent.type !== "icon" && "grid-cols-2",
                    )}
                  >
                    <label className="grid gap-1">
                      <span className="text-zinc-500">
                        {selectedComponent.type === "icon"
                          ? "Icon Color"
                          : "Text Color"}
                      </span>
                      <input
                        type="color"
                        value={String(
                          selectedComponent.props.color ?? "#111827",
                        )}
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
                    {selectedComponent.type !== "icon" ? (
                      <NumberField
                        label="Font Size"
                        value={Number(selectedComponent.props.fontSize ?? 16)}
                        onChange={(value) =>
                          onUpdate(selectedComponent.id, {
                            props: {
                              ...selectedComponent.props,
                              fontSize: value,
                            },
                          })
                        }
                      />
                    ) : null}
                  </div>
                  {selectedComponent.type !== "icon" ? (
                    <>
                      <label className="grid gap-1">
                        <span className="text-zinc-500">Font Family</span>
                        <select
                          value={String(
                            selectedComponent.props.fontFamily ??
                              FONT_OPTIONS[0].value,
                          )}
                          onChange={(event) =>
                            onUpdate(selectedComponent.id, {
                              props: {
                                ...selectedComponent.props,
                                fontFamily: event.target.value,
                              },
                            })
                          }
                          className="h-9 rounded-md border border-zinc-200 px-2"
                        >
                          {FONT_OPTIONS.map((font) => (
                            <option key={font.value} value={font.value}>
                              {font.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-1">
                        <span className="text-zinc-500">Font Weight</span>
                        <select
                          value={String(
                            normalizeFontWeight(
                              selectedComponent.props.fontWeight,
                            ),
                          )}
                          onChange={(event) =>
                            onUpdate(selectedComponent.id, {
                              props: {
                                ...selectedComponent.props,
                                fontWeight: Number(event.target.value),
                              },
                            })
                          }
                          className="h-9 rounded-md border border-zinc-200 px-2"
                        >
                          {FONT_WEIGHT_OPTIONS.map((weight) => (
                            <option key={weight.value} value={weight.value}>
                              {weight.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      {selectedComponent.type === "text" ||
                      selectedComponent.type === "textbox" ||
                      selectedComponent.type === "link" ? (
                        <div className="grid grid-cols-2 gap-2">
                          <label className="grid gap-1">
                            <span className="text-zinc-500">Text Align</span>
                            <select
                              value={String(
                                selectedComponent.props.textAlign ?? "left",
                              )}
                              onChange={(event) => {
                                onRecordTextAlignHistory();
                                onUpdate(selectedComponent.id, {
                                  props: {
                                    ...selectedComponent.props,
                                    textAlign: event.target.value,
                                  },
                                });
                              }}
                              className="h-9 rounded-md border border-zinc-200 px-2"
                            >
                              <option value="left">좌측</option>
                              <option value="center">가운데</option>
                              <option value="right">우측</option>
                            </select>
                          </label>
                          <label className="grid gap-1">
                            <span className="text-zinc-500">Vertical</span>
                            <select
                              value={String(
                                selectedComponent.props.verticalAlign ?? "top",
                              )}
                              onChange={(event) =>
                                onUpdate(selectedComponent.id, {
                                  props: {
                                    ...selectedComponent.props,
                                    verticalAlign: event.target.value,
                                  },
                                })
                              }
                              className="h-9 rounded-md border border-zinc-200 px-2"
                            >
                              <option value="top">상단</option>
                              <option value="middle">가운데</option>
                              <option value="bottom">하단</option>
                            </select>
                          </label>
                        </div>
                      ) : null}
                      <div className="grid grid-cols-2 gap-2">
                        <NumberField
                          label="Line Height (%)"
                          value={Number(
                            selectedComponent.props.lineHeight ?? 150,
                          )}
                          min={80}
                          max={300}
                          onChange={(value) =>
                            onUpdate(selectedComponent.id, {
                              ...(["text", "textbox", "link"].includes(
                                selectedComponent.type,
                              )
                                ? {
                                    content: resetRichTextLineSpacing(
                                      selectedComponent.content ?? "",
                                    ),
                                  }
                                : {}),
                              props: {
                                ...selectedComponent.props,
                                lineHeight: value,
                              },
                            })
                          }
                        />
                        <NumberField
                          label="Letter Spacing (px)"
                          value={Number(
                            selectedComponent.props.letterSpacing ?? 0,
                          )}
                          min={-5}
                          max={30}
                          onChange={(value) =>
                            onUpdate(selectedComponent.id, {
                              props: {
                                ...selectedComponent.props,
                                letterSpacing: value,
                              },
                            })
                          }
                        />
                      </div>
                    </>
                  ) : null}
                </div>
              </details>
            ) : null}
            <label className="grid min-w-0 gap-1">
              <span className="text-zinc-500">
                {selectedComponent.type === "divider"
                  ? "Border Color"
                  : "Background Color"}
              </span>
              <input
                type="color"
                value={String(
                  selectedComponent.type === "divider"
                    ? (selectedComponent.props.borderColor ?? "#d4d4d8")
                    : (selectedComponent.props.backgroundColor ?? "#ffffff"),
                )}
                onChange={(event) =>
                  onUpdate(selectedComponent.id, {
                    props: {
                      ...selectedComponent.props,
                      [selectedComponent.type === "divider"
                        ? "borderColor"
                        : "backgroundColor"]: event.target.value,
                    },
                  })
                }
                className="h-9 w-full rounded-md border border-zinc-200"
              />
            </label>
            {selectedComponent.type === "divider" ? (
              <details className="rounded-md border border-zinc-200 p-3" open>
                <summary className="cursor-pointer text-sm font-medium text-zinc-700">
                  Divider Style
                </summary>
                <div className="mt-3 grid gap-3">
                  <label className="grid min-w-0 gap-1">
                    <span className="text-zinc-500">Direction</span>
                    <select
                      value={String(
                        selectedComponent.props.orientation ?? "horizontal",
                      )}
                      onChange={(event) =>
                        onUpdate(selectedComponent.id, {
                          props: {
                            ...selectedComponent.props,
                            orientation: event.target.value,
                          },
                        })
                      }
                      className="h-9 min-w-0 rounded-md border border-zinc-200 px-2"
                    >
                      <option value="horizontal">가로</option>
                      <option value="vertical">세로</option>
                    </select>
                  </label>
                  <label className="grid min-w-0 gap-1">
                    <span className="text-zinc-500">Line Style</span>
                    <select
                      value={String(
                        selectedComponent.props.lineStyle ?? "solid",
                      )}
                      onChange={(event) =>
                        onUpdate(selectedComponent.id, {
                          props: {
                            ...selectedComponent.props,
                            lineStyle: event.target.value,
                          },
                        })
                      }
                      className="h-9 min-w-0 rounded-md border border-zinc-200 px-2"
                    >
                      <option value="solid">실선</option>
                      <option value="dashed">점선</option>
                    </select>
                  </label>
                  <label className="grid min-w-0 gap-1">
                    <span className="text-zinc-500">Thickness</span>
                    <select
                      value={String(
                        selectedComponent.props.thickness ?? "thin",
                      )}
                      onChange={(event) =>
                        onUpdate(selectedComponent.id, {
                          props: {
                            ...selectedComponent.props,
                            thickness: event.target.value,
                          },
                        })
                      }
                      className="h-9 min-w-0 rounded-md border border-zinc-200 px-2"
                    >
                      <option value="thin">얇음</option>
                      <option value="medium">중간</option>
                      <option value="thick">두꺼움</option>
                    </select>
                  </label>
                </div>
              </details>
            ) : null}
            {selectedComponent.type !== "divider" ? (
              <NumberField
                label="Background Opacity (%)"
                value={Number(selectedComponent.props.backgroundOpacity ?? 100)}
                onChange={(value) =>
                  onUpdate(selectedComponent.id, {
                    props: {
                      ...selectedComponent.props,
                      backgroundColor:
                        selectedComponent.props.backgroundColor ?? "#ffffff",
                      backgroundOpacity: clamp(value, 0, 100),
                    },
                  })
                }
              />
            ) : null}
            {selectedComponent.type === "section" ||
            selectedComponent.type === "container" ||
            selectedComponent.type === "text" ||
            selectedComponent.type === "textbox" ||
            selectedComponent.type === "image" ||
            selectedComponent.type === "video" ||
            selectedComponent.type === "icon" ||
            selectedComponent.type === "table" ||
            selectedComponent.type === "link" ||
            selectedComponent.type === "button" ||
            selectedComponent.type === "popup" ? (
              <details className="rounded-md border border-zinc-200 p-3" open>
                <summary className="cursor-pointer text-sm font-medium text-zinc-700">
                  Box Style
                </summary>
                <div className="mt-3 grid gap-3">
                  <NumberField
                    label="Border Radius (px)"
                    value={Number(selectedComponent.props.borderRadius ?? 6)}
                    onChange={(value) =>
                      onUpdate(selectedComponent.id, {
                        props: {
                          ...selectedComponent.props,
                          borderRadius: clamp(value, 0, 96),
                        },
                      })
                    }
                  />
                  <label className="grid min-w-0 gap-1">
                    <span className="text-zinc-500">Border Color</span>
                    <input
                      type="color"
                      value={String(
                        selectedComponent.props.borderColor ?? "#d4d4d8",
                      )}
                      onChange={(event) =>
                        onUpdate(selectedComponent.id, {
                          props: {
                            ...selectedComponent.props,
                            borderColor: event.target.value,
                          },
                        })
                      }
                      className="h-9 w-full rounded-md border border-zinc-200"
                    />
                  </label>
                  <label className="grid min-w-0 gap-1">
                    <span className="text-zinc-500">Border Style</span>
                    <select
                      value={String(
                        selectedComponent.props.borderStyle ?? "dashed",
                      )}
                      onChange={(event) =>
                        onUpdate(selectedComponent.id, {
                          props: {
                            ...selectedComponent.props,
                            borderStyle: event.target.value,
                          },
                        })
                      }
                      className="h-9 min-w-0 rounded-md border border-zinc-200 px-2"
                    >
                      <option value="dashed">Dashed</option>
                      <option value="solid">Solid</option>
                    </select>
                  </label>
                </div>
              </details>
            ) : null}
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
