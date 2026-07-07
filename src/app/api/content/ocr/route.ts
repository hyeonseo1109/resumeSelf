import { NextResponse } from "next/server";

const GOOGLE_VISION_URL = "https://vision.googleapis.com/v1/images:annotate";

function getVisionApiKey() {
  return (
    process.env.GOOGLE_VISION_API_KEY ??
    process.env.VITE_GOOGLE_VISION_API_KEY ??
    process.env.NEXT_PUBLIC_GOOGLE_VISION_API_KEY ??
    ""
  ).trim();
}

export async function POST(request: Request) {
  const apiKey = getVisionApiKey();

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Google Vision API 키가 필요합니다. .env.local에 GOOGLE_VISION_API_KEY를 추가해주세요.",
      },
      { status: 400 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("image");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "이미지 파일을 업로드해주세요." },
      { status: 400 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const base64Image = bytes.toString("base64");

  const response = await fetch(`${GOOGLE_VISION_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        {
          image: { content: base64Image },
          features: [{ type: "TEXT_DETECTION" }],
        },
      ],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      { error: data.error?.message ?? "OCR 분석 중 오류가 발생했습니다." },
      { status: response.status },
    );
  }

  const text = data.responses?.[0]?.textAnnotations?.[0]?.description ?? "";

  return NextResponse.json({
    text: text || "인식된 텍스트가 없습니다.",
  });
}
