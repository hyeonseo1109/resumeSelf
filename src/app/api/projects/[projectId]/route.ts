import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { NavigationItem, NavigationMode, ResumePage } from "@/types/project";

interface SaveProjectPayload {
  title?: string;
  navigationMode?: NavigationMode;
  navigation?: NavigationItem[];
  pages?: ResumePage[];
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const supabase = await createClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const payload = (await request.json()) as SaveProjectPayload;
  const { error } = await supabase
    .from("projects")
    .update({
      title: payload.title,
      navigation_mode: payload.navigationMode,
      navigation: payload.navigation,
      pages: payload.pages,
      updated_at: new Date().toISOString(),
      published_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .eq("owner_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export const POST = PATCH;
