import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicProjectRenderer } from "@/components/site/public-project-renderer";
import { TemplateUseForm } from "@/components/site/template-use-form";
import { getCurrentUser, getPublicProjectBySlug } from "@/server/projects";
import { useSharedTemplateAction } from "./actions";

export const revalidate = 300;

const errorMessages: Record<string, string> = {
  "login-required": "로그인 후 내 프로젝트로 가져올 수 있습니다.",
  "project-limit": "현재 플랜의 프로젝트 생성 한도에 도달했습니다.",
  "template-not-found": "템플릿을 찾을 수 없습니다.",
  "template-copy-failed": "템플릿을 가져오지 못했습니다. 잠시 후 다시 시도해주세요.",
  "supabase-not-configured": "Supabase 연결 정보가 필요합니다.",
};

export default async function SharedTemplatePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const { error } = await searchParams;
  const [project, user] = await Promise.all([
    getPublicProjectBySlug(slug),
    getCurrentUser(),
  ]);

  if (!project) {
    notFound();
  }

  const page = project.pages[0];

  if (!page) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">
              Shared Template
            </p>
            <h1 className="truncate text-base font-semibold">{project.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            {error ? (
              <p className="text-sm text-red-600">
                {errorMessages[error] ?? error}
              </p>
            ) : null}
            {user ? (
              <TemplateUseForm
                action={useSharedTemplateAction}
                slug={project.slug}
              />
            ) : (
              <Link
                href={`/?next=${encodeURIComponent(`/templates/${project.slug}`)}`}
                className="inline-flex h-10 w-40 items-center justify-center rounded-md bg-zinc-950 px-3 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                로그인하고 사용
              </Link>
            )}
          </div>
        </div>
      </header>
      <PublicProjectRenderer project={project} page={page} showHeader={false} />
    </div>
  );
}
