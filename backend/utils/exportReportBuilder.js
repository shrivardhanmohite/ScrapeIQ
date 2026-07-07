import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

const PURPLE = "6D28D9";
const PURPLE_DARK = "2E1065";
const PURPLE_LIGHT = "F3E8FF";
const BORDER = { style: "thin", color: { argb: "FFE5E7EB" } };

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function stringify(value) {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(stringify).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function escapeHtml(value) {
  return stringify(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getDomain(source) {
  const url = typeof source === "string" ? source : source?.url || source?.href || "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url || "Unknown source";
  }
}

function normalizeSources(payload) {
  const rawSources = asArray(payload.sourceUrls).length ? payload.sourceUrls : asArray(payload.sources);
  const seen = new Set();

  return rawSources
    .map((source, index) => {
      const url = typeof source === "string" ? source : source?.url || source?.href || "";
      if (!url || seen.has(url)) return null;
      seen.add(url);

      return {
        name: typeof source === "object" ? source.name || source.title || `Source ${index + 1}` : `Source ${index + 1}`,
        domain: getDomain(url),
        url
      };
    })
    .filter(Boolean);
}

export function buildInsights(payload = {}) {
  if (Array.isArray(payload.insights) && payload.insights.length) {
    return payload.insights.map(stringify).filter(Boolean).slice(0, 8);
  }

  const answer = stringify(payload.answer);
  const bullets = answer
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter((line) => line.length > 20)
    .slice(0, 5);

  if (bullets.length) return bullets;

  return [
    `Dataset contains ${asArray(payload.data).length} extracted rows.`,
    `Report includes ${normalizeSources(payload).length} source references.`,
    `Image assets found: ${asArray(payload.images).length}.`
  ];
}

function buildSummaryRows(payload, rows, sources, insights) {
  return [
    ["Query", payload.query || "Untitled dataset"],
    ["Created Date", payload.createdAt ? new Date(payload.createdAt).toLocaleString() : new Date().toLocaleString()],
    ["Total Rows", rows.length],
    ["Total Sources", sources.length],
    ["Total Images", asArray(payload.images).length],
    ["Total Charts", asArray(payload.charts).length],
    ["Workspace Name", payload.workspaceName || "Default"],
    ["Key Insight Count", insights.length]
  ];
}

function styleHeaderRow(row) {
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${PURPLE_DARK}` } };
    cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
    cell.alignment = { vertical: "middle", wrapText: true };
    cell.border = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER };
  });
}

function autoFitColumns(worksheet, minWidth = 12, maxWidth = 48) {
  worksheet.columns.forEach((column) => {
    let width = minWidth;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const text = typeof cell.value === "object" && cell.value?.text ? cell.value.text : stringify(cell.value);
      width = Math.max(width, Math.min(maxWidth, text.length + 2));
    });
    column.width = width;
  });
}

function styleBodyRows(worksheet, startRow = 2) {
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber < startRow) return;
    row.eachCell((cell) => {
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER };
      if (rowNumber % 2 === 0) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      }
    });
  });
}

function addSummarySheet(workbook, payload, rows, sources, insights) {
  const sheet = workbook.addWorksheet("Dataset Summary", {
    views: [{ state: "frozen", ySplit: 1 }]
  });

  sheet.mergeCells("A1:D1");
  sheet.getCell("A1").value = "AI Scraping Report";
  sheet.getCell("A1").font = { bold: true, size: 22, color: { argb: "FFFFFFFF" } };
  sheet.getCell("A1").alignment = { vertical: "middle", horizontal: "center" };
  sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${PURPLE}` } };
  sheet.getRow(1).height = 34;

  buildSummaryRows(payload, rows, sources, insights).forEach(([label, value], index) => {
    const row = sheet.getRow(index + 3);
    row.values = [label, value];
    row.getCell(1).font = { bold: true, color: { argb: `FF${PURPLE_DARK}` } };
    row.getCell(2).font = { bold: index === 0 };
    row.eachCell((cell) => {
      cell.border = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER };
      cell.alignment = { wrapText: true, vertical: "middle" };
    });
  });

  sheet.columns = [{ width: 24 }, { width: 60 }, { width: 18 }, { width: 18 }];
}

function addDataSheet(workbook, rows) {
  const sheet = workbook.addWorksheet("Extracted Data", {
    views: [{ state: "frozen", ySplit: 1 }]
  });
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row || {})))];

  if (!columns.length) {
    sheet.addRow(["No extracted rows available"]);
    return;
  }

  sheet.addTable({
    name: "ExtractedDataTable",
    ref: "A1",
    headerRow: true,
    totalsRow: false,
    style: {
      theme: "TableStyleMedium5",
      showRowStripes: true
    },
    columns: columns.map((column) => ({ name: column, filterButton: true })),
    rows: rows.map((row) => columns.map((column) => stringify(row?.[column])))
  });

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, rows.length + 1), column: columns.length }
  };

  styleHeaderRow(sheet.getRow(1));
  styleBodyRows(sheet);
  autoFitColumns(sheet);
}

function addInsightsSheet(workbook, payload, insights) {
  const sheet = workbook.addWorksheet("AI Insights", {
    views: [{ state: "frozen", ySplit: 1 }]
  });

  sheet.addRow(["AI Insights"]);
  styleHeaderRow(sheet.getRow(1));
  sheet.addRow(["Summary", payload.answer || "No summary available."]);
  sheet.addRow([]);
  sheet.addRow(["Key Findings"]);
  styleHeaderRow(sheet.getRow(4));

  insights.forEach((insight) => sheet.addRow([insight]));
  sheet.addRow([]);
  sheet.addRow(["Recommendations"]);
  styleHeaderRow(sheet.lastRow);
  sheet.addRow(["Review high-signal rows, validate source credibility, and reuse this workbook for stakeholder review."]);

  styleBodyRows(sheet, 2);
  sheet.columns = [{ width: 110 }];
}

function addSourcesSheet(workbook, sources) {
  const sheet = workbook.addWorksheet("Sources", {
    views: [{ state: "frozen", ySplit: 1 }]
  });

  sheet.columns = [
    { header: "Source Name", key: "name", width: 24 },
    { header: "Domain", key: "domain", width: 28 },
    { header: "URL", key: "url", width: 70 }
  ];
  styleHeaderRow(sheet.getRow(1));

  sources.forEach((source) => {
    const row = sheet.addRow({
      name: source.name,
      domain: source.domain,
      url: source.url
    });
    row.getCell("url").value = { text: source.url, hyperlink: source.url };
    row.getCell("url").font = { color: { argb: "FF2563EB" }, underline: true };
  });

  sheet.autoFilter = "A1:C1";
  styleBodyRows(sheet);
  autoFitColumns(sheet);
}

export async function buildExcelReportBuffer(payload = {}) {
  const workbook = new ExcelJS.Workbook();
  const rows = asArray(payload.data);
  const sources = normalizeSources(payload);
  const insights = buildInsights(payload);

  workbook.creator = "AI Scraping Agent";
  workbook.created = new Date();
  workbook.modified = new Date();

  addSummarySheet(workbook, payload, rows, sources, insights);
  addDataSheet(workbook, rows);
  addInsightsSheet(workbook, payload, insights);
  addSourcesSheet(workbook, sources);

  return workbook.xlsx.writeBuffer();
}

export function buildPdfReportBuffer(payload = {}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 44, bufferPages: true });
      const chunks = [];
      const rows = asArray(payload.data);
      const sources = normalizeSources(payload);
      const insights = buildInsights(payload);

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      doc.fillColor(`#${PURPLE}`).fontSize(22).font("Helvetica-Bold").text("AI Scraping Report");
      doc.moveDown(0.4);
      doc.fillColor("#111827").fontSize(13).font("Helvetica-Bold").text(payload.query || "Untitled dataset");
      doc.moveDown(0.6);
      doc.font("Helvetica").fontSize(10).text(`Rows: ${rows.length}   Sources: ${sources.length}   Images: ${asArray(payload.images).length}   Charts: ${asArray(payload.charts).length}`);
      doc.moveDown();

      doc.font("Helvetica-Bold").fontSize(14).text("Summary");
      doc.font("Helvetica").fontSize(10).text(payload.answer || "No summary available.", { lineGap: 3 });
      doc.moveDown();

      doc.font("Helvetica-Bold").fontSize(14).text("Key Insights");
      insights.slice(0, 8).forEach((insight) => doc.font("Helvetica").fontSize(10).text(`- ${insight}`, { lineGap: 2 }));
      doc.moveDown();

      if (asArray(payload.charts).length) {
        doc.font("Helvetica-Bold").fontSize(14).text("Charts");
        asArray(payload.charts).slice(0, 5).forEach((chart) => {
          doc.font("Helvetica").fontSize(10).text(`- ${chart.title || chart.type || "Chart"}`);
        });
        doc.moveDown();
      }

      if (rows.length) {
        doc.font("Helvetica-Bold").fontSize(14).text("Table Preview");
        const columns = Object.keys(rows[0] || {}).slice(0, 5);
        doc.font("Helvetica-Bold").fontSize(9).text(columns.join(" | "));
        rows.slice(0, 10).forEach((row) => {
          doc.font("Helvetica").fontSize(8).text(columns.map((column) => stringify(row[column]).slice(0, 32)).join(" | "));
        });
        doc.moveDown();
      }

      doc.font("Helvetica-Bold").fontSize(14).text("Sources");
      sources.slice(0, 12).forEach((source) => doc.font("Helvetica").fontSize(9).text(`- ${source.domain}: ${source.url}`));

      const pages = doc.bufferedPageRange().count;
      for (let i = 0; i < pages; i += 1) {
        doc.switchToPage(i);
        doc.fontSize(8).fillColor("#6B7280").text(`Page ${i + 1} of ${pages}`, 44, doc.page.height - 34, { align: "center" });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export function buildReportEmailHtml(payload = {}) {
  const rows = asArray(payload.data);
  const sources = normalizeSources(payload);
  const insights = buildInsights(payload);

  return `
    <div style="margin:0;background:#f8fafc;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
        <div style="background:#6d28d9;color:#ffffff;padding:24px;">
          <div style="font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">AI Scraping Report</div>
          <h1 style="margin:8px 0 0;font-size:24px;line-height:1.25;">${escapeHtml(payload.query || "Untitled dataset")}</h1>
        </div>
        <div style="padding:24px;">
          <h2 style="font-size:16px;margin:0 0 8px;color:#2e1065;">Summary</h2>
          <p style="margin:0 0 18px;line-height:1.6;color:#374151;">${escapeHtml(payload.answer || "No summary available.")}</p>

          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:18px 0;border-collapse:separate;border-spacing:8px;">
            <tr>
              ${[
              ["Rows", rows.length],
              ["Sources", sources.length],
              ["Images", asArray(payload.images).length]
            ].map(([label, value]) => `
              <td style="border:1px solid #ede9fe;background:#faf5ff;border-radius:12px;padding:14px;width:33.33%;">
                <div style="font-size:12px;color:#6b21a8;font-weight:700;">${label}</div>
                <div style="font-size:22px;font-weight:800;color:#2e1065;">${value}</div>
              </td>
            `).join("")}
            </tr>
          </table>

          <h2 style="font-size:16px;margin:20px 0 8px;color:#2e1065;">Key Insights</h2>
          <ul style="margin:0 0 18px;padding-left:20px;color:#374151;line-height:1.6;">
            ${insights.slice(0, 6).map((insight) => `<li>${escapeHtml(insight)}</li>`).join("")}
          </ul>

          <h2 style="font-size:16px;margin:20px 0 8px;color:#2e1065;">Sources</h2>
          <div style="line-height:1.8;">
            ${sources.slice(0, 8).map((source) => `
              <a href="${escapeHtml(source.url)}" style="display:inline-block;margin:0 6px 8px 0;padding:6px 10px;border-radius:999px;background:#ede9fe;color:#5b21b6;text-decoration:none;font-size:13px;font-weight:700;">${escapeHtml(source.domain)}</a>
            `).join("")}
          </div>
        </div>
      </div>
    </div>
  `;
}

export function buildReportText(payload = {}) {
  const rows = asArray(payload.data);
  const sources = normalizeSources(payload);
  const insights = buildInsights(payload);

  return [
    `Query: ${payload.query || "Untitled dataset"}`,
    "",
    `Summary: ${payload.answer || "No summary available."}`,
    "",
    `Statistics: Rows ${rows.length}, Sources ${sources.length}, Images ${asArray(payload.images).length}`,
    "",
    "Key Insights:",
    ...insights.slice(0, 6).map((insight) => `- ${insight}`),
    "",
    "Sources:",
    ...sources.slice(0, 8).map((source) => `- ${source.domain}: ${source.url}`)
  ].join("\n");
}

export function buildReportFilename(query = "dataset") {
  return stringify(query)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "dataset";
}
