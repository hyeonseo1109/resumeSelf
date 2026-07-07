"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Clipboard, ImageUp, Loader2 } from "lucide-react";

function countWithoutSpaces(text: string) {
  return text.replace(/\s/g, "").length;
}

export function ContentWritingTool() {
  const [text, setText] = useState("");
  const [ocrStatus, setOcrStatus] = useState<"idle" | "loading" | "error">("idle");
  const [ocrMessage, setOcrMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const counts = useMemo(
    () => ({
      withSpaces: text.length,
      withoutSpaces: countWithoutSpaces(text),
      lines: text ? text.split(/\r\n|\r|\n/).length : 0,
    }),
    [text],
  );

  async function handleImageUpload(file: File | null) {
    if (!file) {
      return;
    }

    setOcrStatus("loading");
    setOcrMessage("");

    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch("/api/content/ocr", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();

    if (!response.ok) {
      setOcrStatus("error");
      setOcrMessage(data.error ?? "OCR 분석 중 오류가 발생했습니다.");
      return;
    }

    setText((current) => {
      const nextText = String(data.text ?? "");
      return current.trim() ? `${current}\n${nextText}` : nextText;
    });
    setOcrStatus("idle");
    setOcrMessage("이미지 텍스트를 본문에 추가했습니다.");
  }

  async function copyText() {
    if (!text) {
      return;
    }

    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">본문</h2>
            <p className="mt-1 text-xs text-zinc-500">
              자기소개서, 경력 설명, 포트폴리오 문장을 붙여넣어 확인하세요.
            </p>
          </div>
          <button
            type="button"
            onClick={copyText}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-200 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            {copied ? <CheckCircle2 className="size-4" /> : <Clipboard className="size-4" />}
            {copied ? "복사됨" : "복사"}
          </button>
        </div>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="min-h-[520px] resize-y rounded-md border border-zinc-200 p-4 text-sm leading-7 outline-none focus:border-emerald-400"
          placeholder="내용을 입력하거나 이미지에서 텍스트를 추출해보세요."
        />
      </section>

      <aside className="grid content-start gap-4">
        <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="flex items-center gap-2 font-semibold">
            <ImageUp className="size-4" />
            이미지 텍스트 인식
          </h2>
          <label className="mt-4 grid gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={(event) => void handleImageUpload(event.target.files?.[0] ?? null)}
              className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
            />
            <span className="text-xs leading-5 text-zinc-500">
              Google Vision OCR로 이미지 속 텍스트를 인식합니다.
            </span>
          </label>
          {ocrStatus === "loading" ? (
            <p className="mt-3 inline-flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="size-4 animate-spin" />
              분석 중...
            </p>
          ) : null}
          {ocrMessage ? (
            <p className={`mt-3 text-sm ${ocrStatus === "error" ? "text-red-600" : "text-emerald-700"}`}>
              {ocrMessage}
            </p>
          ) : null}
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold">글자수</h2>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Counter label="공백 포함" value={counts.withSpaces} />
            <Counter label="공백 미포함" value={counts.withoutSpaces} />
            <Counter label="줄 수" value={counts.lines} />
          </div>
        </section>
      </aside>
    </div>
  );
}

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-zinc-50 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-zinc-950">{value.toLocaleString()}</p>
    </div>
  );
}
