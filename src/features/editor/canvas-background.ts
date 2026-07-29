import type { CanvasBackgroundStyle, ResumePage } from "@/types/project";

export const DEFAULT_CANVAS_BACKGROUND = "#ffffff";

export function getCanvasBackgroundStyle(page?: ResumePage | null) {
  const solidColor =
    page?.canvasBackgroundStyle?.color ??
    page?.canvasBackground ??
    DEFAULT_CANVAS_BACKGROUND;

  if (page?.canvasBackgroundStyle?.mode !== "gradient") {
    return {
      mode: "solid",
      color: solidColor,
      points: [],
    } satisfies CanvasBackgroundStyle;
  }

  return {
    mode: "gradient",
    color: solidColor,
    points: page.canvasBackgroundStyle.points,
  } satisfies CanvasBackgroundStyle;
}

function hexToRgb(value: string) {
  const normalized = value.replace("#", "");
  const hex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;
  const parsed = Number.parseInt(hex, 16);

  if (!Number.isFinite(parsed)) {
    return { r: 255, g: 255, b: 255 };
  }

  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  };
}

export function getCanvasBackgroundCss(style: CanvasBackgroundStyle) {
  if (style.mode !== "gradient" || style.points.length === 0) {
    return style.color || DEFAULT_CANVAS_BACKGROUND;
  }

  const layers = style.points.map((point) => {
    const { r, g, b } = hexToRgb(point.color);
    const opacity = Math.max(0, Math.min(100, point.opacity)) / 100;
    const size = Math.max(5, Math.min(160, point.size));

    return `radial-gradient(circle at ${point.x}% ${point.y}%, rgba(${r}, ${g}, ${b}, ${opacity}) 0%, rgba(${r}, ${g}, ${b}, ${opacity * 0.55}) ${size * 0.42}%, rgba(${r}, ${g}, ${b}, 0) ${size}%)`;
  });

  return [...layers, style.color || DEFAULT_CANVAS_BACKGROUND].join(", ");
}

export function createGradientPoint(x: number, y: number) {
  return {
    id: crypto.randomUUID(),
    x: Math.max(0, Math.min(100, x)),
    y: Math.max(0, Math.min(100, y)),
    color: "#dbeafe",
    size: 55,
    opacity: 80,
  };
}
