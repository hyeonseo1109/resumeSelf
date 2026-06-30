import { notFound } from "next/navigation";
import { getProjectBySlug } from "@/server/projects";

export default async function PublicSitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  const components = project.pages[0]?.sections[0]?.components ?? [];

  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
        <strong>{project.title}</strong>
        <nav className="flex flex-wrap justify-end gap-2">
          {project.navigation.map((item) => (
            <a key={item.id} href={project.navigationMode === "scroll" ? `#${item.target}` : `/${item.target}`} className="rounded-md px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50">
              {item.label}
            </a>
          ))}
        </nav>
      </header>
      <section id="resume" className="relative mx-auto min-h-[860px] w-full max-w-5xl px-4">
        {components.map((component) => (
          <div
            key={component.id}
            className="absolute rounded-md"
            style={{
              left: component.x,
              top: component.y,
              width: component.width,
              height: component.height,
            }}
          >
            {component.type === "text" ? (
              <div className="h-full w-full p-2" style={component.props}>
                {component.content}
              </div>
            ) : component.type === "divider" ? (
              <div className="mt-4 border-t border-zinc-300" />
            ) : (
              <div className="flex h-full items-center justify-center bg-zinc-100 text-sm text-zinc-500">{component.type}</div>
            )}
          </div>
        ))}
      </section>
    </main>
  );
}

