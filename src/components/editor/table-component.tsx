"use client";

import type {
  ClipboardEvent as ReactClipboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useState } from "react";
import {
  clearTableRange,
  extractTableRange,
  getSelectedTableCell,
  getSelectedTableRange,
  getTableColWidths,
  getTableCols,
  getTableGridStyle,
  getTableRowHeights,
  getTableRows,
  insertTableCol,
  insertTableRow,
  isMultiCellRange,
  parseTsvToTableData,
  pasteTableRange,
  parseTableData,
  serializeTableData,
  serializeTableRangeAsTsv,
  serializeTableSizes,
  type TableData,
  updateTableCellText,
} from "@/features/editor/table";
import { cn } from "@/lib/utils/cn";
import type { ResumeComponent } from "@/types/project";

const TABLE_CLIPBOARD_MIME = "application/x-resumeself-table";

export function TableComponent({
  component,
  preview,
  isSelected: isTableSelected,
  onSelect,
  onUpdate,
  onResizeStart,
  interactionScale = 1,
}: {
  component: ResumeComponent;
  preview: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (patch: Partial<ResumeComponent>) => void;
  onResizeStart?: () => void;
  interactionScale?: number;
}) {
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    row: number;
    col: number;
  } | null>(null);
  const [cellDragStart, setCellDragStart] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [focusedCell, setFocusedCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const data = parseTableData(component);
  const rows = getTableRows(component);
  const cols = getTableCols(component);
  const selectedCell = getSelectedTableCell(component);
  const selectedRange = getSelectedTableRange(component);
  const rowHeights = getTableRowHeights(component);
  const colWidths = getTableColWidths(component);

  function selectCell(row: number, col: number) {
    onSelect();
    onUpdate({
      props: {
        ...component.props,
        selectedCellRow: row,
        selectedCellCol: col,
        selectedCellStartRow: row,
        selectedCellStartCol: col,
        selectedCellEndRow: row,
        selectedCellEndCol: col,
      },
    });
  }

  function selectCellRange(
    start: { row: number; col: number },
    end: { row: number; col: number },
  ) {
    onSelect();
    onUpdate({
      props: {
        ...component.props,
        selectedCellRow: end.row,
        selectedCellCol: end.col,
        selectedCellStartRow: start.row,
        selectedCellStartCol: start.col,
        selectedCellEndRow: end.row,
        selectedCellEndCol: end.col,
      },
    });
  }

  function updateCell(row: number, col: number, text: string) {
    onUpdate({
      props: {
        ...component.props,
        selectedCellRow: row,
        selectedCellCol: col,
        selectedCellStartRow: row,
        selectedCellStartCol: col,
        selectedCellEndRow: row,
        selectedCellEndCol: col,
        tableData: serializeTableData(updateTableCellText(data, row, col, text)),
      },
    });
  }

  function readClipboardTableData(event: ReactClipboardEvent<HTMLDivElement>) {
    const serialized = event.clipboardData.getData(TABLE_CLIPBOARD_MIME);
    const plainText = event.clipboardData.getData("text/plain");

    if (serialized) {
      try {
        const parsed = JSON.parse(serialized) as TableData;
        if (Array.isArray(parsed) && Array.isArray(parsed[0])) {
          return parsed;
        }
      } catch {
        return null;
      }
    }

    if (
      plainText.includes("\t") ||
      plainText.includes("\n") ||
      isMultiCellRange(selectedRange)
    ) {
      return parseTsvToTableData(plainText);
    }

    return null;
  }

  function copySelectedRange(event: ReactClipboardEvent<HTMLDivElement>) {
    if (preview || !isTableSelected || !isMultiCellRange(selectedRange)) {
      return false;
    }

    const copiedData = extractTableRange(data, selectedRange);
    event.clipboardData.setData(
      TABLE_CLIPBOARD_MIME,
      JSON.stringify(copiedData),
    );
    event.clipboardData.setData(
      "text/plain",
      serializeTableRangeAsTsv(copiedData),
    );
    event.preventDefault();
    event.stopPropagation();
    return true;
  }

  function cutSelectedRange(event: ReactClipboardEvent<HTMLDivElement>) {
    if (!copySelectedRange(event)) {
      return;
    }

    onUpdate({
      props: {
        ...component.props,
        tableData: serializeTableData(clearTableRange(data, selectedRange)),
      },
    });
  }

  function pasteSelectedRange(event: ReactClipboardEvent<HTMLDivElement>) {
    if (preview || !isTableSelected) {
      return;
    }

    const clipboardData = readClipboardTableData(event);
    if (!clipboardData) {
      return;
    }

    const startRow = selectedRange.startRow;
    const startCol = selectedRange.startCol;
    const pastedRows = clipboardData.length;
    const pastedCols = Math.max(
      1,
      ...clipboardData.map((row) => row.length),
    );
    const endRow = Math.min(rows - 1, startRow + pastedRows - 1);
    const endCol = Math.min(cols - 1, startCol + pastedCols - 1);

    onUpdate({
      props: {
        ...component.props,
        tableData: serializeTableData(
          pasteTableRange(data, startRow, startCol, clipboardData),
        ),
        selectedCellRow: startRow,
        selectedCellCol: startCol,
        selectedCellStartRow: startRow,
        selectedCellStartCol: startCol,
        selectedCellEndRow: endRow,
        selectedCellEndCol: endCol,
      },
    });
    event.preventDefault();
    event.stopPropagation();
  }

  function addRow(index: number) {
    const nextData = insertTableRow(data, index, cols);
    const nextRowHeights = [
      ...rowHeights.slice(0, index),
      Math.max(42, component.height / Math.max(1, rows + 1)),
      ...rowHeights.slice(index),
    ];
    const nextHeight = nextRowHeights.reduce(
      (total, height) => total + height,
      0,
    );

    onUpdate({
      height: nextHeight,
      props: {
        ...component.props,
        tableRows: rows + 1,
        tableRowHeights: serializeTableSizes(nextRowHeights),
        tableData: serializeTableData(nextData),
        selectedCellRow: index,
        selectedCellCol: Math.min(selectedCell.col, cols - 1),
      },
    });
    setMenu(null);
  }

  function addCol(index: number) {
    const nextData = insertTableCol(data, index);
    const nextColWidths = [
      ...colWidths.slice(0, index),
      Math.max(72, component.width / Math.max(1, cols + 1)),
      ...colWidths.slice(index),
    ];
    const nextWidth = nextColWidths.reduce((total, width) => total + width, 0);

    onUpdate({
      width: nextWidth,
      props: {
        ...component.props,
        tableCols: cols + 1,
        tableColWidths: serializeTableSizes(nextColWidths),
        tableData: serializeTableData(nextData),
        selectedCellRow: Math.min(selectedCell.row, rows - 1),
        selectedCellCol: index,
      },
    });
    setMenu(null);
  }

  function resizeRow(index: number, deltaY: number) {
    const nextHeights = rowHeights.map((height, rowIndex) =>
      rowIndex === index ? Math.max(24, height + deltaY) : height,
    );
    const nextHeight = nextHeights.reduce((total, height) => total + height, 0);

    onUpdate({
      height: nextHeight,
      props: {
        ...component.props,
        tableRowHeights: serializeTableSizes(nextHeights),
      },
    });
  }

  function resizeCol(index: number, deltaX: number) {
    const nextWidths = colWidths.map((width, colIndex) =>
      colIndex === index ? Math.max(32, width + deltaX) : width,
    );
    const nextWidth = nextWidths.reduce((total, width) => total + width, 0);

    onUpdate({
      width: nextWidth,
      props: {
        ...component.props,
        tableColWidths: serializeTableSizes(nextWidths),
      },
    });
  }

  function startTableResize(
    event: ReactPointerEvent<HTMLButtonElement>,
    axis: "row" | "col",
    index: number,
  ) {
    event.preventDefault();
    event.stopPropagation();
    onResizeStart?.();

    const startX = event.clientX;
    const startY = event.clientY;

    function handlePointerMove(pointerEvent: PointerEvent) {
      if (axis === "row") {
        resizeRow(index, (pointerEvent.clientY - startY) / interactionScale);
        return;
      }

      resizeCol(index, (pointerEvent.clientX - startX) / interactionScale);
    }

    function handlePointerUp() {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  function startCellRangeSelection(row: number, col: number) {
    if (preview) {
      return;
    }

    const start = { row, col };
    setCellDragStart(start);
    selectCellRange(start, start);

    function handlePointerUp() {
      setCellDragStart(null);
      window.removeEventListener("pointerup", handlePointerUp);
    }

    window.addEventListener("pointerup", handlePointerUp);
  }

  function extendCellRangeSelection(row: number, col: number) {
    if (!cellDragStart || preview) {
      return;
    }

    selectCellRange(cellDragStart, { row, col });
  }

  return (
    <div
      className="relative h-full w-full"
      onCopyCapture={copySelectedRange}
      onCutCapture={cutSelectedRange}
      onPasteCapture={pasteSelectedRange}
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
          const isFocused =
            focusedCell?.row === rowIndex && focusedCell.col === colIndex;
          const shouldShowCellSelection =
            isTableSelected && (Boolean(focusedCell) || Boolean(cellDragStart));
          const isInSelectedRange =
            shouldShowCellSelection &&
            rowIndex >= selectedRange.startRow &&
            rowIndex <= selectedRange.endRow &&
            colIndex >= selectedRange.startCol &&
            colIndex <= selectedRange.endCol;

          return (
            <textarea
              key={`${rowIndex}-${colIndex}`}
              readOnly={preview}
              value={cell.text}
              onPointerDown={(event) => {
                event.stopPropagation();
                startCellRangeSelection(rowIndex, colIndex);
              }}
              onPointerEnter={() => extendCellRangeSelection(rowIndex, colIndex)}
              onFocus={() => setFocusedCell({ row: rowIndex, col: colIndex })}
              onBlur={() => setFocusedCell(null)}
              onMouseDown={(event) => {
                event.stopPropagation();
              }}
              onDragStart={(event) => event.preventDefault()}
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
                isInSelectedRange &&
                  !preview &&
                  "bg-emerald-50 ring-1 ring-inset ring-emerald-300",
                isSelected &&
                  isFocused &&
                  !preview &&
                  "ring-2 ring-emerald-500",
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
                textAlign: cell.textAlign ?? "left",
              }}
            />
          );
        }),
      )}
      {!preview
        ? colWidths.slice(0, -1).map((_, colIndex) => (
            <button
              key={`col-resize-${colIndex}`}
              type="button"
              data-editor-control="true"
              aria-label="열 너비 조절"
              className="absolute top-0 z-40 h-full w-2 -translate-x-1 cursor-col-resize bg-transparent hover:bg-emerald-400/30"
              style={{
                left: colWidths
                  .slice(0, colIndex + 1)
                  .reduce((total, width) => total + width, 0),
              }}
              onPointerDown={(event) => startTableResize(event, "col", colIndex)}
            />
          ))
        : null}
      {!preview
        ? rowHeights.slice(0, -1).map((_, rowIndex) => (
            <button
              key={`row-resize-${rowIndex}`}
              type="button"
              data-editor-control="true"
              aria-label="행 높이 조절"
              className="absolute left-0 z-40 h-2 w-full -translate-y-1 cursor-row-resize bg-transparent hover:bg-emerald-400/30"
              style={{
                top: rowHeights
                  .slice(0, rowIndex + 1)
                  .reduce((total, height) => total + height, 0),
              }}
              onPointerDown={(event) => startTableResize(event, "row", rowIndex)}
            />
          ))
        : null}
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
