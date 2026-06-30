"use server";

import { redirect } from "next/navigation";
import { getSubscriptionTier, projectLimits } from "@/config/plans";
import { appendSlugSuffix, createSlugCandidate } from "@/lib/utils/slug";
import { createClient } from "@/lib/supabase/server";
import type { ProjectMode, ResumePage } from "@/types/project";

function buildInitialPages(mode: ProjectMode): ResumePage[] {
  const sectionId = crypto.randomUUID();

  if (mode === "free") {
    return [
      {
        id: crypto.randomUUID(),
        slug: "home",
        title: "Home",
        order: 0,
        sections: [
          {
            id: sectionId,
            title: "Home",
            order: 0,
            components: [],
          },
        ],
      },
    ];
  }

  return [
    {
      id: crypto.randomUUID(),
      slug: "home",
      title: "Home",
      order: 0,
      sections: [
        {
          id: sectionId,
          title: "Resume",
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
    },
  ];
}

async function resolveAvailableSlug(baseSlug: string) {
  const supabase = await createClient();

  if (!supabase) {
    return baseSlug;
  }

  let candidate = baseSlug;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { data } = await supabase.from("projects").select("id").eq("slug", candidate).maybeSingle();

    if (!data) {
      return candidate;
    }

    candidate = appendSlugSuffix(baseSlug);
  }

  return `${baseSlug}-${Date.now().toString(36)}`;
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
      navigation_mode: "scroll",
      navigation,
      pages: buildInitialPages(mode),
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/dashboard?error=${encodeURIComponent(error?.message ?? "create-failed")}`);
  }

  redirect(`/editor/${data.id}`);
}

