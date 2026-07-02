import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const mediaBucket = "project-media";

export async function POST(
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

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const mediaType = String(formData.get("mediaType") ?? "image");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required." }, { status: 400 });
  }

  if (mediaType === "image" && !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Image file is required." }, { status: 400 });
  }

  if (mediaType === "video" && !file.type.startsWith("video/")) {
    return NextResponse.json({ error: "Video file is required." }, { status: 400 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `${user.id}/${projectId}/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await supabase.storage
    .from(mediaBucket)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  const { data: publicUrlData } = supabase.storage.from(mediaBucket).getPublicUrl(storagePath);

  await supabase.from("media").insert({
    project_id: projectId,
    storage_path: storagePath,
    media_type: mediaType,
    size_bytes: file.size,
  });

  return NextResponse.json({
    path: storagePath,
    url: publicUrlData.publicUrl,
  });
}

