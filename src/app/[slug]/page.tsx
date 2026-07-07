import { notFound } from "next/navigation";
import { PublicProjectRenderer } from "@/components/site/public-project-renderer";
import { getPublicProjectBySlug } from "@/server/projects";

export const revalidate = 15;

export default async function PublicSitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getPublicProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  const page = project.pages[0];

  if (!page) {
    notFound();
  }

  return <PublicProjectRenderer project={project} page={page} />;
}
