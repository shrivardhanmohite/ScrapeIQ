import * as cheerio from "cheerio";

export function extractTables(html, options = {}) {
    const { maxTables = 10, maxRows = 50 } = options;
    const $ = cheerio.load(html || "");
    const tables = [];

    $("table").each((tableIndex, table) => {
        if (tables.length >= maxTables) {
            return false;
        }

        const rows = [];

        $(table).find("tr").slice(0, maxRows).each((_, row) => {
            const cells = [];

            $(row).find("th, td").each((__, cell) => {
                const value = $(cell).text().replace(/\s+/g, " ").trim();
                cells.push(value);
            });

            if (cells.some(Boolean)) {
                rows.push(cells);
            }
        });

        if (rows.length > 0) {
            tables.push({
                index: tableIndex,
                rows
            });
        }

        return undefined;
    });

    return tables;
}
