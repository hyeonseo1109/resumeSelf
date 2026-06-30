import { starterResumeProject } from "@/config/templates";
import { createClient } from "@/lib/supabase/server";
import type { ResumeProject } from "@/types/project";

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
    .select("id, owner_id, title, slug, mode, navigation_mode, navigation, pages, updated_at, published_at")
    .eq("owner_id", ownerId)
    .order("updated_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((project) => ({
    id: project.id,
    ownerId: project.owner_id,
    title: project.title,
    slug: project.slug,
    mode: project.mode,
    navigationMode: project.navigation_mode,
    navigation: project.navigation ?? [],
    pages: project.pages ?? [],
    updatedAt: project.updated_at,
    publishedAt: project.published_at,
  }));
}

export async function getProjectBySlug(slug: string): Promise<ResumeProject | null> {
  const supabase = await createClient();

  if (!supabase) {
    return slug === starterResumeProject.slug ? starterResumeProject : null;
  }

  const { data, error } = await supabase
    .from("projects")
    .select("id, owner_id, title, slug, mode, navigation_mode, navigation, pages, updated_at, published_at")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    ownerId: data.owner_id,
    title: data.title,
    slug: data.slug,
    mode: data.mode,
    navigationMode: data.navigation_mode,
    navigation: data.navigation ?? [],
    pages: data.pages ?? [],
    updatedAt: data.updated_at,
    publishedAt: data.published_at,
  };
}

export async function getProjectById(projectId: string): Promise<ResumeProject | null> {
  const projects = await listProjects();
  return projects.find((project) => project.id === projectId) ?? starterResumeProject;
}

