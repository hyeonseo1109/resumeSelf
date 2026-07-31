"use server";

import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { getSubscriptionTier, projectLimits } from "@/config/plans";
import { createClient } from "@/lib/supabase/server";
import { appendSlugSuffix, createSlugCandidate } from "@/lib/utils/slug";
import type { NavigationItem, ProjectMode, ResumePage } from "@/types/project";

async function resolveAvailableSlug(baseSlug: string) {
  const supabase = await createClient();

  if (!supabase) {
    return baseSlug;
  }

  let candidate = baseSlug;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { data } = await supabase
      .from("projects")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (!data) {
      return candidate;
    }

    candidate = appendSlugSuffix(baseSlug);
  }

  return `${baseSlug}-${Date.now().toString(36)}`;
}

function clonePagesWithNewIds(pages: ResumePage[]) {
  return pages.map((page, order) => ({
    ...page,
    id: crypto.randomUUID(),
    order,
    sections: page.sections.map((section, sectionOrder) => ({
      ...section,
      id: crypto.randomUUID(),
      order: sectionOrder,
      components: section.components.map((component) => ({
        ...component,
        id: crypto.randomUUID(),
      })),
    })),
  }));
}

function cloneNavigationWithNewIds(navigation: NavigationItem[]) {
  return navigation.map((item, order) => ({
    ...item,
    id: crypto.randomUUID(),
    order,
  }));
}

export async function useSharedTemplateAction(formData: FormData) {
  const sourceSlug = String(formData.get("slug") ?? "").trim();
  const supabase = await createClient();

  if (!supabase) {
    redirect(`/templates/${sourceSlug}?error=supabase-not-configured`);
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    redirect(`/templates/${sourceSlug}?error=login-required`);
  }

  const tier = getSubscriptionTier(user.email);
  const limit = projectLimits[tier];
  const { count } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  if ((count ?? 0) >= limit) {
    redirect(`/templates/${sourceSlug}?error=project-limit`);
  }

  const { data: source, error: sourceError } = await supabase
    .from("projects")
    .select("title, slug, mode, navigation_mode, navigation, pages, published_at")
    .eq("slug", sourceSlug)
    .not("published_at", "is", null)
    .maybeSingle();

  if (sourceError || !source) {
    redirect(`/templates/${sourceSlug}?error=template-not-found`);
  }

  await supabase.from("users").upsert({
    id: user.id,
    email: user.email,
    display_name:
      user.user_metadata?.full_name ??
      user.user_metadata?.name ??
      user.email,
    avatar_url: user.user_metadata?.avatar_url ?? null,
  });

  const slug = await resolveAvailableSlug(
    createSlugCandidate(`${source.slug}-template`),
  );
  const navigation = cloneNavigationWithNewIds(
    (source.navigation ?? []) as NavigationItem[],
  );

  const { data, error } = await supabase
    .from("projects")
    .insert({
      owner_id: user.id,
      title: `${source.title} Template`,
      slug,
      memo: "공유 템플릿에서 가져온 프로젝트입니다.",
      delete_locked: false,
      mode: (source.mode as ProjectMode) ?? "template",
      navigation_mode: source.navigation_mode ?? "scroll",
      navigation,
      pages: clonePagesWithNewIds((source.pages ?? []) as ResumePage[]),
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(
      `/templates/${sourceSlug}?error=${encodeURIComponent(error?.message ?? "template-copy-failed")}`,
    );
  }

  revalidateTag("public-projects", "max");
  revalidatePath("/dashboard");
  redirect(`/editor/${data.id}`);
}
