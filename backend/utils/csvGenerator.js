export function convertToCSV(data){

    if(!data || data.length === 0) return "";

    // 🔥 Collect all unique keys
    const keys = [...new Set(data.flatMap(obj => Object.keys(obj)))];

    const header = keys.map(escapeCsvCell).join(",");

    const rows = data.map(obj =>
        keys.map(k => escapeCsvCell(obj[k])).join(",")
    );

    return [header, ...rows].join("\n");
}

function escapeCsvCell(value) {
    const text = String(value ?? "").replace(/"/g, "\"\"");
    return `"${text}"`;
}
