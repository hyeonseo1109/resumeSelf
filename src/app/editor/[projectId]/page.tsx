import { notFound, redirect } from "next/navigation";
import { EditorShellLoader } from "@/components/editor/editor-shell-loader";
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

  return <EditorShellLoader project={project} />;
}
