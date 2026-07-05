"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type {
  ResumeComponent,
  ResumePage,
  ResumeProject,
} from "@/types/project";

interface MobileComponentNode {
  component: ResumeComponent;
  children: MobileComponentNode[];
}

export function PublicProjectRenderer({
  project,
  page,
}: {
  project: ResumeProject;
  page: ResumePage;
}) {
  const isScrollMode = project.navigationMode === "scroll";
  const [openPopupId, setOpenPopupId] = useState<string | null>(null);
  const [viewportWidth, setViewportWidth] = useState(840);
  const pageLayouts = getPageLayouts(isScrollMode ? project.pages : [page]);
  const components = pageLayouts
    .flatMap((layout) =>
      layout.components.map((component) => ({
        component,
        displayTop: component.y + layout.offset + (isScrollMode ? 44 : 0),
      })),
    )
    .filter(({ component }) => !component.props.popupId);
  const allComponents = pageLayouts.flatMap((layout) => layout.components);
  const openPopup = allComponents.find(
    (component) => component.id === openPopupId && component.type === "popup",
  );
  const popupChildren = openPopupId
    ? allComponents.filter(
        (component) => component.props.popupId === openPopupId,
      )
    : [];
  const canvasHeight = Math.max(
    860,
    pageLayouts.at(-1)
      ? pageLayouts.at(-1)!.offset + pageLayouts.at(-1)!.height
      : 860,
  );
  const canvasScale = Math.min(1, Math.max(0.25, (viewportWidth - 24) / 840));
  const useMobileReflow = viewportWidth < 640;

  useEffect(() => {
    const update = () => setViewportWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

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
      {useMobileReflow ? (
        <MobileProjectView
          project={project}
          pageLayouts={pageLayouts}
          isScrollMode={isScrollMode}
          onOpenPopup={setOpenPopupId}
        />
      ) : (
        <section
          className="relative mx-auto px-0"
          style={{
            width: 840 * canvasScale,
            minHeight: canvasHeight * canvasScale,
          }}
        >
          <div
            className="relative origin-top-left"
            style={{
              width: 840,
              minHeight: canvasHeight,
              transform: `scale(${canvasScale})`,
            }}
          >
            {isScrollMode
              ? pageLayouts.map((layout) => {
                  const navItem = project.navigation.find(
                    (item) => item.target === layout.page.slug,
                  );
                  const target = navItem?.target ?? layout.page.slug;
                  const label = navItem?.label ?? layout.page.title;

                  return (
                    <div
                      key={layout.page.id}
                      id={target}
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
            {components.map(({ component, displayTop }) => (
              <PublicComponent
                key={component.id}
                component={component}
                displayTop={displayTop}
                onOpenPopup={() => setOpenPopupId(component.id)}
              />
            ))}
          </div>
        </section>
      )}
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

function PublicComponent({
  component,
  displayTop,
  mobile = false,
  onOpenPopup,
}: {
  component: ResumeComponent;
  displayTop: number;
  mobile?: boolean;
  onOpenPopup?: () => void;
}) {
  const mobileHeight = getMobileComponentHeight(component);

  return (
    <div
      className={mobile ? "relative rounded-md" : "absolute rounded-md"}
      style={
        mobile
          ? {
              width: "100%",
              height: mobileHeight,
            }
          : {
              left: component.x,
              top: displayTop,
              width: component.width,
              height: component.height,
            }
      }
    >
      {component.type === "text" ? (
        <div
          className="h-full w-full p-2 whitespace-pre-wrap wrap-break-words"
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
          controls
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
          style={{
            backgroundColor: String(
              component.props.backgroundColor ?? "#09090b",
            ),
            color: String(component.props.color ?? "#ffffff"),
          }}
        >
          {component.content ?? "버튼"}
        </button>
      ) : component.type === "link" ? (
        <a
          href={String(component.props.href ?? "#")}
          target="_blank"
          rel="noreferrer"
          className="flex h-full w-full items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 underline-offset-4 hover:underline"
          style={{
            backgroundColor: String(
              component.props.backgroundColor ?? "#ffffff",
            ),
            color: String(component.props.color ?? "#18181b"),
          }}
        >
          {component.content ?? "링크"}
        </a>
      ) : component.type === "popup" ? (
        <button
          type="button"
          onClick={onOpenPopup}
          className="flex h-full w-full flex-col overflow-hidden rounded-md border border-zinc-200 bg-white text-left shadow-sm"
          style={{
            backgroundColor: String(
              component.props.backgroundColor ?? "#ffffff",
            ),
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
            className={`px-3 text-sm font-semibold text-zinc-950 ${component.props.thumbnailUrl ? "pt-3" : "pt-4"}`}
          >
            {component.content ?? "Popup title"}
          </span>
          <span className="line-clamp-2 px-3 pb-3 pt-1 text-xs leading-5 text-zinc-500">
            {String(component.props.description ?? "")}
          </span>
        </button>
      ) : component.type === "section" || component.type === "container" ? (
        <div
          id={
            component.type === "section"
              ? normalizeAnchor(component.content ?? component.id)
              : undefined
          }
          className="flex h-full w-full items-start rounded-md border border-dashed p-3 text-sm font-medium text-zinc-600"
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
        <div className="flex h-full items-center justify-center bg-zinc-100 text-sm text-zinc-500">
          {component.type}
        </div>
      )}
    </div>
  );
}

function PublicPopupOverlay({
  popup,
  components,
  onClose,
}: {
  popup: ResumeComponent;
  components: ResumeComponent[];
  onClose: () => void;
}) {
  const overlayHeight = Math.max(
    560,
    ...components.map((component) => component.y + component.height + 120),
  );

  return (
    <div className="fixed inset-x-3 top-20 z-50 mx-auto max-h-[78vh] w-[calc(100vw-1.5rem)] max-w-[840px] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-2xl sm:inset-x-6 sm:w-[calc(100vw-3rem)]">
      <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-zinc-100 bg-white px-5">
        <div>
          <p className="text-sm font-semibold">
            {popup.content ?? "Popup title"}
          </p>
          <p className="text-xs text-zinc-500">
            {String(popup.props.description ?? "")}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex size-8 items-center justify-center rounded-md hover:bg-zinc-100"
        >
          ×
        </button>
      </div>
      <div
        className="relative overflow-y-auto"
        style={{ height: "calc(78vh - 56px)" }}
      >
        <div
          className="relative hidden sm:block"
          style={{ minHeight: overlayHeight }}
        >
          {components.map((component) => (
            <PublicComponent
              key={component.id}
              component={component}
              displayTop={component.y}
            />
          ))}
        </div>
        <div className="grid gap-3 p-4 sm:hidden">
          {buildMobileComponentTree(components).map((node) => (
            <MobileComponentBlock key={node.component.id} node={node} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileProjectView({
  project,
  pageLayouts,
  isScrollMode,
  onOpenPopup,
}: {
  project: ResumeProject;
  pageLayouts: ReturnType<typeof getPageLayouts>;
  isScrollMode: boolean;
  onOpenPopup: (id: string) => void;
}) {
  return (
    <section className="mx-auto grid w-full max-w-[520px] gap-8 px-4 pb-10">
      {pageLayouts.map((layout) => {
        const navItem = project.navigation.find(
          (item) => item.target === layout.page.slug,
        );
        const target = navItem?.target ?? layout.page.slug;
        const label = navItem?.label ?? layout.page.title;
        const componentTree = buildMobileComponentTree(
          layout.components.filter((component) => !component.props.popupId),
        );

        return (
          <div
            key={layout.page.id}
            id={isScrollMode ? target : undefined}
            className="grid scroll-mt-20 gap-3"
          >
            {isScrollMode ? (
              <p className="pt-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                {label}
              </p>
            ) : null}
            {componentTree.map((node) => (
              <MobileComponentBlock
                key={node.component.id}
                node={node}
                onOpenPopup={onOpenPopup}
              />
            ))}
          </div>
        );
      })}
    </section>
  );
}

function MobileComponentBlock({
  node,
  onOpenPopup,
}: {
  node: MobileComponentNode;
  onOpenPopup?: (id: string) => void;
}) {
  const { component, children } = node;

  if (component.type === "section" || component.type === "container") {
    return (
      <div
        className="grid w-full gap-3 rounded-md border p-3"
        style={{
          backgroundColor: String(component.props.backgroundColor ?? "#f8fafc"),
          borderColor: String(component.props.borderColor ?? "#d4d4d8"),
          borderStyle: String(
            component.props.borderStyle ?? "dashed",
          ) as CSSProperties["borderStyle"],
          minHeight:
            children.length > 0
              ? undefined
              : getMobileComponentHeight(component),
        }}
      >
        {component.content ? (
          <p className="text-sm font-semibold text-zinc-600">
            {component.content}
          </p>
        ) : null}
        {children.map((child) => (
          <MobileComponentBlock
            key={child.component.id}
            node={child}
            onOpenPopup={onOpenPopup}
          />
        ))}
      </div>
    );
  }

  return (
    <PublicComponent
      component={component}
      displayTop={0}
      mobile
      onOpenPopup={() => onOpenPopup?.(component.id)}
    />
  );
}

function PublicToc({
  navigation,
}: {
  navigation: ResumeProject["navigation"];
}) {
  return (
    <aside className="fixed right-2 top-1/2 z-40 w-28 -translate-y-1/2 p-2 text-right sm:right-4 sm:w-36 lg:left-[calc(50%+450px)] lg:right-auto lg:w-44">
      <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-300">
        Contents
      </p>
      <div className="grid gap-1">
        {navigation.map((item) => (
          <a
            key={item.id}
            href={`#${item.target}`}
            className="rounded-md px-2 py-1.5 text-right text-xs font-medium text-zinc-400 transition hover:text-base hover:font-semibold hover:text-zinc-950"
          >
            {item.label}
          </a>
        ))}
      </div>
    </aside>
  );
}

function buildMobileComponentTree(components: ResumeComponent[]) {
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
      .filter(
        (candidate) =>
          candidate.id !== frame.id && containsComponent(candidate, frame),
      )
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

  const sortNodes = (items: MobileComponentNode[]) => {
    items.sort((a, b) => {
      if (Math.abs(a.component.y - b.component.y) > 12) {
        return a.component.y - b.component.y;
      }

      return a.component.x - b.component.x;
    });
    items.forEach((item) => sortNodes(item.children));
    return items;
  };

  return sortNodes(roots);
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

function getMobileComponentHeight(component: ResumeComponent) {
  if (component.type === "divider") {
    return 28;
  }

  if (component.type === "button" || component.type === "link") {
    return 52;
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

function getPageLayouts(pages: ResumePage[]) {
  let offset = 0;

  return pages.map((page) => {
    const components = (page.sections[0]?.components ?? []).filter(
      (component) =>
        !(
          component.type === "section" && component.props.sectionFrame === true
        ),
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

function normalizeAnchor(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
