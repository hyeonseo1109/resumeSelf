"use client";

import type { CSSProperties } from "react";
import { getDividerStyle } from "@/features/editor/view-helpers";
import type { ResumeComponent } from "@/types/project";
import { getMobileComponentHeight, normalizeAnchor } from "./layout";

export function PublicComponent({
  component,
  displayTop,
  mobile = false,
  onOpenPopup,
}: {
  component: ResumeComponent;
  displayTop: number;
  mobile?: boolean;
  onOpenPopup?: () => void;
}) {
  const mobileHeight = getMobileComponentHeight(component);
  const preserveRatioOnMobile = mobile && (component.type === "image" || component.type === "video");

  return (
    <div
      className={mobile ? "relative rounded-md" : "absolute rounded-md"}
      style={
        mobile
          ? {
              width: "100%",
              height: preserveRatioOnMobile ? undefined : mobileHeight,
              aspectRatio: preserveRatioOnMobile
                ? `${Math.max(1, component.width)} / ${Math.max(1, component.height)}`
                : undefined,
            }
          : {
              left: component.x,
              top: displayTop,
              width: component.width,
              height: component.height,
            }
      }
    >
      {component.type === "text" ? (
        <div
          className="h-full w-full whitespace-pre-wrap wrap-break-words p-2"
          style={component.props as CSSProperties}
        >
          {component.content}
        </div>
      ) : component.type === "divider" ? (
        <div className="flex h-full w-full items-center justify-center">
          <span style={getDividerStyle(component)} />
        </div>
      ) : component.type === "image" && component.content ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={component.content}
          alt=""
          className="h-full w-full rounded-md"
          loading="lazy"
          decoding="async"
          style={{
            objectFit: String(component.props.objectFit ?? "cover") as CSSProperties["objectFit"],
            objectPosition: `${Number(component.props.objectPositionX ?? 50)}% ${Number(component.props.objectPositionY ?? 50)}%`,
          }}
        />
      ) : component.type === "video" && component.content ? (
        <video
          src={component.content}
          className="h-full w-full rounded-md"
          controls
          preload="metadata"
          style={{
            objectFit: String(component.props.objectFit ?? "cover") as CSSProperties["objectFit"],
            objectPosition: `${Number(component.props.objectPositionX ?? 50)}% ${Number(component.props.objectPositionY ?? 50)}%`,
          }}
        />
      ) : component.type === "button" ? (
        <button
          type="button"
          className="h-full w-full rounded-md bg-zinc-950 px-4 text-sm font-medium text-white"
          style={{
            backgroundColor: String(component.props.backgroundColor ?? "#09090b"),
            color: String(component.props.color ?? "#ffffff"),
          }}
        >
          {component.content ?? "버튼"}
        </button>
      ) : component.type === "link" ? (
        <a
          href={String(component.props.href ?? "#")}
          target="_blank"
          rel="noreferrer"
          className="flex h-full w-full items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 underline-offset-4 hover:underline"
          style={{
            backgroundColor: String(component.props.backgroundColor ?? "#ffffff"),
            color: String(component.props.color ?? "#18181b"),
          }}
        >
          {component.content ?? "링크"}
        </a>
      ) : component.type === "popup" ? (
        <button
          type="button"
          onClick={onOpenPopup}
          className="flex h-full w-full flex-col overflow-hidden rounded-md border border-zinc-200 bg-white text-left shadow-sm"
          style={{ backgroundColor: String(component.props.backgroundColor ?? "#ffffff") }}
        >
          {component.props.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={String(component.props.thumbnailUrl)}
              alt=""
              className="h-32 w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : null}
          <span className={`px-3 text-sm font-semibold text-zinc-950 ${component.props.thumbnailUrl ? "pt-3" : "pt-4"}`}>
            {component.content ?? "Popup title"}
          </span>
          <span className="line-clamp-2 px-3 pb-3 pt-1 text-xs leading-5 text-zinc-500">
            {String(component.props.description ?? "")}
          </span>
        </button>
      ) : component.type === "section" || component.type === "container" ? (
        <div
          id={component.type === "section" ? normalizeAnchor(component.content ?? component.id) : undefined}
          className="flex h-full w-full items-start border border-dashed p-3 text-sm font-medium text-zinc-600"
          style={{
            backgroundColor: String(component.props.backgroundColor ?? "#f8fafc"),
            borderColor: String(component.props.borderColor ?? "#d4d4d8"),
            borderRadius: `${Number(component.props.borderRadius ?? 0)}px`,
          }}
        >
          {component.content}
        </div>
      ) : (
        <div className="flex h-full items-center justify-center bg-zinc-100 text-sm text-zinc-500">
          {component.type}
        </div>
      )}
    </div>
  );
}
