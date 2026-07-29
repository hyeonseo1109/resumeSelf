import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ComponentPreset, ResumeComponent } from "@/types/project";

interface CreatePresetPayload {
  title?: string;
  memo?: string;
  component?: ResumeComponent;
}

interface UpdatePresetPayload {
  id?: string;
  title?: string;
  memo?: string;
}

function mapPreset(data: {
  id: string;
  title: string;
  memo: string | null;
  component: ResumeComponent;
  created_at: string;
  updated_at: string;
}): ComponentPreset {
  return {
    id: data.id,
    title: data.title,
    memo: data.memo ?? "",
    component: data.component,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function GET() {
  const supabase = await createClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("presets")
    .select("id, title, memo, component, created_at, updated_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ presets: (data ?? []).map(mapPreset) });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const payload = (await request.json()) as CreatePresetPayload;
  const title = String(payload.title ?? "").trim();

  if (!title || !payload.component) {
    return NextResponse.json({ error: "Preset title and component are required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("presets")
    .insert({
      owner_id: user.id,
      title,
      memo: String(payload.memo ?? "").trim(),
      component: payload.component,
      updated_at: new Date().toISOString(),
    })
    .select("id, title, memo, component, created_at, updated_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to create preset." }, { status: 400 });
  }

  return NextResponse.json({ preset: mapPreset(data) });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const payload = (await request.json()) as UpdatePresetPayload;
  const id = String(payload.id ?? "");
  const title = String(payload.title ?? "").trim();

  if (!id || !title) {
    return NextResponse.json({ error: "Preset id and title are required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("presets")
    .update({
      title,
      memo: String(payload.memo ?? "").trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("id, title, memo, component, created_at, updated_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to update preset." }, { status: 400 });
  }

  return NextResponse.json({ preset: mapPreset(data) });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") ?? "";

  if (!id) {
    return NextResponse.json({ error: "Preset id is required." }, { status: 400 });
  }

  const { error } = await supabase
    .from("presets")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
