import type { CSSProperties } from "react";
import type { ResumeComponent } from "@/types/project";

export interface GuideLine {
  axis: "x" | "y";
  position: number;
}

export interface SpacingGuide {
  axis: "x" | "y";
  start: number;
  end: number;
  cross: number;
  distance: number;
}

export const FONT_OPTIONS = [
  { label: "System", value: "Arial, Helvetica, sans-serif" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Mono", value: "'SFMono-Regular', Consolas, monospace" },
  { label: "Pretendard", value: "Pretendard, Arial, sans-serif" },
  { label: "Noto Sans KR", value: "'Noto Sans KR', Arial, sans-serif" },
  { label: "S-Core Dream", value: "'S-Core Dream', Arial, sans-serif" },
  { label: "Gmarket Sans", value: "'Gmarket Sans', Arial, sans-serif" },
];

export const FONT_WEIGHT_OPTIONS = [
  { label: "얇음", value: 300 },
  { label: "중간", value: 500 },
  { label: "두꺼움", value: 700 },
];

export const PDF_PAGE_WIDTH = 840;
export const PDF_PAGE_HEIGHT = 1188;

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeAnchor(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function withAlpha(hex: string, opacity: number) {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return hex;
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${clamp(opacity, 0, 100) / 100})`;
}

export function getTextStyle(component: ResumeComponent): CSSProperties {
  return {
    color: String(component.props.color ?? "#111827"),
    fontSize: Number(component.props.fontSize ?? 16),
    fontWeight: Number(component.props.fontWeight ?? 400),
    fontFamily: String(component.props.fontFamily ?? FONT_OPTIONS[0].value),
  };
}

export function normalizeFontWeight(value: unknown) {
  const weight = Number(value ?? 500);

  if (weight >= 650) {
    return 700;
  }

  if (weight <= 350) {
    return 300;
  }

  return 500;
}

export function getImageCropInset(component: ResumeComponent) {
  return {
    top: Number(component.props.cropTop ?? 0),
    right: Number(component.props.cropRight ?? 0),
    bottom: Number(component.props.cropBottom ?? 0),
    left: Number(component.props.cropLeft ?? 0),
  };
}

export function getImageCropClipPath(component: ResumeComponent) {
  const crop = getImageCropInset(component);
  return `inset(${crop.top}% ${crop.right}% ${crop.bottom}% ${crop.left}%)`;
}

export function getImageMediaStyle(component: ResumeComponent): CSSProperties {
  return {
    inset: "0",
    width: "100%",
    height: "100%",
    clipPath: getImageCropClipPath(component),
    objectFit: String(component.props.objectFit ?? "contain") as CSSProperties["objectFit"],
  };
}

export function getComponentLayer(component: ResumeComponent) {
  if (component.type === "section") {
    return 0;
  }

  if (component.type === "container") {
    return 1;
  }

  if (component.type === "popup") {
    return 6;
  }

  return 5;
}

export function hasTypography(component: ResumeComponent) {
  return ["text", "textbox", "button", "icon", "link", "section", "container", "popup"].includes(
    component.type,
  );
}

export function getDividerStyle(component: ResumeComponent): CSSProperties {
  const orientation = String(component.props.orientation ?? "horizontal");
  const lineStyle = String(component.props.lineStyle ?? "solid");
  const thickness = String(component.props.thickness ?? "thin");
  const width = thickness === "thick" ? 4 : thickness === "medium" ? 2 : 1;
  const color = String(component.props.borderColor ?? "#d4d4d8");

  return orientation === "vertical"
    ? {
        width: 0,
        height: "100%",
        borderLeftWidth: width,
        borderLeftStyle: lineStyle as CSSProperties["borderLeftStyle"],
        borderLeftColor: color,
      }
    : {
        width: "100%",
        height: 0,
        borderTopWidth: width,
        borderTopStyle: lineStyle as CSSProperties["borderTopStyle"],
        borderTopColor: color,
      };
}
