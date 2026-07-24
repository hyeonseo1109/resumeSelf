"use client";

import { Extension } from "@tiptap/core";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { CSSProperties } from "react";
import { useEffect } from "react";
import { FONT_OPTIONS, FONT_WEIGHT_OPTIONS } from "@/features/editor/view-helpers";
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
];

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
      onFocus?.();
    },
  });

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    if (!editor || editor.getHTML() === value) {
      return;
    }

    editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
  }, [editor, value]);

  function applyTextStyle(patch: Record<string, string>) {
    editor?.chain().focus().setMark("textStyle", patch).run();
  }

  if (!editor) {
    return null;
  }

  return (
    <div className={cn("relative h-full w-full", className)}>
      {!readOnly && editor.isFocused ? (
        <div
          data-editor-control="true"
          onPointerDown={(event) => event.stopPropagation()}
          className="absolute -top-11 left-0 z-40 flex h-9 max-w-[min(100%,420px)] items-center gap-1 overflow-hidden rounded-md border border-zinc-200 bg-white px-1.5 shadow-lg"
        >
          <button
            type="button"
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
            aria-label="Font family"
            onChange={(event) => applyTextStyle({ fontFamily: event.target.value })}
            className="h-7 min-w-0 max-w-24 rounded border border-zinc-200 px-1 text-xs"
            defaultValue=""
          >
            <option value="" disabled>
              Font
            </option>
            {FONT_OPTIONS.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Font weight"
            onChange={(event) => applyTextStyle({ fontWeight: event.target.value })}
            className="h-7 w-24 rounded border border-zinc-200 pl-1.5 pr-6 text-xs"
            defaultValue=""
          >
            <option value="" disabled>
              Weight
            </option>
            {FONT_WEIGHT_OPTIONS.map((weight) => (
              <option key={weight.value} value={String(weight.value)}>
                {weight.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Font size"
            onChange={(event) => applyTextStyle({ fontSize: `${event.target.value}px` })}
            className="h-7 w-14 rounded border border-zinc-200 px-1 text-xs"
            defaultValue=""
          >
            <option value="" disabled>
              Size
            </option>
            {[12, 14, 16, 18, 22, 28, 34, 42, 56].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <input
            type="color"
            aria-label="Text color"
            title="글자색"
            onChange={(event) => editor.chain().focus().setColor(event.target.value).run()}
            className="resume-rich-color-input size-7 shrink-0 cursor-pointer rounded border border-zinc-200 bg-white p-0.5"
          />
          <input
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
