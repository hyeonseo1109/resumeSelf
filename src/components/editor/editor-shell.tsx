"use client";

import {
  DndContext,
  PointerSensor,
  type DragEndEvent,
  type DragMoveEvent,
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
  Magnet,
  Pencil,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import NextLink from "next/link";
import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "zustand";
import { iconOptions, insertableComponents } from "@/config/editor";
import { NumberField } from "@/components/editor/number-field";
import { RouteSwitcher } from "@/components/editor/route-switcher";
import { ScrollToc } from "@/components/editor/scroll-toc";
import { SiteHeader } from "@/components/editor/site-header";
import {
  createPdfExportNode,
  waitForPdfNode,
} from "@/features/editor/pdf-export";
import { createEditorStore } from "@/features/editor/store";
import {
  FONT_OPTIONS,
  FONT_WEIGHT_OPTIONS,
  PDF_PAGE_HEIGHT,
  PDF_PAGE_WIDTH,
  type GuideLine,
  type SpacingGuide,
  clamp,
  getComponentLayer,
  getDividerStyle,
  getImageMediaStyle,
  getTextStyle,
  hasTypography,
  normalizeAnchor,
  normalizeFontWeight,
  withAlpha,
} from "@/features/editor/view-helpers";
import { cn } from "@/lib/utils/cn";
import { getPublicProjectUrl } from "@/lib/utils/site-url";
import type { ResumeComponent, ResumeProject } from "@/types/project";

interface EditorShellProps {
  project: ResumeProject;
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
  const [activeTocTarget, setActiveTocTarget] = useState(
    editorProject.navigation[0]?.target ?? "",
  );
  const [smartGuidesEnabled, setSmartGuidesEnabled] = useState(true);
  const [guideLines, setGuideLines] = useState<GuideLine[]>([]);
  const [spacingGuides, setSpacingGuides] = useState<SpacingGuide[]>([]);
  const [guidePopupId, setGuidePopupId] = useState<string | null>(null);
  const [canvasScale, setCanvasScale] = useState(1);
  const [selectedComponentIds, setSelectedComponentIds] = useState<string[]>([]);
  const [cropEditingId, setCropEditingId] = useState<string | null>(null);
  const [iconsOpen, setIconsOpen] = useState(false);
  const [lasso, setLasso] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  const scrollAreaRef = useRef<HTMLElement | null>(null);
  const projectRef = useRef(editorProject);
  const saveStatusRef = useRef(saveStatus);
  const copyBufferRef = useRef<ResumeComponent[]>([]);
  const historyRef = useRef<ResumeProject[]>([]);

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
  const renderItems = (
    isScrollMode
      ? pageLayouts.flatMap((layout) =>
          layout.components.map((component) => ({
            component,
            displayTop: component.y + layout.offset + 44,
          })),
        )
      : activePageComponents.map((component) => ({
          component,
          displayTop: component.y,
        }))
  )
    .filter(({ component }) => !component.props.popupId)
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
  const activeCropEditingId =
    selectedComponent?.type === "image" && selectedComponent.id === cropEditingId
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
          .map((component) => component.y + component.height + 160),
      );
  const canvasBackground =
    activePage?.canvasBackground ??
    editorProject.pages[0]?.canvasBackground ??
    "#ffffff";

  useEffect(() => {
    projectRef.current = editorProject;
  }, [editorProject]);

  useEffect(() => {
    saveStatusRef.current = saveStatus;
  }, [saveStatus]);

  function recordHistory() {
    historyRef.current = [...historyRef.current.slice(-29), projectRef.current];
  }

  function undoLastChange() {
    const previous = historyRef.current.at(-1);
    if (!previous) {
      return;
    }

    historyRef.current = historyRef.current.slice(0, -1);
    replaceProject(previous);
    setSelectedComponentIds([]);
  }

  function getPopupRelatedIds(ids: string[]) {
    const relatedIds = new Set(ids);

    ids.forEach((id) => {
      const popup = components.find((component) => component.id === id && component.type === "popup");
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
    sourceComponents.forEach((component) => idMap.set(component.id, crypto.randomUUID()));

    return sourceComponents.map((component) => {
      const nextId = idMap.get(component.id) ?? crypto.randomUUID();
      const popupId = typeof component.props.popupId === "string" ? component.props.popupId : null;
      const isClonedPopupChild = Boolean(popupId && idMap.has(popupId));

      return {
        ...component,
        id: nextId,
        x: isClonedPopupChild ? component.x : component.x + 28,
        y: isClonedPopupChild ? component.y : component.y + 28,
        props: {
          ...component.props,
          popupId: popupId && idMap.has(popupId) ? idMap.get(popupId)! : component.props.popupId,
        },
      };
    });
  }

  function copySelectedComponents() {
    const ids = getPopupRelatedIds(selectedComponentIds);
    copyBufferRef.current = components.filter((component) => ids.includes(component.id));
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
    const idsToSelect = pastedRootIds.length > 0 ? pastedRootIds : clonedComponents.map((component) => component.id);
    setSelectedComponentIds(idsToSelect);
    selectComponent(idsToSelect[0] ?? null);
  }

  function deleteSelectedComponents() {
    if (selectedComponentIds.length === 0) {
      return;
    }

    recordHistory();
    const idsToRemove = getPopupRelatedIds(selectedComponentIds);
    removeComponents(idsToRemove);
    setSelectedComponentIds([]);
    selectComponent(null);
  }

  function isEditableTarget(target: EventTarget | null) {
    const element = target as HTMLElement | null;
    return Boolean(
      element?.closest("input, textarea, select, [contenteditable='true']"),
    );
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (mode !== "edit" || isEditableTarget(event.target)) {
        return;
      }

      const isModifierPressed = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

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

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelectedComponents();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

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

  function getCanvasPoint(event: PointerEvent | ReactPointerEvent<HTMLElement>) {
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

  function getLassoRect(selection: NonNullable<typeof lasso>) {
    return {
      left: Math.min(selection.startX, selection.currentX),
      top: Math.min(selection.startY, selection.currentY),
      right: Math.max(selection.startX, selection.currentX),
      bottom: Math.max(selection.startY, selection.currentY),
    };
  }

  function rectsIntersect(
    a: { left: number; top: number; right: number; bottom: number },
    b: { left: number; top: number; right: number; bottom: number },
  ) {
    return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
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

    setSelectedComponentIds([id]);
    selectComponent(id);
  }

  function handleCanvasPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
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
    setLasso({ startX: start.x, startY: start.y, currentX: start.x, currentY: start.y });

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
    setGuidePopupId(typeof component.props.popupId === "string" ? component.props.popupId : null);
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
    setGuidePopupId(typeof component.props.popupId === "string" ? component.props.popupId : null);
    window.setTimeout(() => {
      setGuideLines([]);
      setSpacingGuides([]);
      setGuidePopupId(null);
    }, 450);
    recordHistory();
    if (selectedComponentIds.length > 1 && selectedComponentIds.includes(component.id)) {
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
    deltaWidth: number,
    deltaHeight: number,
  ) {
    const scale = getInteractionScale(component);
    const nextWidth = Math.max(48, component.width + deltaWidth / scale);
    const nextHeight = Math.max(36, component.height + deltaHeight / scale);
    const snap = getSmartSnap(
      component,
      component.x,
      component.y,
      nextWidth,
      nextHeight,
    );
    setGuideLines(snap.guides);
    setSpacingGuides(
      getSpacingGuides(
        component,
        component.x,
        component.y,
        snap.width,
        snap.height,
      ),
    );
    setGuidePopupId(typeof component.props.popupId === "string" ? component.props.popupId : null);
    updateComponent(component.id, {
      width: snap.width,
      height: snap.height,
    });
    window.setTimeout(() => {
      setGuideLines([]);
      setSpacingGuides([]);
      setGuidePopupId(null);
    }, 450);
  }

  function addComponentToVisibleCenter(
    type: Parameters<typeof addComponentAt>[0],
  ) {
    const size =
      type === "divider"
        ? { width: 520, height: 140 }
        : type === "section"
          ? { width: 620, height: 320 }
          : type === "container"
            ? { width: 620, height: 220 }
            : type === "popup"
              ? { width: 320, height: 220 }
              : type === "text"
                ? { width: 360, height: 96 }
                : { width: 360, height: 140 };
    const canvas = document.getElementById("resume-canvas");
    const canvasTop = canvas?.getBoundingClientRect().top ?? 0;
    const visibleCenter = (window.innerHeight / 2 - canvasTop) / canvasScale;
    const x = Math.max(24, Math.round(420 - size.width / 2));
    const y = Math.max(88, Math.round(visibleCenter - size.height / 2));

    addComponentAt(type, { x, y });
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
        </div>
      </header>

      <div
        className={cn(
          "grid flex-1",
          mode === "edit"
            ? "grid-cols-[240px_minmax(0,1fr)_360px]"
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
                  onClick={() => addComponentToVisibleCenter(item.type)}
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

        <main ref={scrollAreaRef} className="min-w-0 overflow-auto p-6">
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
              className="relative mx-auto"
              style={{
                width: 840 * canvasScale,
                minHeight: canvasHeight * canvasScale,
              }}
            >
              <div
                id="resume-canvas"
                className="relative w-[840px] origin-top-left bg-white shadow-sm ring-1 ring-zinc-200"
                onPointerDown={handleCanvasPointerDown}
                style={{
                  minHeight: canvasHeight,
                  backgroundColor: canvasBackground,
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
                          style={{ top: layout.offset + 12, height: 44 }}
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
                    isCropEditing={activeCropEditingId === component.id}
                    onSelect={(event) => handleComponentSelect(component.id, event)}
                    onDelete={() => {
                      recordHistory();
                      removeComponents(getPopupRelatedIds([component.id]));
                      setSelectedComponentIds((ids) => ids.filter((id) => id !== component.id));
                    }}
                    onResize={(deltaWidth, deltaHeight) =>
                      resizeComponent(component, deltaWidth, deltaHeight)
                    }
                    onResizeStart={recordHistory}
                    onInlineTextChange={(content) =>
                      updateComponent(component.id, { content })
                    }
                    onOpenPopup={() => setOpenPopup(component.id)}
                    interactionScale={canvasScale}
                    onUpdate={(patch) => updateComponent(component.id, patch)}
                  />
                ))}
                {!guidePopupId ? (
                  <GuideOverlay guideLines={guideLines} spacingGuides={spacingGuides} />
                ) : null}
                {lasso ? <LassoOverlay lasso={lasso} /> : null}
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
                    updateComponent(id, { content })
                  }
                  onUpdateComponent={updateComponent}
                  guideLines={guidePopupId === popupComponent.id ? guideLines : []}
                  spacingGuides={guidePopupId === popupComponent.id ? spacingGuides : []}
                />
              ) : null}
            </div>
          </DndContext>
        </main>

        {mode === "edit" ? (
          <PropertyPanel
            components={components}
            selectedComponent={selectedComponent}
            onUpdate={updateComponent}
            onUpload={uploadMedia}
            project={editorProject}
            onSetNavigationMode={setNavigationMode}
            canvasBackground={canvasBackground}
            onUpdateCanvasBackground={updateCanvasBackground}
            isImageCropEditing={activeCropEditingId === selectedComponent?.id}
            onToggleImageCrop={(id) =>
              setCropEditingId((currentId) => (currentId === id ? null : id))
            }
            onDelete={(id) => {
              recordHistory();
              removeComponents(getPopupRelatedIds([id]));
              setSelectedComponentIds((ids) => ids.filter((selectedId) => selectedId !== id));
              selectComponent(null);
            }}
          />
        ) : null}
      </div>
      {editorProject.navigationMode === "scroll" &&
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

function CanvasComponent({
  component,
  displayTop,
  preview,
  isSelected,
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
  isCropEditing: boolean;
  onSelect: (event?: ReactMouseEvent<HTMLDivElement>) => void;
  onDelete: () => void;
  onResize: (deltaWidth: number, deltaHeight: number) => void;
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
  const [textDraft, setTextDraft] = useState(component.content ?? "");
  const textStyle = getTextStyle(component);
  const borderRadius = Number(component.props.borderRadius ?? 6);

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
  function handleResizeStart(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    onResizeStart();

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

  function handleCropStart(
    event: ReactPointerEvent<HTMLButtonElement>,
    corner: "topLeft" | "topRight" | "bottomLeft" | "bottomRight",
  ) {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startY = event.clientY;
    const initialComponent = { ...component };
    const initialMedia = {
      width: Number(component.props.mediaWidth ?? component.width),
      height: Number(component.props.mediaHeight ?? component.height),
      offsetX: Number(component.props.mediaOffsetX ?? 0),
      offsetY: Number(component.props.mediaOffsetY ?? 0),
    };
    const minSize = 32;

    function handlePointerMove(pointerEvent: PointerEvent) {
      const deltaX = (pointerEvent.clientX - startX) / interactionScale;
      const deltaY = (pointerEvent.clientY - startY) / interactionScale;
      const next = {
        x: initialComponent.x,
        y: initialComponent.y,
        width: initialComponent.width,
        height: initialComponent.height,
        mediaOffsetX: initialMedia.offsetX,
        mediaOffsetY: initialMedia.offsetY,
      };

      if (corner.includes("top")) {
        const limitedDelta = clamp(
          deltaY,
          Math.max(-initialComponent.y, initialMedia.offsetY),
          initialComponent.height - minSize,
        );
        next.y = Math.round(initialComponent.y + limitedDelta);
        next.height = Math.round(initialComponent.height - limitedDelta);
        next.mediaOffsetY = Math.round(initialMedia.offsetY - limitedDelta);
      }
      if (corner.includes("bottom")) {
        next.height = Math.round(
          clamp(
            initialComponent.height + deltaY,
            minSize,
            initialMedia.height + initialMedia.offsetY,
          ),
        );
      }
      if (corner.includes("Left")) {
        const limitedDelta = clamp(
          deltaX,
          Math.max(-initialComponent.x, initialMedia.offsetX),
          initialComponent.width - minSize,
        );
        next.x = Math.round(initialComponent.x + limitedDelta);
        next.width = Math.round(initialComponent.width - limitedDelta);
        next.mediaOffsetX = Math.round(initialMedia.offsetX - limitedDelta);
      }
      if (corner.includes("Right")) {
        next.width = Math.round(
          clamp(
            initialComponent.width + deltaX,
            minSize,
            initialMedia.width + initialMedia.offsetX,
          ),
        );
      }

      onUpdate({
        x: next.x,
        y: next.y,
        width: next.width,
        height: next.height,
        props: {
          ...component.props,
          cropTop: 0,
          cropRight: 0,
          cropBottom: 0,
          cropLeft: 0,
          mediaWidth: initialMedia.width,
          mediaHeight: initialMedia.height,
          mediaOffsetX: next.mediaOffsetX,
          mediaOffsetY: next.mediaOffsetY,
        },
      });
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
          className="h-full w-full p-3"
          style={{
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
          <textarea
            readOnly={preview}
            value={textDraft}
            onPointerDown={(event) => {
              if (!preview) {
                event.stopPropagation();
                onSelect();
              }
            }}
            onChange={(event) => setTextDraft(event.target.value)}
            onBlur={() => {
              if (textDraft !== (component.content ?? "")) {
                onInlineTextChange(textDraft);
              }
            }}
            className="h-full w-full resize-none overflow-hidden whitespace-pre-wrap border-0 bg-transparent p-0 text-zinc-900 outline-none"
            style={textStyle}
          />
        </div>
      ) : component.type === "divider" ? (
        <div className="flex h-full w-full items-center justify-center">
          <span style={getDividerStyle(component)} />
        </div>
      ) : component.type === "image" && component.content ? (
        <div
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
            }}
          />
          {!preview && isCropEditing ? (
            <>
              {(["topLeft", "topRight", "bottomLeft", "bottomRight"] as const).map((corner) => (
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
                        ? 0
                        : undefined,
                    right:
                      corner === "topRight" || corner === "bottomRight"
                        ? 0
                        : undefined,
                    top:
                      corner === "topLeft" || corner === "topRight"
                        ? 0
                        : undefined,
                    bottom:
                      corner === "bottomLeft" || corner === "bottomRight"
                        ? 0
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
          className="flex h-full w-full items-center justify-center border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 underline-offset-4"
          style={{
            ...textStyle,
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
          {component.content ?? "링크"}
        </div>
      ) : component.type === "link" ? (
        <a
          href={String(component.props.href ?? "#")}
          target="_blank"
          rel="noreferrer"
          className="flex h-full w-full items-center justify-center border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 underline-offset-4 hover:underline"
          style={{
            ...textStyle,
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
          {component.content ?? "링크"}
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
          >
            {component.content ?? "Popup title"}
          </span>
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
              ? normalizeAnchor(component.content ?? component.id)
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
        >
          {component.content}
        </div>
      ) : (
        <div
          className="flex h-full w-full items-center justify-center bg-zinc-100 text-sm font-medium text-zinc-500"
          style={{ borderRadius }}
        >
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
    deltaWidth: number,
    deltaHeight: number,
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

  return (
    <div
      className="fixed inset-x-3 top-20 z-[70] mx-auto max-h-[78vh] w-[calc(100vw-1.5rem)] max-w-[840px] overflow-hidden rounded-lg border border-zinc-200 shadow-2xl sm:inset-x-6 sm:w-[calc(100vw-3rem)]"
      style={{ backgroundColor: popupWindowBackground }}
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
              isCropEditing={false}
              onSelect={(event) => {
                event?.stopPropagation();
                onSelect(component.id);
              }}
              onDelete={() => onDelete(component.id)}
              onResize={(deltaWidth, deltaHeight) =>
                onResize(component, deltaWidth, deltaHeight)
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
          <GuideOverlay guideLines={guideLines} spacingGuides={spacingGuides} />
        </div>
      </div>
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
  onUpdateCanvasBackground,
  isImageCropEditing,
  onToggleImageCrop,
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
  onUpdateCanvasBackground: (color: string) => void;
  isImageCropEditing: boolean;
  onToggleImageCrop: (id: string) => void;
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
        <label className="grid min-w-0 gap-1">
          <span className="text-zinc-500">Canvas Background</span>
          <input
            type="color"
            value={canvasBackground}
            onChange={(event) => onUpdateCanvasBackground(event.target.value)}
            className="h-9 w-full rounded-md border border-zinc-200"
          />
        </label>
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
                onClick={() => onDelete(selectedComponent.id)}
                className="inline-flex size-9 items-center justify-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="size-4" />
              </button>
            </div>

            {selectedComponent.type === "text" ? (
              <div className="rounded-md bg-zinc-50 p-3 text-xs leading-5 text-zinc-500">
                텍스트 내용은 캔버스 안의 텍스트 박스를 직접 클릭해서
                수정합니다.
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
                      <img src={icon.src} alt="" className="size-7 object-contain" />
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
                    value={String(selectedComponent.props.objectFit ?? "contain")}
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
                    {isImageCropEditing ? "이미지 자르기 종료" : "이미지 자르기"}
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
                  <div className={cn("grid gap-2", selectedComponent.type !== "icon" && "grid-cols-2")}>
                    <label className="grid gap-1">
                      <span className="text-zinc-500">
                        {selectedComponent.type === "icon" ? "Icon Color" : "Text Color"}
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
                      value={String(selectedComponent.props.orientation ?? "horizontal")}
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
                      value={String(selectedComponent.props.lineStyle ?? "solid")}
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
                      value={String(selectedComponent.props.thickness ?? "thin")}
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
                        selectedComponent.props.backgroundColor ??
                        "#ffffff",
                      backgroundOpacity: clamp(value, 0, 100),
                    },
                  })
                }
              />
            ) : null}
            {selectedComponent.type === "section" ||
            selectedComponent.type === "container" ||
            selectedComponent.type === "text" ||
            selectedComponent.type === "image" ||
            selectedComponent.type === "video" ||
            selectedComponent.type === "icon" ||
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
