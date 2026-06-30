import { notFound, redirect } from "next/navigation";
import { EditorShell } from "@/components/editor/editor-shell";
import { getCurrentUser, getProjectById } from "@/server/projects";

export default async function EditorPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/dashboard");
  }

  const project = await getProjectById(projectId, user.id);

  if (!project) {
    notFound();
  }

  return <EditorShell project={project} />;
}
