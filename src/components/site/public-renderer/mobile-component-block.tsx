"use client";

import type { CSSProperties } from "react";
import { withAlpha } from "@/features/editor/view-helpers";
import { sanitizeRichTextHtml } from "@/lib/utils/rich-text";
import { getMobileComponentHeight } from "./layout";
import { PublicComponent } from "./public-component";
import type { MobileComponentNode } from "./types";

export function MobileComponentBlock({
  node,
  onOpenPopup,
}: {
  node: MobileComponentNode;
  onOpenPopup?: (id: string) => void;
}) {
  const { component, children } = node;

  if (component.type === "section" || component.type === "container") {
    return (
      <div
        className="grid w-full gap-3 border p-3"
        style={{
          backgroundColor: withAlpha(String(component.props.backgroundColor ?? "#f8fafc"), Number(component.props.backgroundOpacity ?? 100)),
          borderColor: String(component.props.borderColor ?? "#d4d4d8"),
          borderStyle: String(component.props.borderStyle ?? "dashed") as CSSProperties["borderStyle"],
          borderRadius: `${Number(component.props.borderRadius ?? 0)}px`,
          minHeight: children.length > 0 ? undefined : getMobileComponentHeight(component),
        }}
      >
        {component.content ? (
          <div
            className="text-sm font-semibold text-zinc-600"
            dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(component.content) }}
          />
        ) : null}
        {children.map((child) => (
          <MobileComponentBlock
            key={child.component.id}
            node={child}
            onOpenPopup={onOpenPopup}
          />
        ))}
      </div>
    );
  }

  return (
    <PublicComponent
      component={component}
      displayTop={0}
      mobile
      onOpenPopup={() => onOpenPopup?.(component.id)}
    />
  );
}
