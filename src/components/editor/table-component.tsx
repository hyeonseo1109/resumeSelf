"use client";

import { useState } from "react";
import {
  getSelectedTableCell,
  getTableCols,
  getTableGridStyle,
  getTableRows,
  insertTableCol,
  insertTableRow,
  parseTableData,
  serializeTableData,
  updateTableCellText,
} from "@/features/editor/table";
import { cn } from "@/lib/utils/cn";
import type { ResumeComponent } from "@/types/project";

export function TableComponent({
  component,
  preview,
  onSelect,
  onUpdate,
}: {
  component: ResumeComponent;
  preview: boolean;
  onSelect: () => void;
  onUpdate: (patch: Partial<ResumeComponent>) => void;
}) {
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    row: number;
    col: number;
  } | null>(null);
  const data = parseTableData(component);
  const rows = getTableRows(component);
  const cols = getTableCols(component);
  const selectedCell = getSelectedTableCell(component);

  function selectCell(row: number, col: number) {
    onSelect();
    onUpdate({
      props: {
        ...component.props,
        selectedCellRow: row,
        selectedCellCol: col,
      },
    });
  }

  function updateCell(row: number, col: number, text: string) {
    onUpdate({
      props: {
        ...component.props,
        selectedCellRow: row,
        selectedCellCol: col,
        tableData: serializeTableData(updateTableCellText(data, row, col, text)),
      },
    });
  }

  function addRow(index: number) {
    const nextData = insertTableRow(data, index, cols);
    onUpdate({
      props: {
        ...component.props,
        tableRows: rows + 1,
        tableData: serializeTableData(nextData),
        selectedCellRow: index,
        selectedCellCol: Math.min(selectedCell.col, cols - 1),
      },
    });
    setMenu(null);
  }

  function addCol(index: number) {
    const nextData = insertTableCol(data, index);
    onUpdate({
      props: {
        ...component.props,
        tableCols: cols + 1,
        tableData: serializeTableData(nextData),
        selectedCellRow: Math.min(selectedCell.row, rows - 1),
        selectedCellCol: index,
      },
    });
    setMenu(null);
  }

  return (
    <div
      className="relative h-full w-full"
      onContextMenu={(event) => {
        if (preview) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        onSelect();
        setMenu({
          x: event.nativeEvent.offsetX,
          y: event.nativeEvent.offsetY,
          row: selectedCell.row,
          col: selectedCell.col,
        });
      }}
      style={getTableGridStyle(component)}
    >
      {data.map((row, rowIndex) =>
        row.map((cell, colIndex) => {
          const isSelected =
            selectedCell.row === rowIndex && selectedCell.col === colIndex;

          return (
            <textarea
              key={`${rowIndex}-${colIndex}`}
              readOnly={preview}
              value={cell.text}
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
              onMouseDown={(event) => {
                event.stopPropagation();
                selectCell(rowIndex, colIndex);
              }}
              onContextMenu={(event) => {
                if (preview) {
                  return;
                }
                event.preventDefault();
                event.stopPropagation();
                selectCell(rowIndex, colIndex);
                setMenu({
                  x: event.nativeEvent.offsetX + event.currentTarget.offsetLeft,
                  y: event.nativeEvent.offsetY + event.currentTarget.offsetTop,
                  row: rowIndex,
                  col: colIndex,
                });
              }}
              onChange={(event) =>
                updateCell(rowIndex, colIndex, event.target.value)
              }
              className={cn(
                "min-h-0 resize-none border-b border-r border-zinc-300 bg-transparent p-2 text-sm leading-5 outline-none",
                !preview && "focus:ring-2 focus:ring-emerald-500",
                isSelected && !preview && "ring-2 ring-emerald-500",
              )}
              style={{
                borderRightWidth: colIndex === cols - 1 ? 0 : 1,
                borderBottomWidth: rowIndex === rows - 1 ? 0 : 1,
                backgroundColor:
                  cell.backgroundColor ??
                  String(component.props.cellBackgroundColor ?? "#ffffff"),
                color: String(component.props.color ?? "#111827"),
                fontFamily: String(component.props.fontFamily ?? "Inter"),
                fontSize: Number(component.props.fontSize ?? 14),
                fontWeight: Number(component.props.fontWeight ?? 400),
                lineHeight: `${Number(component.props.lineHeight ?? 150)}%`,
                letterSpacing: Number(component.props.letterSpacing ?? 0),
              }}
            />
          );
        }),
      )}
      {menu && !preview ? (
        <div
          data-editor-control="true"
          className="absolute z-50 grid w-36 overflow-hidden rounded-md border border-zinc-200 bg-white py-1 text-xs shadow-lg"
          style={{
            left: Math.min(menu.x, Math.max(0, component.width - 148)),
            top: Math.min(menu.y, Math.max(0, component.height - 132)),
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="px-3 py-2 text-left hover:bg-zinc-50"
            onClick={() => addRow(menu.row)}
          >
            위에 행 추가
          </button>
          <button
            type="button"
            className="px-3 py-2 text-left hover:bg-zinc-50"
            onClick={() => addRow(menu.row + 1)}
          >
            아래에 행 추가
          </button>
          <button
            type="button"
            className="px-3 py-2 text-left hover:bg-zinc-50"
            onClick={() => addCol(menu.col)}
          >
            왼쪽에 열 추가
          </button>
          <button
            type="button"
            className="px-3 py-2 text-left hover:bg-zinc-50"
            onClick={() => addCol(menu.col + 1)}
          >
            오른쪽에 열 추가
          </button>
        </div>
      ) : null}
    </div>
  );
}
