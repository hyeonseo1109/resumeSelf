"use client";

import dynamic from "next/dynamic";
import type { ResumeProject } from "@/types/project";

const EditorShell = dynamic(
  () => import("./editor-shell").then((module) => module.EditorShell),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm font-medium text-zinc-500">
        에디터를 불러오는 중...
      </div>
    ),
  },
);

export function EditorShellLoader({ project }: { project: ResumeProject }) {
  return <EditorShell project={project} />;
}
