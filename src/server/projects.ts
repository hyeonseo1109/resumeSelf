import { starterResumeProject } from "@/config/templates";
import { createClient } from "@/lib/supabase/server";
import type { NavigationItem, ProjectMode, ResumePage, ResumeProject } from "@/types/project";

function buildEmptyPage(label: string, slug: string, order: number): ResumePage {
  return {
    id: `page-${slug}`,
    slug,
    title: label,
    order,
    sections: [
      {
        id: `section-${slug}`,
        title: label,
        order: 0,
        components: [],
      },
    ],
  };
}

function normalizeProject(project: ResumeProject): ResumeProject {
  const navigation = project.navigation
    .map((item, order) => ({ ...item, order }))
    .filter((item) => item.target);
  const pages = [...project.pages].sort((a, b) => a.order - b.order);
  const homeOnlyPage = pages.length === 1 && pages[0]?.slug === "home" ? pages[0] : null;
  const normalizedPages: ResumePage[] = [];

  navigation.forEach((item, order) => {
    const existingPage =
      pages.find((page) => page.slug === item.target) ??
      (order === 0 && homeOnlyPage ? homeOnlyPage : undefined);

    if (existingPage) {
      normalizedPages.push({
        ...existingPage,
        slug: item.target,
        title: item.label,
        order,
        sections:
          existingPage.sections.length > 0
            ? existingPage.sections.map((section, sectionIndex) =>
                sectionIndex === 0 ? { ...section, title: item.label, order: 0 } : section,
              )
            : buildEmptyPage(item.label, item.target, order).sections,
      });
      return;
    }

    normalizedPages.push(buildEmptyPage(item.label, item.target, order));
  });

  const orphanPages = pages.filter((page) => !normalizedPages.some((normalizedPage) => normalizedPage.id === page.id));

  return {
    ...project,
    navigation,
    pages: [...normalizedPages, ...orphanPages.map((page, index) => ({ ...page, order: normalizedPages.length + index }))],
  };
}

function mapProject(data: {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  memo: string | null;
  mode: ProjectMode;
  navigation_mode: ResumeProject["navigationMode"];
  navigation: NavigationItem[] | null;
  pages: ResumePage[] | null;
  updated_at: string;
  published_at: string | null;
}): ResumeProject {
  return normalizeProject({
    id: data.id,
    ownerId: data.owner_id,
    title: data.title,
    slug: data.slug,
    memo: data.memo ?? "",
    mode: data.mode,
    navigationMode: data.navigation_mode,
    navigation: data.navigation ?? [],
    pages: data.pages ?? [],
    updatedAt: data.updated_at,
    publishedAt: data.published_at,
  });
}

export async function getCurrentUser() {
  const supabase = await createClient();

  if (!supabase) {
    return null;
  }

  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function listProjects(ownerId?: string): Promise<ResumeProject[]> {
  const supabase = await createClient();

  if (!supabase || !ownerId) {
    return [starterResumeProject];
  }

  const { data, error } = await supabase
    .from("projects")
    .select("id, owner_id, title, slug, memo, mode, navigation_mode, navigation, pages, updated_at, published_at")
    .eq("owner_id", ownerId)
    .order("updated_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(mapProject);
}

export async function getProjectBySlug(slug: string): Promise<ResumeProject | null> {
  const supabase = await createClient();

  if (!supabase) {
    return slug === starterResumeProject.slug ? starterResumeProject : null;
  }

  const { data, error } = await supabase
    .from("projects")
    .select("id, owner_id, title, slug, memo, mode, navigation_mode, navigation, pages, updated_at, published_at")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapProject(data);
}

export async function getProjectById(projectId: string, ownerId: string): Promise<ResumeProject | null> {
  if (projectId === starterResumeProject.id && ownerId) {
    return starterResumeProject;
  }

  const projects = await listProjects(ownerId);
  return projects.find((project) => project.id === projectId) ?? null;
}
