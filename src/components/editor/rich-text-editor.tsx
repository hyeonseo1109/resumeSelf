"use client";

import { Extension } from "@tiptap/core";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useEffect, useRef, useState } from "react";
import {
  FONT_OPTIONS,
  FONT_WEIGHT_OPTIONS,
  normalizeFontWeight,
} from "@/features/editor/view-helpers";
import { cn } from "@/lib/utils/cn";

const TextStyleAttributes = Extension.create({
  name: "textStyleAttributes",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) =>
              attributes.fontSize
                ? { style: `font-size: ${attributes.fontSize}` }
                : {},
          },
          fontFamily: {
            default: null,
            parseHTML: (element) => element.style.fontFamily || null,
            renderHTML: (attributes) =>
              attributes.fontFamily
                ? { style: `font-family: ${attributes.fontFamily}` }
                : {},
          },
          fontWeight: {
            default: null,
            parseHTML: (element) => element.style.fontWeight || null,
            renderHTML: (attributes) =>
              attributes.fontWeight
                ? { style: `font-weight: ${attributes.fontWeight}` }
                : {},
          },
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) =>
              attributes.lineHeight
                ? { style: `line-height: ${attributes.lineHeight}` }
                : {},
          },
          letterSpacing: {
            default: null,
            parseHTML: (element) => element.style.letterSpacing || null,
            renderHTML: (attributes) =>
              attributes.letterSpacing
                ? { style: `letter-spacing: ${attributes.letterSpacing}` }
                : {},
          },
        },
      },
    ];
  },
});

const ParagraphStyleAttributes = Extension.create({
  name: "paragraphStyleAttributes",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph"],
        attributes: {
          marginTop: {
            default: null,
            parseHTML: (element) => element.style.marginTop || null,
            renderHTML: (attributes) =>
              attributes.marginTop
                ? { style: `margin-top: ${attributes.marginTop}` }
                : {},
          },
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) =>
              attributes.lineHeight
                ? { style: `line-height: ${attributes.lineHeight}` }
                : {},
          },
        },
      },
    ];
  },
});

const extensions = [
  StarterKit.configure({ heading: false }),
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
  TextStyleAttributes,
  ParagraphStyleAttributes,
];

function getFontLabel(value: unknown) {
  const fontValue = String(value ?? "");
  return (
    FONT_OPTIONS.find((font) => font.value === fontValue)?.label ??
    FONT_OPTIONS.find((font) => fontValue.includes(font.label))?.label ??
    "기본"
  );
}

function getWeightLabel(value: unknown) {
  const normalizedWeight = normalizeFontWeight(value);
  return (
    FONT_WEIGHT_OPTIONS.find((weight) => weight.value === normalizedWeight)?.label ??
    "중간"
  );
}

function getNumericStyleValue(value: unknown, fallback: unknown) {
  const source = String(value ?? fallback ?? "");
  const parsed = Number.parseFloat(source);
  return Number.isFinite(parsed) ? parsed : 16;
}

function getBaseLineHeightValue(baseStyle: CSSProperties) {
  return getNumericStyleValue(baseStyle.lineHeight, 150);
}

function getToolbarHeightValue(
  paragraphAttributes: Record<string, unknown>,
  baseLineHeight: number,
) {
  if (paragraphAttributes.marginTop != null) {
    return baseLineHeight + getNumericStyleValue(paragraphAttributes.marginTop, 0);
  }

  if (paragraphAttributes.lineHeight != null) {
    return getNumericStyleValue(paragraphAttributes.lineHeight, baseLineHeight);
  }

  return baseLineHeight;
}

export function RichTextEditor({
  value,
  readOnly,
  baseStyle,
  className,
  onChange,
  onFocus,
}: {
  value: string;
  readOnly: boolean;
  baseStyle: CSSProperties;
  className?: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
}) {
  const baseLineHeight = getBaseLineHeightValue(baseStyle);
  const [toolbarRevision, setToolbarRevision] = useState(0);
  const [toolbarActive, setToolbarActive] = useState(false);
  const [fontSizeDraft, setFontSizeDraft] = useState<string | null>(null);
  const [lineHeightDraft, setLineHeightDraft] = useState<string | null>(null);
  const [toolbarSnapshot, setToolbarSnapshot] = useState({
    fontLabel: "기본",
    weightLabel: "중간",
    fontSize: 16,
    topSpacing: 0,
  });
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const editor = useEditor({
    extensions,
    content: value || "<p></p>",
    editable: !readOnly,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "resume-rich-text-content",
      },
    },
    onUpdate({ editor: currentEditor }) {
      onChange(currentEditor.getHTML());
    },
    onFocus() {
      setToolbarActive(true);
      onFocus?.();
    },
  });

  useEffect(() => {
    if (!toolbarActive) {
      return;
    }

    function handleOutsidePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (
        toolbarRef.current?.contains(target) ||
        editorContainerRef.current?.contains(target)
      ) {
        return;
      }

      setToolbarActive(false);
      setFontSizeDraft(null);
      setLineHeightDraft(null);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      setToolbarActive(false);
      setFontSizeDraft(null);
      setLineHeightDraft(null);
    }

    window.addEventListener("pointerdown", handleOutsidePointerDown, true);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("pointerdown", handleOutsidePointerDown, true);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [toolbarActive]);

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    if (!editor || editor.getHTML() === value) {
      return;
    }

    editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const updateToolbar = () => {
      if (editor.isFocused) {
        const textStyleAttributes = editor.getAttributes("textStyle");
        const paragraphAttributes = editor.getAttributes("paragraph");
        setToolbarSnapshot({
          fontLabel: getFontLabel(
            textStyleAttributes.fontFamily ?? baseStyle.fontFamily,
          ),
          weightLabel: getWeightLabel(
            textStyleAttributes.fontWeight ?? baseStyle.fontWeight,
          ),
          fontSize: getNumericStyleValue(
            textStyleAttributes.fontSize,
            baseStyle.fontSize,
          ),
          topSpacing: getToolbarHeightValue(paragraphAttributes, baseLineHeight),
        });
      }

      setToolbarRevision((current) => current + 1);
    };

    editor.on("selectionUpdate", updateToolbar);
    editor.on("transaction", updateToolbar);
    return () => {
      editor.off("selectionUpdate", updateToolbar);
      editor.off("transaction", updateToolbar);
    };
  }, [
    baseLineHeight,
    baseStyle.fontFamily,
    baseStyle.fontSize,
    baseStyle.fontWeight,
    editor,
  ]);

  function applyTextStyle(patch: Record<string, string>) {
    editor?.chain().focus().setMark("textStyle", patch).run();
  }

  function applyLineHeight(value: string) {
    editor
      ?.chain()
      .focus()
      .updateAttributes("paragraph", { marginTop: value, lineHeight: null })
      .run();
  }

  function applyFontSizeInput(value: string) {
    const nextSize = Number.parseFloat(value);
    if (!Number.isFinite(nextSize) || nextSize < 0 || nextSize > 200) {
      return;
    }

    applyTextStyle({ fontSize: `${nextSize}px` });
  }

  function applyLineHeightInput(value: string) {
    const nextLineHeight = Number.parseFloat(value);
    if (
      !Number.isFinite(nextLineHeight) ||
      nextLineHeight < 0 ||
      nextLineHeight > 300
    ) {
      return;
    }

    const spacingDelta = nextLineHeight - baseLineHeight;
    applyLineHeight(`${spacingDelta}px`);
  }

  function ignoreCurrentValue(value: string, callback: (value: string) => void) {
    if (value.startsWith("__current_")) {
      return;
    }

    callback(value);
  }

  function handleToolbarPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.stopPropagation();
    setToolbarActive(true);
  }

  function handleToolbarMouseDown(event: ReactMouseEvent<HTMLDivElement>) {
    event.stopPropagation();
  }

  function handleToolbarClick(event: ReactMouseEvent<HTMLDivElement>) {
    event.stopPropagation();
    setToolbarActive(true);
  }

  function resetNumberDrafts() {
    setFontSizeDraft(null);
    setLineHeightDraft(null);
  }

  if (!editor) {
    return null;
  }

  const textStyleAttributes = editor.getAttributes("textStyle");
  const paragraphAttributes = editor.getAttributes("paragraph");
  const currentToolbarSnapshot = {
    fontLabel: getFontLabel(
      textStyleAttributes.fontFamily ?? baseStyle.fontFamily,
    ),
    weightLabel: getWeightLabel(
      textStyleAttributes.fontWeight ?? baseStyle.fontWeight,
    ),
    fontSize: getNumericStyleValue(
      textStyleAttributes.fontSize,
      baseStyle.fontSize,
    ),
    topSpacing: getToolbarHeightValue(paragraphAttributes, baseLineHeight),
  };
  const activeToolbarSnapshot = editor.isFocused
    ? currentToolbarSnapshot
    : toolbarSnapshot;
  const activeFontLabel = activeToolbarSnapshot.fontLabel;
  const activeWeightLabel = activeToolbarSnapshot.weightLabel;
  const activeFontSize = activeToolbarSnapshot.fontSize;
  const activeLineHeight = activeToolbarSnapshot.topSpacing;

  void toolbarRevision;

  return (
    <div ref={editorContainerRef} className={cn("relative h-full w-full", className)}>
      {!readOnly && toolbarActive ? (
        <div
          ref={toolbarRef}
          data-editor-control="true"
          onPointerDownCapture={handleToolbarPointerDown}
          onMouseDownCapture={handleToolbarMouseDown}
          onClick={handleToolbarClick}
          className="absolute -top-11 left-0 z-40 flex h-9 w-max max-w-[720px] items-center gap-1 overflow-visible rounded-md border border-zinc-200 bg-white px-1.5 shadow-lg"
        >
          <button
            type="button"
            data-editor-control="true"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn(
              "inline-flex size-7 items-center justify-center rounded text-sm font-bold",
              editor.isActive("bold")
                ? "bg-zinc-950 text-white"
                : "text-zinc-700 hover:bg-zinc-100",
            )}
          >
            B
          </button>
          <select
            data-editor-control="true"
            aria-label="Font family"
            onChange={(event) =>
              ignoreCurrentValue(event.target.value, (value) =>
                applyTextStyle({ fontFamily: value }),
              )
            }
            className="h-7 w-40 rounded border border-zinc-200 px-1 text-xs"
            value="__current_font__"
          >
            <option value="__current_font__">
              글꼴: {activeFontLabel}
            </option>
            {FONT_OPTIONS.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
          <select
            data-editor-control="true"
            aria-label="Font weight"
            onChange={(event) =>
              ignoreCurrentValue(event.target.value, (value) =>
                applyTextStyle({ fontWeight: value }),
              )
            }
            className="h-7 w-28 rounded border border-zinc-200 pl-1.5 pr-6 text-xs"
            value="__current_weight__"
          >
            <option value="__current_weight__">
              두께: {activeWeightLabel}
            </option>
            {FONT_WEIGHT_OPTIONS.map((weight) => (
              <option key={weight.value} value={String(weight.value)}>
                {weight.label}
              </option>
            ))}
          </select>
          <label
            data-editor-control="true"
            className="flex h-7 items-center gap-1 rounded border border-zinc-200 bg-white px-1.5 text-xs text-zinc-600"
          >
            <span className="shrink-0">크기:</span>
            <input
              data-editor-control="true"
              type="number"
              min={0}
              max={200}
              step={1}
              aria-label="Font size"
              value={fontSizeDraft ?? String(activeFontSize)}
              onFocus={(event) => setFontSizeDraft(event.currentTarget.value)}
              onBlur={resetNumberDrafts}
              onChange={(event) => {
                setFontSizeDraft(event.target.value);
                applyFontSizeInput(event.target.value);
              }}
              className="h-6 w-12 bg-transparent text-xs text-zinc-900 outline-none"
            />
          </label>
          <label
            data-editor-control="true"
            className="flex h-7 items-center gap-1 rounded border border-zinc-200 bg-white px-1.5 text-xs text-zinc-600"
          >
            <span className="shrink-0">높이:</span>
            <input
              data-editor-control="true"
              type="number"
              min={0}
              max={300}
              step={5}
              aria-label="Line height"
              value={lineHeightDraft ?? String(activeLineHeight)}
              onFocus={(event) => setLineHeightDraft(event.currentTarget.value)}
              onBlur={resetNumberDrafts}
              onChange={(event) => {
                setLineHeightDraft(event.target.value);
                applyLineHeightInput(event.target.value);
              }}
              className="h-6 w-14 bg-transparent text-xs text-zinc-900 outline-none"
            />
          </label>
          <input
            data-editor-control="true"
            type="color"
            aria-label="Text color"
            title="글자색"
            onChange={(event) => editor.chain().focus().setColor(event.target.value).run()}
            className="resume-rich-color-input size-7 shrink-0 cursor-pointer rounded border border-zinc-200 bg-white p-0.5"
          />
          <input
            data-editor-control="true"
            type="color"
            aria-label="Highlight color"
            title="하이라이트"
            onChange={(event) =>
              editor.chain().focus().setHighlight({ color: event.target.value }).run()
            }
            className="resume-rich-color-input size-7 shrink-0 cursor-pointer rounded border border-zinc-200 bg-white p-0.5"
          />
        </div>
      ) : null}
      <EditorContent
        editor={editor}
        className="h-full w-full overflow-auto"
        style={baseStyle}
        onPointerDown={(event) => {
          if (!readOnly) {
            event.stopPropagation();
            onFocus?.();
          }
        }}
      />
    </div>
  );
}
