import type { ResumeComponent, ResumeProject } from "@/types/project";
import {
  FONT_OPTIONS,
  PDF_PAGE_WIDTH,
  getComponentLayer,
  withAlpha,
} from "./view-helpers";

export function createPdfExportNode({
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
  wrapper.style.width = `${PDF_PAGE_WIDTH}px`;
  wrapper.style.height = `${canvasHeight}px`;
  wrapper.style.minHeight = `${canvasHeight}px`;
  wrapper.style.zIndex = "2147483647";
  wrapper.style.pointerEvents = "none";
  wrapper.style.fontFamily = "Arial, Helvetica, sans-serif";

  const canvas = document.createElement("div");
  canvas.style.position = "relative";
  canvas.style.width = `${PDF_PAGE_WIDTH}px`;
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
          components: (activePage?.sections[0]?.components ?? []).filter(
            (component) => !component.props.popupId,
          ),
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

    layout.components
      .filter((component) => !component.props.popupId)
      .sort((a, b) => getComponentLayer(a) - getComponentLayer(b))
      .forEach((component) => {
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

export async function waitForPdfNode(root: HTMLElement) {
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
  frame.style.fontFamily = String(
    component.props.fontFamily ?? FONT_OPTIONS[0].value,
  );

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

  if (component.type === "popup") {
    frame.style.border = "1px solid #e4e4e7";
    frame.style.background = String(component.props.backgroundColor ?? "#ffffff");

    const thumbnailUrl = String(component.props.thumbnailUrl ?? "");
    if (thumbnailUrl) {
      const image = document.createElement("img");
      image.src = thumbnailUrl;
      image.crossOrigin = "anonymous";
      image.style.width = "100%";
      image.style.height = "60%";
      image.style.objectFit = "cover";
      frame.appendChild(image);
    }

    const title = document.createElement("div");
    title.style.padding = "12px 12px 4px";
    title.style.fontSize = `${Number(component.props.fontSize ?? 15)}px`;
    title.style.fontWeight = String(component.props.fontWeight ?? 700);
    title.textContent = component.content ?? "Popup title";
    frame.appendChild(title);

    const description = document.createElement("div");
    description.style.padding = "0 12px 12px";
    description.style.fontSize = "12px";
    description.style.lineHeight = "1.5";
    description.style.color = "#71717a";
    description.textContent = String(component.props.description ?? "");
    frame.appendChild(description);
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
    frame.style.border = `1px ${String(component.props.borderStyle ?? "dashed")} ${String(component.props.borderColor ?? "#d4d4d8")}`;
    frame.style.background = withAlpha(
      String(component.props.backgroundColor ?? "#f8fafc"),
      Number(component.props.backgroundOpacity ?? 100),
    );
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
