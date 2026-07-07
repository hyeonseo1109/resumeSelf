import { TopNav } from "@/components/layout/top-nav";
import { ContentWritingTool } from "@/components/content/content-writing-tool";

export default function ContentPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <TopNav />
      <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6">
        <div>
          <h1 className="text-2xl font-semibold">내용 검토</h1>
          <p className="mt-2 text-sm text-zinc-500">
            이미지에서 텍스트를 가져오고, 글자 수를 빠르게 확인합니다.
          </p>
        </div>
        <ContentWritingTool />
      </main>
    </div>
  );
}
