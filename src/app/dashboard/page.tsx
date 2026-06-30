import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { ProjectList } from "@/components/dashboard/project-list";
import { TopNav } from "@/components/layout/top-nav";
import { getSubscriptionTier, projectLimits } from "@/config/plans";
import { createProjectAction } from "@/app/dashboard/actions";
import { getCurrentUser, listProjects } from "@/server/projects";

const errorMessages: Record<string, string> = {
  "supabase-not-configured": "Supabase 환경 변수가 설정되지 않았습니다.",
  "login-required": "프로젝트를 만들려면 Google 로그인이 필요합니다.",
  "missing-title": "프로젝트 이름을 입력해주세요.",
  "project-limit": "현재 플랜의 프로젝트 생성 한도에 도달했습니다.",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const user = await getCurrentUser();
  const tier = getSubscriptionTier(user?.email);
  const projects = user ? await listProjects(user.id) : [];
  const errorMessage = error ? (errorMessages[error] ?? decodeURIComponent(error)) : null;

  return (
    <div className="min-h-screen bg-zinc-50">
      <TopNav />
      <main className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6">
        {errorMessage ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}
        {!user ? (
          <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <h1 className="text-xl font-semibold text-zinc-950">로그인이 필요합니다</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Google OAuth로 로그인하면 프로젝트가 계정에 저장됩니다.
            </p>
            <OAuthButtons className="mt-5 max-w-sm" />
          </section>
        ) : null}
        <ProjectList
          projects={projects}
          tier={tier}
          limit={projectLimits[tier]}
          canEdit={Boolean(user)}
          createAction={createProjectAction}
        />
      </main>
    </div>
  );
}
