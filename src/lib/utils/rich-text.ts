export function sanitizeRichTextHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/\s(?:href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\1/gi, "");
}

export function richTextToPlainText(value: string) {
  return sanitizeRichTextHtml(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function resetRichTextLineSpacing(value: string) {
  if (!value || !value.includes("style=")) {
    return value;
  }

  if (typeof document === "undefined") {
    return value.replace(/\sstyle=(["'])(.*?)\1/gi, (_match, quote, style) => {
      const nextStyle = String(style)
        .split(";")
        .map((declaration) => declaration.trim())
        .filter(Boolean)
        .filter(
          (declaration) =>
            !/^line-height\s*:/i.test(declaration) &&
            !/^margin-top\s*:/i.test(declaration),
        )
        .join("; ");

      return nextStyle ? ` style=${quote}${nextStyle}${quote}` : "";
    });
  }

  const template = document.createElement("template");
  template.innerHTML = value;
  template.content.querySelectorAll<HTMLElement>("[style]").forEach((element) => {
    element.style.removeProperty("line-height");
    element.style.removeProperty("margin-top");

    if (!element.getAttribute("style")?.trim()) {
      element.removeAttribute("style");
    }
  });

  return template.innerHTML;
}
