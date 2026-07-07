import { notFound } from "next/navigation";
import { PublicProjectRenderer } from "@/components/site/public-project-renderer";
import { getPublicProjectBySlug } from "@/server/projects";

export const revalidate = 15;

export default async function PublicNestedPage({
  params,
}: {
  params: Promise<{ slug: string; pageSlug: string }>;
}) {
  const { slug, pageSlug } = await params;
  const project = await getPublicProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  const page = project.pages.find((item) => item.slug === pageSlug);

  if (!page) {
    notFound();
  }

  return <PublicProjectRenderer project={project} page={page} />;
}
