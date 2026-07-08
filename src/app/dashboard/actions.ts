"use server";

import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { getSubscriptionTier, projectLimits } from "@/config/plans";
import { appendSlugSuffix, createSlugCandidate } from "@/lib/utils/slug";
import { createClient } from "@/lib/supabase/server";
import type { NavigationItem, ProjectMode, ResumePage } from "@/types/project";

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

  return navigation.map((item) => {
    if (item.target !== "resume") {
      return buildEmptyPage(item.label, item.target, item.order);
    }

    return {
      id: crypto.randomUUID(),
      slug: item.target,
      title: item.label,
      order: item.order,
      sections: [
        {
          id: crypto.randomUUID(),
          title: item.label,
          order: 0,
          components: [
            {
              id: crypto.randomUUID(),
              type: "text",
              x: 80,
              y: 72,
              width: 640,
              height: 120,
              content: "안녕하세요. 나를 가장 잘 보여주는 문장으로 시작해보세요.",
              props: { fontSize: 34, color: "#111827", fontWeight: 700 },
            },
            {
              id: crypto.randomUUID(),
              type: "text",
              x: 84,
              y: 214,
              width: 520,
              height: 92,
              content: "경험, 역량, 작업물을 보기 좋게 정리하는 ResumeSelf 템플릿입니다.",
              props: { fontSize: 17, color: "#4b5563" },
            },
          ],
        },
      ],
    };
  });
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
