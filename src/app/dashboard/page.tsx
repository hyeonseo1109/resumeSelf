import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { ProjectList } from "@/components/dashboard/project-list";
import { TopNav } from "@/components/layout/top-nav";
import { getSubscriptionTier, projectLimits } from "@/config/plans";
import { getCurrentUser, listProjects } from "@/server/projects";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const tier = getSubscriptionTier(user?.email);
  const projects = user ? await listProjects(user.id) : [];

  return (
    <div className="min-h-screen bg-zinc-50">
      <TopNav />
      <main className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6">
        {!user ? (
          <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <h1 className="text-xl font-semibold text-zinc-950">로그인이 필요합니다</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Supabase 환경 변수를 설정한 뒤 Google 또는 Github OAuth로 로그인하면 프로젝트가 계정에 저장됩니다.
            </p>
            <OAuthButtons className="mt-5 max-w-sm" />
          </section>
        ) : null}
        <ProjectList projects={projects} tier={tier} limit={projectLimits[tier]} canEdit={Boolean(user)} />
      </main>
    </div>
  );
}
