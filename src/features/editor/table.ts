import type { CSSProperties } from "react";
import type { ResumeComponent } from "@/types/project";

export type TableCell = {
  text: string;
  backgroundColor?: string;
  textAlign?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  color?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: number;
  letterSpacing?: number;
};

export type TableData = TableCell[][];

export type TableRange = ReturnType<typeof getSelectedTableRange>;

export function createDefaultTableData(rows = 2, cols = 2): TableData {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ text: "" })),
  );
}

export function parseTableData(component: ResumeComponent): TableData {
  const rows = getTableRows(component);
  const cols = getTableCols(component);

  try {
    const parsed = JSON.parse(String(component.props.tableData ?? "[]"));
    if (!Array.isArray(parsed)) {
      return createDefaultTableData(rows, cols);
    }

    return resizeTableData(
      parsed.map((row) =>
        Array.isArray(row)
          ? row.map((cell) =>
              typeof cell === "object" && cell
                ? {
                    text: String((cell as TableCell).text ?? ""),
                    backgroundColor:
                      typeof (cell as TableCell).backgroundColor === "string"
                        ? (cell as TableCell).backgroundColor
                        : undefined,
                    textAlign:
                      (cell as TableCell).textAlign === "center" ||
                      (cell as TableCell).textAlign === "right" ||
                      (cell as TableCell).textAlign === "left"
                        ? (cell as TableCell).textAlign
                        : undefined,
                    verticalAlign:
                      (cell as TableCell).verticalAlign === "middle" ||
                      (cell as TableCell).verticalAlign === "bottom" ||
                      (cell as TableCell).verticalAlign === "top"
                        ? (cell as TableCell).verticalAlign
                        : undefined,
                    color:
                      typeof (cell as TableCell).color === "string"
                        ? (cell as TableCell).color
                        : undefined,
                    fontFamily:
                      typeof (cell as TableCell).fontFamily === "string"
                        ? (cell as TableCell).fontFamily
                        : undefined,
                    fontSize:
                      Number.isFinite(Number((cell as TableCell).fontSize))
                        ? Number((cell as TableCell).fontSize)
                        : undefined,
                    fontWeight:
                      Number.isFinite(Number((cell as TableCell).fontWeight))
                        ? Number((cell as TableCell).fontWeight)
                        : undefined,
                    lineHeight:
                      Number.isFinite(Number((cell as TableCell).lineHeight))
                        ? Number((cell as TableCell).lineHeight)
                        : undefined,
                    letterSpacing:
                      Number.isFinite(Number((cell as TableCell).letterSpacing))
                        ? Number((cell as TableCell).letterSpacing)
                        : undefined,
                  }
                : { text: String(cell ?? "") },
            )
          : [],
      ),
      rows,
      cols,
    );
  } catch {
    return createDefaultTableData(rows, cols);
  }
}

export function serializeTableData(data: TableData) {
  return JSON.stringify(data);
}

export function getTableRows(component: ResumeComponent) {
  return Math.max(1, Math.min(50, Number(component.props.tableRows ?? 2)));
}

export function getTableCols(component: ResumeComponent) {
  return Math.max(1, Math.min(20, Number(component.props.tableCols ?? 2)));
}

export function getSelectedTableCell(component: ResumeComponent) {
  return {
    row: Math.max(0, Number(component.props.selectedCellRow ?? 0)),
    col: Math.max(0, Number(component.props.selectedCellCol ?? 0)),
  };
}

export function getSelectedTableRange(component: ResumeComponent) {
  const selectedCell = getSelectedTableCell(component);
  const startRow = Math.max(
    0,
    Number(component.props.selectedCellStartRow ?? selectedCell.row),
  );
  const startCol = Math.max(
    0,
    Number(component.props.selectedCellStartCol ?? selectedCell.col),
  );
  const endRow = Math.max(
    0,
    Number(component.props.selectedCellEndRow ?? selectedCell.row),
  );
  const endCol = Math.max(
    0,
    Number(component.props.selectedCellEndCol ?? selectedCell.col),
  );

  return {
    startRow: Math.min(startRow, endRow),
    endRow: Math.max(startRow, endRow),
    startCol: Math.min(startCol, endCol),
    endCol: Math.max(startCol, endCol),
  };
}

function parseSizeList(value: unknown, count: number, total: number) {
  try {
    const parsed = JSON.parse(String(value ?? "[]"));
    if (!Array.isArray(parsed)) {
      throw new Error("Invalid size list");
    }

    const fallback = Math.max(24, total / Math.max(1, count));
    return Array.from({ length: count }, (_, index) => {
      const size = Number(parsed[index]);
      return Number.isFinite(size) && size > 0 ? size : fallback;
    });
  } catch {
    const fallback = Math.max(24, total / Math.max(1, count));
    return Array.from({ length: count }, () => fallback);
  }
}

export function serializeTableSizes(sizes: number[]) {
  return JSON.stringify(sizes.map((size) => Math.max(12, Math.round(size))));
}

export function getTableRowHeights(component: ResumeComponent) {
  return parseSizeList(
    component.props.tableRowHeights,
    getTableRows(component),
    component.height,
  );
}

export function getTableColWidths(component: ResumeComponent) {
  return parseSizeList(
    component.props.tableColWidths,
    getTableCols(component),
    component.width,
  );
}

export function resizeTableData(data: TableData, rows: number, cols: number) {
  return Array.from({ length: rows }, (_, rowIndex) =>
    Array.from({ length: cols }, (_, colIndex) => ({
      text: data[rowIndex]?.[colIndex]?.text ?? "",
      backgroundColor: data[rowIndex]?.[colIndex]?.backgroundColor,
      textAlign: data[rowIndex]?.[colIndex]?.textAlign,
      verticalAlign: data[rowIndex]?.[colIndex]?.verticalAlign,
      color: data[rowIndex]?.[colIndex]?.color,
      fontFamily: data[rowIndex]?.[colIndex]?.fontFamily,
      fontSize: data[rowIndex]?.[colIndex]?.fontSize,
      fontWeight: data[rowIndex]?.[colIndex]?.fontWeight,
      lineHeight: data[rowIndex]?.[colIndex]?.lineHeight,
      letterSpacing: data[rowIndex]?.[colIndex]?.letterSpacing,
    })),
  );
}

export function isMultiCellRange(range: TableRange) {
  return range.startRow !== range.endRow || range.startCol !== range.endCol;
}

export function extractTableRange(data: TableData, range: TableRange) {
  return data
    .slice(range.startRow, range.endRow + 1)
    .map((row) =>
      row
        .slice(range.startCol, range.endCol + 1)
        .map((cell) => ({ ...cell })),
    );
}

export function serializeTableRangeAsTsv(data: TableData) {
  return data
    .map((row) =>
      row
        .map((cell) =>
          cell.text
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .replace(/\t/g, " "),
        )
        .join("\t"),
    )
    .join("\n");
}

export function parseTsvToTableData(value: string) {
  const normalized = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return normalized.split("\n").map((row) =>
    row.split("\t").map((text) => ({
      text,
    })),
  );
}

export function clearTableRange(data: TableData, range: TableRange) {
  return data.map((row, rowIndex) =>
    row.map((cell, colIndex) =>
      rowIndex >= range.startRow &&
      rowIndex <= range.endRow &&
      colIndex >= range.startCol &&
      colIndex <= range.endCol
        ? { ...cell, text: "" }
        : cell,
    ),
  );
}

export function pasteTableRange(
  data: TableData,
  startRow: number,
  startCol: number,
  source: TableData,
) {
  return data.map((row, rowIndex) =>
    row.map((cell, colIndex) => {
      const sourceRow = rowIndex - startRow;
      const sourceCol = colIndex - startCol;
      const nextCell = source[sourceRow]?.[sourceCol];

      if (!nextCell) {
        return cell;
      }

      return {
        ...cell,
        ...nextCell,
      };
    }),
  );
}

export function hasTrimmedTableContent(
  data: TableData,
  rows: number,
  cols: number,
) {
  return data.some((row, rowIndex) =>
    row.some(
      (cell, colIndex) =>
        (rowIndex >= rows || colIndex >= cols) && cell.text.trim().length > 0,
    ),
  );
}

export function insertTableRow(data: TableData, index: number, cols: number) {
  const row = Array.from({ length: cols }, () => ({ text: "" }));
  return [...data.slice(0, index), row, ...data.slice(index)];
}

export function insertTableCol(data: TableData, index: number) {
  return data.map((row) => [
    ...row.slice(0, index),
    { text: "" },
    ...row.slice(index),
  ]);
}

export function deleteTableRows(data: TableData, startRow: number, endRow: number) {
  const nextData = data.filter(
    (_, rowIndex) => rowIndex < startRow || rowIndex > endRow,
  );

  return nextData.length > 0
    ? nextData
    : [Array.from({ length: Math.max(1, data[0]?.length ?? 1) }, () => ({ text: "" }))];
}

export function deleteTableCols(data: TableData, startCol: number, endCol: number) {
  return data.map((row) => {
    const nextRow = row.filter(
      (_, colIndex) => colIndex < startCol || colIndex > endCol,
    );

    return nextRow.length > 0 ? nextRow : [{ text: "" }];
  });
}

export function reorderTableRow(data: TableData, fromIndex: number, toIndex: number) {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= data.length ||
    toIndex >= data.length
  ) {
    return data;
  }

  const nextData = [...data];
  const [movedRow] = nextData.splice(fromIndex, 1);
  nextData.splice(toIndex, 0, movedRow);
  return nextData;
}

export function reorderTableCol(data: TableData, fromIndex: number, toIndex: number) {
  const colCount = Math.max(1, data[0]?.length ?? 1);
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= colCount ||
    toIndex >= colCount
  ) {
    return data;
  }

  return data.map((row) => {
    const nextRow = [...row];
    const [movedCell] = nextRow.splice(fromIndex, 1);
    nextRow.splice(toIndex, 0, movedCell ?? { text: "" });
    return nextRow;
  });
}

export function reorderTableSize(sizes: number[], fromIndex: number, toIndex: number) {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= sizes.length ||
    toIndex >= sizes.length
  ) {
    return sizes;
  }

  const nextSizes = [...sizes];
  const [movedSize] = nextSizes.splice(fromIndex, 1);
  nextSizes.splice(toIndex, 0, movedSize);
  return nextSizes;
}

export function updateTableCellText(
  data: TableData,
  row: number,
  col: number,
  text: string,
) {
  return data.map((items, rowIndex) =>
    rowIndex === row
      ? items.map((cell, colIndex) =>
          colIndex === col ? { ...cell, text } : cell,
        )
      : items,
  );
}

export function updateTableCellBackground(
  data: TableData,
  row: number,
  col: number,
  backgroundColor: string,
) {
  return data.map((items, rowIndex) =>
    rowIndex === row
      ? items.map((cell, colIndex) =>
          colIndex === col ? { ...cell, backgroundColor } : cell,
        )
      : items,
  );
}

export function updateTableCellRangeTextAlign(
  data: TableData,
  range: ReturnType<typeof getSelectedTableRange>,
  textAlign: "left" | "center" | "right",
) {
  return updateTableCellRangeStyle(data, range, { textAlign });
}

export function updateTableCellRangeStyle(
  data: TableData,
  range: ReturnType<typeof getSelectedTableRange>,
  style: Partial<Omit<TableCell, "text">>,
) {
  return data.map((items, rowIndex) =>
    items.map((cell, colIndex) =>
      rowIndex >= range.startRow &&
      rowIndex <= range.endRow &&
      colIndex >= range.startCol &&
      colIndex <= range.endCol
        ? { ...cell, ...style }
        : cell,
    ),
  );
}

export function getTableGridStyle(component: ResumeComponent): CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: getTableColWidths(component)
      .map((width) => `${Math.max(24, width)}px`)
      .join(" "),
    gridTemplateRows: getTableRowHeights(component)
      .map((height) => `${Math.max(24, height)}px`)
      .join(" "),
    width: "100%",
    height: "100%",
    borderRadius: Number(component.props.borderRadius ?? 6),
    overflow: "hidden",
    border: `1px solid ${String(component.props.borderColor ?? "#d4d4d8")}`,
    backgroundColor: String(component.props.backgroundColor ?? "#ffffff"),
  };
}
