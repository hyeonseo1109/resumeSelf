import type { ResumeComponent, ResumePage } from "@/types/project";
import type { MobileComponentNode, PageLayout, RenderedComponent } from "./types";

export const PUBLIC_CANVAS_WIDTH = 840;

export function getPageLayouts(pages: ResumePage[]): PageLayout[] {
  let offset = 0;

  return pages.map((page) => {
    const components = (page.sections[0]?.components ?? []).filter(
      (component) =>
        !(component.type === "section" && component.props.sectionFrame === true),
    );
    const height = Math.max(
      240,
      ...components.map((component) => component.y + component.height + 72),
    );
    const layout = { page, components, offset, height };
    offset += height + 16;
    return layout;
  });
}

export function getCanvasHeight(pageLayouts: PageLayout[]) {
  const lastLayout = pageLayouts.at(-1);
  return Math.max(860, lastLayout ? lastLayout.offset + lastLayout.height : 860);
}

export function getRenderedComponents(pageLayouts: PageLayout[], isScrollMode: boolean): RenderedComponent[] {
  return pageLayouts
    .flatMap((layout) =>
      layout.components.map((component) => ({
        component,
        displayTop: component.y + layout.offset + (isScrollMode ? 44 : 0),
      })),
    )
    .filter(({ component }) => !component.props.popupId);
}

export function buildMobileComponentTree(components: ResumeComponent[]) {
  const nodes = new Map<string, MobileComponentNode>(
    components.map((component) => [component.id, { component, children: [] }]),
  );
  const parentByChildId = new Map<string, string>();
  const frames = components.filter(isFrameComponent);

  for (const component of components) {
    if (isFrameComponent(component)) {
      continue;
    }

    const parent = frames
      .filter((frame) => containsComponent(frame, component))
      .sort((a, b) => a.width * a.height - b.width * b.height)[0];

    if (parent) {
      parentByChildId.set(component.id, parent.id);
    }
  }

  for (const frame of frames) {
    const parent = frames
      .filter((candidate) => candidate.id !== frame.id && containsComponent(candidate, frame))
      .sort((a, b) => a.width * a.height - b.width * b.height)[0];

    if (parent) {
      parentByChildId.set(frame.id, parent.id);
    }
  }

  const roots: MobileComponentNode[] = [];

  for (const component of components) {
    const node = nodes.get(component.id);
    if (!node) {
      continue;
    }

    const parentId = parentByChildId.get(component.id);
    const parentNode = parentId ? nodes.get(parentId) : null;

    if (parentNode) {
      parentNode.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return sortMobileNodes(roots);
}

export function getMobileComponentHeight(component: ResumeComponent) {
  if (component.type === "divider") {
    return 28;
  }

  if (component.type === "button" || component.type === "link") {
    return 52;
  }

  if (component.type === "icon") {
    return 72;
  }

  if (component.type === "text") {
    const contentLength = String(component.content ?? "").length;
    const estimatedLines = Math.max(3, Math.ceil(contentLength / 24));
    return Math.max(
      96,
      Math.min(520, Math.max(component.height, estimatedLines * 24 + 32)),
    );
  }

  if (component.type === "image" || component.type === "video") {
    const ratio = component.height / Math.max(component.width, 1);
    return Math.max(180, Math.min(420, Math.round(488 * ratio)));
  }

  if (component.type === "popup") {
    return component.props.thumbnailUrl ? 220 : 112;
  }

  if (component.type === "section" || component.type === "container") {
    return Math.max(96, Math.min(260, Math.round(component.height * 0.72)));
  }

  return Math.max(80, Math.min(260, component.height));
}

export function normalizeAnchor(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function sortMobileNodes(items: MobileComponentNode[]) {
  items.sort((a, b) => {
    if (Math.abs(a.component.y - b.component.y) > 12) {
      return a.component.y - b.component.y;
    }

    return a.component.x - b.component.x;
  });
  items.forEach((item) => sortMobileNodes(item.children));
  return items;
}

function isFrameComponent(component: ResumeComponent) {
  return component.type === "section" || component.type === "container";
}

function containsComponent(parent: ResumeComponent, child: ResumeComponent) {
  return (
    child.id !== parent.id &&
    child.x >= parent.x &&
    child.y >= parent.y &&
    child.x + child.width <= parent.x + parent.width &&
    child.y + child.height <= parent.y + parent.height
  );
}
