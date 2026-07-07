export function normalizeRows(value) {
  if (Array.isArray(value)) {
    return value.filter((row) => row && typeof row === "object" && !Array.isArray(row));
  }

  if (typeof value === "string") {
    try {
      return normalizeRows(JSON.parse(value));
    } catch {
      return [];
    }
  }

  if (value && typeof value === "object") {
    for (const key of ["data", "items", "results", "rows", "table"]) {
      if (Array.isArray(value[key])) {
        return normalizeRows(value[key]);
      }
    }
  }

  return [];
}

export function normalizeTableRows(table) {
  if (!table) {
    return [];
  }

  if (Array.isArray(table)) {
    return table;
  }

  if (Array.isArray(table.rows)) {
    return table.rows;
  }

  if (Array.isArray(table.data)) {
    return table.data;
  }

  return [];
}

export function buildRowsFromArrayTable(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  const headerRow = rows[0];
  const hasHeaders =
    Array.isArray(headerRow) &&
    headerRow.every((cell) => typeof cell === "string" && cell.trim() !== "");

  if (hasHeaders && rows.length > 1) {
    const headers = headerRow.map((cell) => String(cell).trim() || "column");
    return rows
      .slice(1)
      .map((row) => {
        return headers.reduce((obj, header, index) => {
          obj[header] = row?.[index] ?? "";
          return obj;
        }, {});
      })
      .filter((row) => row && typeof row === "object");
  }

  return rows
    .map((row, index) => {
      if (!Array.isArray(row)) return {};
      return row.reduce((obj, cell, cellIndex) => {
        obj[`col_${cellIndex + 1}`] = cell;
        return obj;
      }, { index: index + 1 });
    })
    .filter((row) => row && typeof row === "object");
}

export function getDatasetRows(dataset = {}) {
  const normalizedData = normalizeRows(dataset.data);
  if (normalizedData.length > 0) {
    return normalizedData;
  }

  const tables = Array.isArray(dataset.tables) ? dataset.tables : [];
  return tables.flatMap((table) => buildRowsFromArrayTable(normalizeTableRows(table)));
}

export function getNumericColumns(data = []) {
  return [...new Set(data.flatMap((row) => Object.keys(row)))].filter((col) =>
    data.some((row) => !Number.isNaN(parseFloat(row[col])) && row[col] !== "")
  );
}

export function getColumnStats(data = [], col) {
  const values = data
    .map((row) => parseFloat(row[col]))
    .filter((value) => !Number.isNaN(value));

  if (values.length === 0) {
    return null;
  }

  const sum = values.reduce((acc, value) => acc + value, 0);

  return {
    column: col,
    count: values.length,
    avg: sum / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

export function getAnalytics(data = []) {
  const rowCount = data.length;
  const columns = [...new Set(data.flatMap((row) => Object.keys(row)))];
  const numericColumns = getNumericColumns(data);

  const numericStats = numericColumns
    .map((col) => getColumnStats(data, col))
    .filter(Boolean);

  const categoricalColumns = columns.filter((col) => !numericColumns.includes(col));
  const uniqueCategories = categoricalColumns.map((col) => ({
    column: col,
    count: new Set(
      data
        .map((row) => row[col])
        .filter((value) => value !== undefined && value !== null && String(value).trim() !== "")
    ).size,
  }));

  return {
    rowCount,
    numericStats,
    uniqueCategories,
  };
}
