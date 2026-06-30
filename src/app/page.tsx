import Link from "next/link";
import { ArrowRight, Boxes, MousePointer2, Sparkles } from "lucide-react";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { TopNav } from "@/components/layout/top-nav";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f7f5f0] text-zinc-950">
      <TopNav />
      <main className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_520px] lg:py-16">
        <section className="flex flex-col justify-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">No-code resume builder</p>
          <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-[1.05] tracking-normal text-zinc-950 sm:text-6xl">
            ResumeSelf
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-650">
            Framer의 편집 감각, Notion의 쉬운 작성 흐름, Figma/PPT의 자유 배치를 합친 웹 기반 이력서·포트폴리오 제작 서비스입니다.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/dashboard" className="inline-flex h-11 items-center gap-2 rounded-md bg-zinc-950 px-5 text-sm font-semibold text-white hover:bg-zinc-800">
              Dashboard 시작
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="grid gap-3 rounded-md bg-zinc-950 p-4 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <strong>Resume Editor</strong>
              <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs text-emerald-200">방금 저장됨</span>
            </div>
            <div className="grid grid-cols-[120px_1fr_140px] gap-3">
              <Panel icon={<Boxes className="size-4" />} title="Insert" text="Text, Image, Video, Section" />
              <div className="min-h-[360px] rounded-md bg-white p-5 text-zinc-950">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-4 text-sm">
                  <strong>Eunseo</strong>
                  <span className="text-zinc-500">Resume · Portfolio · About</span>
                </div>
                <div className="mt-12 max-w-sm">
                  <p className="text-3xl font-semibold leading-tight">제품의 문제를 구조화하는 디자이너</p>
                  <p className="mt-4 leading-7 text-zinc-500">템플릿으로 시작하고, 자유 배치로 나만의 웹사이트를 완성합니다.</p>
                </div>
              </div>
              <Panel icon={<MousePointer2 className="size-4" />} title="Properties" text="Color, Size, Font, Radius" />
            </div>
          </div>
          <div className="mt-4">
            <OAuthButtons />
          </div>
        </section>
      </main>
    </div>
  );
}

function Panel({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/5 p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {title}
      </div>
      <p className="mt-3 text-xs leading-5 text-zinc-300">{text}</p>
      <Sparkles className="mt-10 size-4 text-emerald-300" />
    </div>
  );
}
