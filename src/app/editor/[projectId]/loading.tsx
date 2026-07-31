export default function EditorLoading() {
  return (
    <main className="min-h-screen bg-zinc-100 text-zinc-950">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4">
        <div className="flex items-center gap-3">
          <div className="size-6 animate-pulse rounded bg-zinc-200" />
          <div>
            <div className="h-4 w-28 animate-pulse rounded bg-zinc-200" />
            <div className="mt-1 h-3 w-16 animate-pulse rounded bg-zinc-100" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-24 animate-pulse rounded-md bg-zinc-100" />
          <div className="h-9 w-20 animate-pulse rounded-md bg-zinc-100" />
          <div className="h-9 w-24 animate-pulse rounded-md bg-zinc-100" />
        </div>
      </header>
      <div className="grid min-h-[calc(100vh-3.5rem)] grid-cols-[188px_minmax(0,1fr)_288px]">
        <aside className="border-r border-zinc-200 bg-white p-3">
          <div className="h-3 w-14 animate-pulse rounded bg-zinc-200" />
          <div className="mt-4 grid gap-2">
            {Array.from({ length: 8 }, (_, index) => (
              <div
                key={index}
                className="h-16 animate-pulse rounded-md border border-zinc-100 bg-zinc-50"
              />
            ))}
          </div>
        </aside>
        <section className="grid place-items-center overflow-hidden p-8">
          <div className="relative h-[720px] w-[min(840px,100%)] overflow-hidden rounded-sm bg-white shadow-sm ring-1 ring-zinc-200">
            <div className="absolute left-14 top-14 h-10 w-52 animate-pulse rounded bg-zinc-200" />
            <div className="absolute left-14 top-32 h-32 w-[70%] animate-pulse rounded-lg bg-zinc-100" />
            <div className="absolute left-14 top-80 h-44 w-[38%] animate-pulse rounded-lg bg-zinc-100" />
            <div className="absolute right-14 top-80 h-44 w-[38%] animate-pulse rounded-lg bg-zinc-100" />
            <div className="absolute inset-x-0 bottom-0 flex justify-center border-t border-zinc-100 bg-white/80 py-4">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-500">
                <span className="size-4 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-950" />
                편집화면으로 이동 중
              </div>
            </div>
          </div>
        </section>
        <aside className="border-l border-zinc-200 bg-white p-4">
          <div className="h-9 w-full animate-pulse rounded-md bg-zinc-100" />
          <div className="mt-5 grid gap-3">
            {Array.from({ length: 9 }, (_, index) => (
              <div key={index} className="grid gap-1.5">
                <div className="h-3 w-24 animate-pulse rounded bg-zinc-200" />
                <div className="h-9 animate-pulse rounded-md bg-zinc-100" />
              </div>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
