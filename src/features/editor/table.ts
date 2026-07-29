import type { CSSProperties } from "react";
import type { ResumeComponent } from "@/types/project";

export type TableCell = {
  text: string;
  backgroundColor?: string;
};

export type TableData = TableCell[][];

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

export function resizeTableData(data: TableData, rows: number, cols: number) {
  return Array.from({ length: rows }, (_, rowIndex) =>
    Array.from({ length: cols }, (_, colIndex) => ({
      text: data[rowIndex]?.[colIndex]?.text ?? "",
      backgroundColor: data[rowIndex]?.[colIndex]?.backgroundColor,
    })),
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

export function getTableGridStyle(component: ResumeComponent): CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: `repeat(${getTableCols(component)}, minmax(0, 1fr))`,
    gridAutoRows: "minmax(42px, 1fr)",
    width: "100%",
    height: "100%",
    borderRadius: Number(component.props.borderRadius ?? 6),
    overflow: "hidden",
    border: `1px solid ${String(component.props.borderColor ?? "#d4d4d8")}`,
    backgroundColor: String(component.props.backgroundColor ?? "#ffffff"),
  };
}
