"use client";

import type { MouseEvent as ReactMouseEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { ResumeProject } from "@/types/project";

export function ScrollToc({
  navigation,
  activeTarget,
  onSelect,
  onRename,
  onDelete,
  placement = "floating",
}: {
  navigation: ResumeProject["navigation"];
  activeTarget: string;
  onSelect: (target: string) => void;
  onRename?: (id: string, label: string) => void;
  onDelete?: (id: string) => void;
  placement?: "floating" | "rail";
}) {
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    item: ResumeProject["navigation"][number];
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const canEdit = Boolean(onRename || onDelete);

  useEffect(() => {
    if (!menu) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }

      setMenu(null);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenu(null);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [menu]);

  function openMenu(
    event: ReactMouseEvent<HTMLButtonElement>,
    item: ResumeProject["navigation"][number],
  ) {
    if (!canEdit) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setMenu({
      x: event.clientX,
      y: event.clientY,
      item,
    });
  }

  function renameItem() {
    if (!menu || !onRename) {
      return;
    }

    const nextLabel = window.prompt("목차 이름을 입력하세요.", menu.item.label);
    const trimmedLabel = nextLabel?.trim();

    if (trimmedLabel && trimmedLabel !== menu.item.label) {
      onRename(menu.item.id, trimmedLabel);
    }

    setMenu(null);
  }

  function deleteItem() {
    if (!menu || !onDelete || navigation.length <= 1) {
      return;
    }

    if (window.confirm(`'${menu.item.label}' 페이지를 삭제할까요?`)) {
      onDelete(menu.item.id);
    }

    setMenu(null);
  }

  return (
    <>
      <aside
        className={cn(
          "z-40 p-1 text-right",
          placement === "rail"
            ? "sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto"
            : "fixed right-28 top-1/2 w-20 -translate-y-1/2 sm:right-40 sm:w-24 lg:right-80 lg:w-28",
        )}
      >
        <div className="grid justify-items-end gap-0.5">
          {navigation.map((item) => {
            const isActive = activeTarget === item.target;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.target)}
                onContextMenu={(event) => openMenu(event, item)}
                className={cn(
                  "max-w-full justify-self-end truncate rounded px-1.5 py-1 text-right leading-tight transition hover:bg-zinc-100 hover:text-[12px] hover:font-semibold hover:text-zinc-950",
                  canEdit && "cursor-context-menu",
                  placement === "rail" ? "w-fit" : "w-full",
                  isActive
                    ? "text-[12px] font-semibold text-zinc-950"
                    : "text-[10px] font-medium text-zinc-400",
                )}
                title={item.label}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </aside>
      {menu && canEdit ? (
        <div
          ref={menuRef}
          className="fixed z-[90] grid w-32 overflow-hidden rounded-md border border-zinc-200 bg-white py-1 text-xs shadow-lg"
          style={{
            left: menu.x,
            top: menu.y,
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="px-3 py-2 text-left hover:bg-zinc-50"
            onClick={renameItem}
          >
            이름 변경
          </button>
          <button
            type="button"
            disabled={navigation.length <= 1}
            className={cn(
              "px-3 py-2 text-left text-red-600 hover:bg-red-50",
              navigation.length <= 1 &&
                "cursor-not-allowed text-zinc-300 hover:bg-transparent",
            )}
            onClick={deleteItem}
          >
            삭제
          </button>
        </div>
      ) : null}
    </>
  );
}
