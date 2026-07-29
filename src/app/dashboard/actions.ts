"use server";

import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { getSubscriptionTier, projectLimits } from "@/config/plans";
import { appendSlugSuffix, createSlugCandidate } from "@/lib/utils/slug";
import { createClient } from "@/lib/supabase/server";
import type { NavigationItem, ProjectMode, ResumeComponent, ResumePage } from "@/types/project";

function buildComponent(component: Omit<ResumeComponent, "id">): ResumeComponent {
  return {
    id: crypto.randomUUID(),
    ...component,
  };
}

const templateTextProps = {
  color: "#18181b",
  fontFamily: "Inter",
  fontWeight: 400,
  fontSize: 16,
  lineHeight: 165,
  letterSpacing: 0,
  backgroundColor: "#ffffff",
  backgroundOpacity: 0,
  borderRadius: 8,
};

const templateHeadingProps = {
  color: "#111827",
  fontFamily: "Inter",
  fontWeight: 700,
  fontSize: 34,
  lineHeight: 125,
  letterSpacing: 0,
  backgroundColor: "#ffffff",
  backgroundOpacity: 0,
};

const templateMutedProps = {
  ...templateTextProps,
  color: "#4b5563",
  fontSize: 17,
};

function buildTemplatePage(item: NavigationItem): ResumePage {
  const common = {
    id: crypto.randomUUID(),
    slug: item.target,
    title: item.label,
    order: item.order,
  };

  if (item.target === "portfolio") {
    return {
      ...common,
      sections: [
        {
          id: crypto.randomUUID(),
          title: item.label,
          order: 0,
          components: [
            buildComponent({
              type: "text",
              x: 80,
              y: 72,
              width: 640,
              height: 72,
              content: "<p>Portfolio</p>",
              props: templateHeadingProps,
            }),
            buildComponent({
              type: "text",
              x: 84,
              y: 156,
              width: 620,
              height: 72,
              content: "<p>대표 작업물과 프로젝트 성과를 한눈에 볼 수 있게 정리해보세요.</p>",
              props: templateMutedProps,
            }),
            buildComponent({
              type: "image",
              x: 80,
              y: 270,
              width: 300,
              height: 210,
              content: "",
              props: {
                backgroundColor: "#f4f4f5",
                backgroundOpacity: 100,
                borderColor: "#d4d4d8",
                borderStyle: "dashed",
                borderRadius: 18,
                objectFit: "contain",
                objectPositionX: 50,
                objectPositionY: 50,
                cropTop: 0,
                cropRight: 0,
                cropBottom: 0,
                cropLeft: 0,
              },
            }),
            buildComponent({
              type: "textbox",
              x: 420,
              y: 270,
              width: 380,
              height: 210,
              content:
                "<h3>프로젝트명</h3><p><strong>기간:</strong> YYYY.MM - YYYY.MM</p><p><strong>역할:</strong> 기획 / 디자인 / 개발</p><p><strong>성과:</strong> 프로젝트를 통해 만든 결과와 배운 점을 적어주세요.</p>",
              props: templateTextProps,
            }),
            buildComponent({
              type: "image",
              x: 80,
              y: 540,
              width: 300,
              height: 210,
              content: "",
              props: {
                backgroundColor: "#f4f4f5",
                backgroundOpacity: 100,
                borderColor: "#d4d4d8",
                borderStyle: "dashed",
                borderRadius: 18,
                objectFit: "contain",
                objectPositionX: 50,
                objectPositionY: 50,
                cropTop: 0,
                cropRight: 0,
                cropBottom: 0,
                cropLeft: 0,
              },
            }),
            buildComponent({
              type: "textbox",
              x: 420,
              y: 540,
              width: 380,
              height: 210,
              content:
                "<h3>두 번째 작업물</h3><p><strong>문제:</strong> 어떤 문제를 해결했나요?</p><p><strong>과정:</strong> 본인이 맡은 업무와 의사결정을 적어주세요.</p><p><strong>결과:</strong> 숫자나 링크가 있다면 함께 넣어주세요.</p>",
              props: templateTextProps,
            }),
            buildComponent({
              type: "link",
              x: 80,
              y: 800,
              width: 360,
              height: 58,
              content: "<p>포트폴리오 전체 링크</p>",
              props: {
                ...templateTextProps,
                href: "https://example.com",
                color: "#2563eb",
                backgroundColor: "#eff6ff",
                backgroundOpacity: 100,
                borderColor: "#bfdbfe",
                borderRadius: 14,
              },
            }),
          ],
        },
      ],
    };
  }

  if (item.target === "about") {
    return {
      ...common,
      sections: [
        {
          id: crypto.randomUUID(),
          title: item.label,
          order: 0,
          components: [
            buildComponent({
              type: "text",
              x: 80,
              y: 72,
              width: 640,
              height: 72,
              content: "<p>About Me</p>",
              props: templateHeadingProps,
            }),
            buildComponent({
              type: "textbox",
              x: 80,
              y: 178,
              width: 720,
              height: 260,
              content:
                "<h3>자기소개</h3><p>나를 설명하는 키워드, 일하는 방식, 강점, 관심 분야를 자연스럽게 적어보세요. 읽는 사람이 어떤 사람인지 빠르게 이해할 수 있도록 구체적인 사례를 함께 넣으면 좋습니다.</p>",
              props: {
                ...templateTextProps,
                fontSize: 18,
                lineHeight: 175,
              },
            }),
            buildComponent({
              type: "textbox",
              x: 80,
              y: 490,
              width: 340,
              height: 220,
              content:
                "<h3>핵심 역량</h3><p>• 커뮤니케이션</p><p>• 문제 해결</p><p>• 프로젝트 관리</p><p>• 데이터 분석 / 디자인 / 개발 등</p>",
              props: templateTextProps,
            }),
            buildComponent({
              type: "textbox",
              x: 460,
              y: 490,
              width: 340,
              height: 220,
              content:
                "<h3>연락처</h3><p><strong>Email:</strong> example@email.com</p><p><strong>Phone:</strong> 010-0000-0000</p><p><strong>Location:</strong> Seoul, Korea</p>",
              props: templateTextProps,
            }),
            buildComponent({
              type: "link",
              x: 80,
              y: 760,
              width: 300,
              height: 58,
              content: "<p>LinkedIn / Blog 링크</p>",
              props: {
                ...templateTextProps,
                href: "https://example.com",
                color: "#2563eb",
                backgroundColor: "#eff6ff",
                backgroundOpacity: 100,
                borderColor: "#bfdbfe",
                borderRadius: 14,
              },
            }),
          ],
        },
      ],
    };
  }

  return {
    ...common,
    sections: [
      {
        id: crypto.randomUUID(),
        title: item.label,
        order: 0,
        components: [
          buildComponent({
            type: "text",
            x: 80,
            y: 72,
            width: 640,
            height: 120,
            content: "<p>안녕하세요. 나를 가장 잘 보여주는 문장으로 시작해보세요.</p>",
            props: templateHeadingProps,
          }),
          buildComponent({
            type: "text",
            x: 84,
            y: 214,
            width: 620,
            height: 92,
            content: "<p>경험, 역량, 작업물을 보기 좋게 정리하는 ResumeSelf 템플릿입니다.</p>",
            props: templateMutedProps,
          }),
          buildComponent({
            type: "image",
            x: 80,
            y: 360,
            width: 180,
            height: 220,
            content: "",
            props: {
              backgroundColor: "#f4f4f5",
              backgroundOpacity: 100,
              borderColor: "#d4d4d8",
              borderStyle: "dashed",
              borderRadius: 22,
              objectFit: "contain",
              objectPositionX: 50,
              objectPositionY: 50,
              cropTop: 0,
              cropRight: 0,
              cropBottom: 0,
              cropLeft: 0,
            },
          }),
          buildComponent({
            type: "textbox",
            x: 300,
            y: 360,
            width: 500,
            height: 220,
            content:
              "<h3>기본 정보</h3><p><strong>이름:</strong> 홍길동</p><p><strong>생년월일:</strong> YYYY.MM.DD</p><p><strong>연락처:</strong> 010-0000-0000</p><p><strong>이메일:</strong> example@email.com</p><p><strong>거주지:</strong> 서울</p>",
            props: templateTextProps,
          }),
          buildComponent({
            type: "textbox",
            x: 80,
            y: 650,
            width: 720,
            height: 230,
            content:
              "<h3>경력사항</h3><p><strong>재직 기간:</strong> YYYY.MM - YYYY.MM</p><p><strong>회사 이름:</strong> 회사명 / 팀명</p><p><strong>맡은 업무:</strong> 담당 역할과 주요 업무를 적어주세요.</p><p><strong>주요 성과:</strong> 수치, 결과물, 개선한 점을 구체적으로 적어주세요.</p>",
            props: templateTextProps,
          }),
          buildComponent({
            type: "textbox",
            x: 80,
            y: 930,
            width: 720,
            height: 260,
            content:
              "<h3>자기소개</h3><p>지원 동기, 일하는 방식, 강점, 앞으로 만들고 싶은 방향을 자유롭게 작성해보세요. 문단을 나누면 이력서 사이트에서 더 읽기 좋습니다.</p>",
            props: {
              ...templateTextProps,
              fontSize: 18,
              lineHeight: 175,
            },
          }),
          buildComponent({
            type: "link",
            x: 80,
            y: 1240,
            width: 340,
            height: 58,
            content: "<p>포트폴리오 링크 넣기</p>",
            props: {
              ...templateTextProps,
              href: "https://example.com",
              color: "#2563eb",
              backgroundColor: "#eff6ff",
              backgroundOpacity: 100,
              borderColor: "#bfdbfe",
              borderRadius: 14,
            },
          }),
        ],
      },
    ],
  };
}

function buildEmptyPage(label: string, slug: string, order: number): ResumePage {
  return {
    id: crypto.randomUUID(),
    slug,
    title: label,
    order,
    sections: [
      {
        id: crypto.randomUUID(),
        title: label,
        order: 0,
        components: [],
      },
    ],
  };
}

function buildInitialPages(mode: ProjectMode, navigation: NavigationItem[]): ResumePage[] {
  if (mode === "free") {
    return navigation.map((item) => buildEmptyPage(item.label, item.target, item.order));
  }

  return navigation.map((item) => buildTemplatePage(item));
}

async function resolveAvailableSlug(baseSlug: string, excludeProjectId?: string) {
  const supabase = await createClient();

  if (!supabase) {
    return baseSlug;
  }

  let candidate = baseSlug;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { data } = await supabase.from("projects").select("id").eq("slug", candidate).maybeSingle();

    if (!data || data.id === excludeProjectId) {
      return candidate;
    }

    candidate = appendSlugSuffix(baseSlug);
  }

  return `${baseSlug}-${Date.now().toString(36)}`;
}

function clonePagesWithNewIds(pages: ResumePage[]) {
  return pages.map((page) => ({
    ...page,
    id: crypto.randomUUID(),
    sections: page.sections.map((section) => ({
      ...section,
      id: crypto.randomUUID(),
      components: section.components.map((component) => ({
        ...component,
        id: crypto.randomUUID(),
      })),
    })),
  }));
}

export async function createProjectAction(formData: FormData) {
  const supabase = await createClient();

  if (!supabase) {
    redirect("/dashboard?error=supabase-not-configured");
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    redirect("/dashboard?error=login-required");
  }

  const title = String(formData.get("title") ?? "").trim();
  const rawSlug = String(formData.get("slug") ?? title).trim();
  const rawMode = String(formData.get("mode") ?? "template");
  const mode: ProjectMode = rawMode === "free" ? "free" : "template";

  if (!title) {
    redirect("/dashboard?error=missing-title");
  }

  const tier = getSubscriptionTier(user.email);
  const limit = projectLimits[tier];
  const { count } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  if ((count ?? 0) >= limit) {
    redirect("/dashboard?error=project-limit");
  }

  await supabase.from("users").upsert({
    id: user.id,
    email: user.email,
    display_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email,
    avatar_url: user.user_metadata?.avatar_url ?? null,
  });

  const slug = await resolveAvailableSlug(createSlugCandidate(rawSlug));
  const navigation = [
    { id: crypto.randomUUID(), label: "Resume", target: "resume", order: 0 },
    { id: crypto.randomUUID(), label: "Portfolio", target: "portfolio", order: 1 },
    { id: crypto.randomUUID(), label: "About", target: "about", order: 2 },
  ];

  const { data, error } = await supabase
    .from("projects")
    .insert({
      owner_id: user.id,
      title,
      slug,
      mode,
      navigation_mode: "router",
      navigation,
      memo: "",
      pages: buildInitialPages(mode, navigation),
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/dashboard?error=${encodeURIComponent(error?.message ?? "create-failed")}`);
  }

  revalidateTag("public-projects", "max");
  revalidatePath("/dashboard");

  redirect(`/editor/${data.id}`);
}

export async function duplicateProjectAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const supabase = await createClient();

  if (!supabase) {
    redirect("/dashboard?error=supabase-not-configured");
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    redirect("/dashboard?error=login-required");
  }

  const tier = getSubscriptionTier(user.email);
  const limit = projectLimits[tier];
  const { count } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  if ((count ?? 0) >= limit) {
    redirect("/dashboard?error=project-limit");
  }

  const { data: source, error: sourceError } = await supabase
    .from("projects")
    .select("title, slug, memo, delete_locked, mode, navigation_mode, navigation, pages")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (sourceError || !source) {
    redirect("/dashboard?error=project-not-found");
  }

  const slug = await resolveAvailableSlug(`${source.slug}-copy`);
  const navigation = (source.navigation ?? []).map((item: NavigationItem, order: number) => ({
    ...item,
    id: crypto.randomUUID(),
    order,
  }));

  const { data, error } = await supabase
    .from("projects")
    .insert({
      owner_id: user.id,
      title: `${source.title} Copy`,
      slug,
      memo: source.memo ?? "",
      delete_locked: false,
      mode: source.mode,
      navigation_mode: source.navigation_mode,
      navigation,
      pages: clonePagesWithNewIds((source.pages ?? []) as ResumePage[]),
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/dashboard?error=${encodeURIComponent(error?.message ?? "duplicate-failed")}`);
  }

  revalidateTag("public-projects", "max");

  redirect(`/editor/${data.id}`);
}

export async function deleteProjectAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const supabase = await createClient();

  if (!supabase) {
    redirect("/dashboard?error=supabase-not-configured");
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    redirect("/dashboard?error=login-required");
  }

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .eq("delete_locked", false);

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  revalidateTag("public-projects", "max");
  revalidatePath("/dashboard");
}

export async function updateProjectDeleteLockAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const deleteLocked = String(formData.get("deleteLocked") ?? "") === "true";
  const supabase = await createClient();

  if (!supabase) {
    redirect("/dashboard?error=supabase-not-configured");
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    redirect("/dashboard?error=login-required");
  }

  if (!projectId) {
    redirect("/dashboard?error=project-not-found");
  }

  const { error } = await supabase
    .from("projects")
    .update({ delete_locked: deleteLocked })
    .eq("id", projectId)
    .eq("owner_id", user.id);

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
}

export async function updateProjectSlugAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const rawSlug = String(formData.get("slug") ?? "").trim();
  const supabase = await createClient();

  if (!supabase) {
    redirect("/dashboard?error=supabase-not-configured");
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    redirect("/dashboard?error=login-required");
  }

  if (!projectId || !rawSlug) {
    redirect("/dashboard?error=missing-slug");
  }

  const nextSlug = await resolveAvailableSlug(createSlugCandidate(rawSlug), projectId);
  const { error } = await supabase
    .from("projects")
    .update({ slug: nextSlug })
    .eq("id", projectId)
    .eq("owner_id", user.id);

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  revalidateTag("public-projects", "max");
  revalidatePath("/dashboard");
}

export async function updateProjectTitleAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const supabase = await createClient();

  if (!supabase) {
    redirect("/dashboard?error=supabase-not-configured");
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    redirect("/dashboard?error=login-required");
  }

  if (!projectId || !title) {
    redirect("/dashboard?error=missing-title");
  }

  const { error } = await supabase
    .from("projects")
    .update({ title })
    .eq("id", projectId)
    .eq("owner_id", user.id);

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  revalidateTag("public-projects", "max");
  revalidatePath("/dashboard");
}

export async function updateProjectMemoAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const memo = String(formData.get("memo") ?? "").trim().slice(0, 500);
  const supabase = await createClient();

  if (!supabase) {
    redirect("/dashboard?error=supabase-not-configured");
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    redirect("/dashboard?error=login-required");
  }

  if (!projectId) {
    redirect("/dashboard?error=project-not-found");
  }

  const { error } = await supabase
    .from("projects")
    .update({ memo })
    .eq("id", projectId)
    .eq("owner_id", user.id);

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
}
