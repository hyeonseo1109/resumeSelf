"use client";

import type { ResumeComponent } from "@/types/project";
import { buildMobileComponentTree } from "./layout";
import { MobileComponentBlock } from "./mobile-component-block";
import { PublicComponent } from "./public-component";

export function PublicPopupOverlay({
  popup,
  components,
  onClose,
}: {
  popup: ResumeComponent;
  components: ResumeComponent[];
  onClose: () => void;
}) {
  const overlayHeight = Math.max(
    560,
    ...components.map((component) => component.y + component.height + 120),
  );

  return (
    <div className="fixed inset-x-3 top-20 z-50 mx-auto max-h-[78vh] w-[calc(100vw-1.5rem)] max-w-[840px] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-2xl sm:inset-x-6 sm:w-[calc(100vw-3rem)]">
      <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-zinc-100 bg-white px-5">
        <div>
          <p className="text-sm font-semibold">{popup.content ?? "Popup title"}</p>
          <p className="text-xs text-zinc-500">{String(popup.props.description ?? "")}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex size-8 items-center justify-center rounded-md hover:bg-zinc-100"
        >
          ×
        </button>
      </div>
      <div className="relative overflow-y-auto" style={{ height: "calc(78vh - 56px)" }}>
        <div className="relative hidden lg:block" style={{ minHeight: overlayHeight }}>
          {components.map((component) => (
            <PublicComponent
              key={component.id}
              component={component}
              displayTop={component.y}
            />
          ))}
        </div>
        <div className="grid gap-3 p-4 lg:hidden">
          {buildMobileComponentTree(components).map((node) => (
            <MobileComponentBlock key={node.component.id} node={node} />
          ))}
        </div>
      </div>
    </div>
  );
}
