import type { CSSProperties } from "react";
import type { ResumeComponent, ResumePage, ResumeProject } from "@/types/project";

export function PublicProjectRenderer({
  project,
  page,
}: {
  project: ResumeProject;
  page: ResumePage;
}) {
  const isScrollMode = project.navigationMode === "scroll";
  const pageLayouts = getPageLayouts(isScrollMode ? project.pages : [page]);
  const components = pageLayouts.flatMap((layout) =>
    layout.components.map((component) => ({
      component,
      displayTop: component.y + layout.offset + (isScrollMode ? 44 : 0),
    })),
  );
  const canvasHeight = Math.max(860, pageLayouts.at(-1) ? pageLayouts.at(-1)!.offset + pageLayouts.at(-1)!.height : 860);

  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
        <a href={isScrollMode ? "#" : `/${project.slug}`} className="font-semibold hover:text-emerald-700">
          {project.title}
        </a>
        {isScrollMode ? (
          <span className="text-xs font-medium text-zinc-400">Contents</span>
        ) : (
          <nav className="flex flex-wrap justify-end gap-2">
          {project.navigation.map((item) => (
            <a
              key={item.id}
              href={`/${project.slug}/${item.target}`}
              className="rounded-md px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
            >
              {item.label}
            </a>
          ))}
        </nav>
        )}
      </header>
      <section className="relative mx-auto w-full max-w-5xl px-4" style={{ minHeight: canvasHeight }}>
        {isScrollMode
          ? pageLayouts.map((layout) => {
              const navItem = project.navigation.find((item) => item.target === layout.page.slug);
              const target = navItem?.target ?? layout.page.slug;
              const label = navItem?.label ?? layout.page.title;

              return (
                <div
                  key={layout.page.id}
                  id={target}
                  className="absolute left-0 w-full scroll-mt-6 px-12 pt-4"
                  style={{ top: layout.offset + 12, height: 44 }}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">{label}</p>
                </div>
              );
            })
          : null}
        {components.map(({ component, displayTop }) => (
          <PublicComponent key={component.id} component={component} displayTop={displayTop} />
        ))}
      </section>
      {isScrollMode && project.navigation.length > 0 ? <PublicToc navigation={project.navigation} /> : null}
    </main>
  );
}

function PublicComponent({ component, displayTop }: { component: ResumeComponent; displayTop: number }) {
  return (
    <div
      className="absolute rounded-md"
      style={{
        left: component.x,
        top: displayTop,
        width: component.width,
        height: component.height,
      }}
    >
      {component.type === "text" ? (
        <div className="h-full w-full p-2" style={component.props as CSSProperties}>
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
            objectFit: String(component.props.objectFit ?? "cover") as CSSProperties["objectFit"],
            objectPosition: `${Number(component.props.objectPositionX ?? 50)}% ${Number(component.props.objectPositionY ?? 50)}%`,
          }}
        />
      ) : component.type === "video" && component.content ? (
        <video
          src={component.content}
          className="h-full w-full rounded-md"
          controls
          style={{
            objectFit: String(component.props.objectFit ?? "cover") as CSSProperties["objectFit"],
            objectPosition: `${Number(component.props.objectPositionX ?? 50)}% ${Number(component.props.objectPositionY ?? 50)}%`,
          }}
        />
      ) : component.type === "button" ? (
        <button type="button" className="h-full w-full rounded-md bg-zinc-950 px-4 text-sm font-medium text-white">
          {component.content ?? "버튼"}
        </button>
      ) : component.type === "link" ? (
        <a
          href={String(component.props.href ?? "#")}
          target="_blank"
          rel="noreferrer"
          className="flex h-full w-full items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 underline-offset-4 hover:underline"
        >
          {component.content ?? "링크"}
        </a>
      ) : component.type === "section" || component.type === "container" ? (
        <div
          id={component.type === "section" ? normalizeAnchor(component.content ?? component.id) : undefined}
          className="flex h-full w-full items-start rounded-md border border-dashed p-3 text-sm font-medium text-zinc-600"
          style={{
            backgroundColor: String(component.props.backgroundColor ?? "#f8fafc"),
            borderColor: String(component.props.borderColor ?? "#d4d4d8"),
          }}
        >
          {component.content}
        </div>
      ) : (
        <div className="flex h-full items-center justify-center bg-zinc-100 text-sm text-zinc-500">{component.type}</div>
      )}
    </div>
  );
}

function PublicToc({ navigation }: { navigation: ResumeProject["navigation"] }) {
  return (
    <aside className="fixed right-2 top-1/2 z-40 w-28 -translate-y-1/2 p-2 text-right sm:right-4 sm:w-36 lg:left-[calc(50%+450px)] lg:right-auto lg:w-44">
      <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-300">Contents</p>
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

function getPageLayouts(pages: ResumePage[]) {
  let offset = 0;

  return pages.map((page) => {
    const components = (page.sections[0]?.components ?? []).filter(
      (component) => !(component.type === "section" && component.props.sectionFrame === true),
    );
    const height = Math.max(240, ...components.map((component) => component.y + component.height + 72));
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
