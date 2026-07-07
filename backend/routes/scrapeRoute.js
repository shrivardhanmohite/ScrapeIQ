import express from "express";

import Dataset from "../models/Dataset.js";
import ScrapeJob from "../models/ScrapeJob.js";

import { enqueueScrapeJob } from "../queues/scrapeQueue.js";

import { convertToCSV } from "../utils/csvGenerator.js";

import {
  buildGeneratedImageUrl,
  buildImagePrompts
} from "../utils/imagePromptGenerator.js";

import {
  generateChartSuggestions
} from "../utils/chartGenerator.js";

import {
  sendDatasetMail
} from "../utils/sendMail.js";
import {
  buildExcelReportBuffer,
  buildPdfReportBuffer,
  buildReportEmailHtml,
  buildReportFilename,
  buildReportText
} from "../utils/exportReportBuilder.js";

const router = express.Router();

/* =========================================
   HELPERS
========================================= */

async function getExportRows({

  data,

  datasetId

}) {

  if (Array.isArray(data)) {

    return data;
  }

  if (datasetId) {

    const dataset =
      await Dataset
        .findById(datasetId)
        .lean();

    return dataset?.data || [];
  }

  return [];
}

async function getExportJson({ json, datasetId }) {
  if (json && typeof json === "object") {
    return json;
  }

  if (datasetId) {
    const dataset = await Dataset.findById(datasetId).lean();
    if (!dataset) {
      throw new Error("Dataset not found");
    }
    return {
      query: dataset.query,
      answer: dataset.answer,
      sources: dataset.sources,
      sourceUrls: dataset.sourceUrls,
      tables: dataset.tables,
      data: dataset.data,
      images: dataset.images,
      text: dataset.text,
      charts: dataset.charts,
      workspaceId: dataset.workspaceId,
      workspaceName: dataset.workspaceName,
      metadata: dataset.metadata,
      createdAt: dataset.createdAt,
      updatedAt: dataset.updatedAt
    };
  }

  return {};
}

async function getExportPayload(body = {}) {
  if (body.datasetId) {
    const dataset = await Dataset.findById(body.datasetId).lean();
    if (!dataset) {
      throw new Error("Dataset not found");
    }

    return {
      ...dataset,
      ...body,
      data: Array.isArray(body.data) && body.data.length ? body.data : dataset.data || [],
      sources: Array.isArray(body.sources) && body.sources.length ? body.sources : dataset.sources || [],
      sourceUrls: Array.isArray(body.sourceUrls) && body.sourceUrls.length ? body.sourceUrls : dataset.sourceUrls || dataset.sources || [],
      images: Array.isArray(body.images) && body.images.length ? body.images : dataset.images || [],
      charts: Array.isArray(body.charts) && body.charts.length ? body.charts : dataset.charts || [],
      insights: Array.isArray(body.insights) ? body.insights : [],
      createdAt: dataset.createdAt
    };
  }

  return {
    query: body.query || "",
    answer: body.answer || "",
    data: Array.isArray(body.data) ? body.data : [],
    sources: Array.isArray(body.sources) ? body.sources : [],
    sourceUrls: Array.isArray(body.sourceUrls) ? body.sourceUrls : body.sources || [],
    images: Array.isArray(body.images) ? body.images : [],
    charts: Array.isArray(body.charts) ? body.charts : [],
    insights: Array.isArray(body.insights) ? body.insights : [],
    workspaceName: body.workspaceName || "",
    createdAt: body.createdAt || new Date()
  };
}

/* =========================================
   MAIN SCRAPE ROUTE
========================================= */

router.post("/scrape", async (req, res) => {

  try {

    console.log("🔥 /scrape route hit");

    const {

      query,

      urls,

      mode,

      maxPages,

      maxDepth,

      workspaceId,

      workspaceName

    } = req.body;

    if (!query) {

      return res.status(400).json({

        message: "Query required"
      });
    }

    const job =
      await enqueueScrapeJob({

        query,

        urls,

        mode,

        maxPages,

        maxDepth,

        workspaceId,

        workspaceName
      });

    return res.status(202).json({

      success: true,

      jobId: job._id,

      status: job.status,

      progress: job.progress
    });

  } catch (error) {

    console.error("❌ Scrape Error:", error);

    return res.status(500).json({

      success: false,

      message: "Error scraping data"
    });
  }
});

/* =========================================
   GET JOB STATUS
========================================= */

router.get("/scrape/jobs/:id", async (req, res) => {

  try {

    const job =
      await ScrapeJob
        .findById(req.params.id)
        .lean();

    if (!job) {

      return res.status(404).json({

        message: "Job not found"
      });
    }

    /* =========================================
       AUTO GENERATE CHARTS
    ========================================= */

    const charts =
      generateChartSuggestions(

        job?.result?.data || []
      );

    return res.json({

      ...job,

      charts
    });

  } catch (error) {

    console.error("Job Fetch Error:", error);

    return res.status(500).json({

      message: "Error fetching scrape job"
    });
  }
});

/* =========================================
   CREATE SCRAPE JOB
========================================= */

router.post("/scrape/jobs", async (req, res) => {

  try {

    const { query } = req.body;

    if (!query || !query.trim()) {

      return res.status(400).json({

        message: "Query required"
      });
    }

    const job =
      await enqueueScrapeJob(req.body);

    return res.status(202).json({

      success: true,

      jobId: job._id,

      status: job.status,

      progress: job.progress
    });

  } catch (error) {

    console.error("Job Create Error:", error);

    return res.status(500).json({

      message: "Error creating scrape job"
    });
  }
});

/* =========================================
   CSV DOWNLOAD
========================================= */

router.post("/download-csv", async (req, res) => {

  try {

    const data =
      await getExportRows(req.body);

    if (!data || data.length === 0) {

      return res.status(400).json({

        message: "No data provided"
      });
    }

    const csv =
      convertToCSV(data);

    res.header(
      "Content-Type",
      "text/csv"
    );

    res.attachment("data.csv");

    return res.send(csv);

  } catch (error) {

    console.error("CSV Error:", error);

    return res.status(500).json({

      message: "Error generating CSV"
    });
  }
});

/* =========================================
   EXCEL DOWNLOAD
========================================= */

router.post("/download-excel", async (req, res) => {

  try {

    const payload =
      await getExportPayload(req.body);

    if (!payload.data || payload.data.length === 0) {

      return res.status(400).json({

        message: "No data provided"
      });
    }

    const buffer =
      await buildExcelReportBuffer(payload);

    res.header(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.attachment(`${buildReportFilename(payload.query)}-report.xlsx`);

    return res.send(buffer);

  } catch (error) {

    console.error("Excel Error:", error);

    return res.status(500).json({

      message: "Error generating Excel"
    });
  }
});

/* =========================================
   JSON DOWNLOAD
========================================= */

router.post("/download-json", async (req, res) => {
  try {
    const payload = await getExportJson(req.body);

    if (!payload || (typeof payload === "object" && Object.keys(payload).length === 0)) {
      return res.status(400).json({ message: "No dataset provided" });
    }

    const jsonString = JSON.stringify(payload, null, 2);

    res.header("Content-Type", "application/json");
    res.attachment("dataset.json");
    return res.send(jsonString);
  } catch (error) {
    console.error("JSON Error:", error);
    return res.status(500).json({ message: "Error generating JSON" });
  }
});

/* =========================================
   PDF DOWNLOAD
========================================= */

router.post("/download-pdf", async (req, res) => {
  try {
    const payload = await getExportPayload(req.body);
    const pdfBuffer = await buildPdfReportBuffer(payload);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=${buildReportFilename(payload.query)}-report.pdf`
    });

    return res.send(pdfBuffer);
  } catch (error) {
    console.error("PDF Error:", error);
    return res.status(500).json({ message: "Error generating PDF" });
  }
});

router.post("/download-pdf-legacy", async (req, res) => {
  try {
    return res.status(410).json({ message: "Legacy PDF export disabled. Use /download-pdf." });

    const { datasetId, query, answer, data, tables, sourceUrls, sources } = req.body;
    let dataset = null;

    if (datasetId) {
      dataset = await Dataset.findById(datasetId).lean();
      if (!dataset) {
        return res.status(404).json({ message: "Dataset not found" });
      }
    }

    const payload = dataset || {
      query: query || "",
      answer: answer || "",
      data: Array.isArray(data) ? data : [],
      tables: Array.isArray(tables) ? tables : [],
      sourceUrls: Array.isArray(sourceUrls) ? sourceUrls : [],
      sources: Array.isArray(sources) ? sources : []
    };

    const rows = await getExportRows({ data: payload.data, datasetId });
    const analytics = getAnalytics(rows);
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=dataset.pdf"
      });
      res.send(pdfBuffer);
    });

    doc.fillColor("#6d28d9").fontSize(20).text("ScrapeIQ Report", { align: "center" });
    doc.moveDown(0.5);
    doc.fillColor("#ffffff").fontSize(12).text(`Query: ${payload.query || "N/A"}`);
    doc.moveDown(0.25);
    doc.text(`Summary: ${payload.answer || "N/A"}`);
    doc.moveDown(0.5);
    doc.text("Source URLs:", { underline: true });

    const sourcesToRender = payload.sourceUrls.length ? payload.sourceUrls : payload.sources || [];
    sourcesToRender.slice(0, 5).forEach((source) => {
      doc.text(`• ${source}`);
    });

    if (sourcesToRender.length > 5) {
      doc.text(`...plus ${sourcesToRender.length - 5} more sources`);
    }

    doc.moveDown(0.5);
    doc.text("Analytics", { underline: true });
    doc.text(`Total rows: ${analytics.rowCount}`);
    analytics.numericStats.slice(0, 4).forEach((stat) => {
      doc.text(`• ${stat.column}: avg ${stat.avg.toFixed(2)}, min ${stat.min}, max ${stat.max}`);
    });
    analytics.uniqueCategories.slice(0, 3).forEach((item) => {
      doc.text(`• ${item.column} unique: ${item.count}`);
    });

    if (rows.length > 0) {
      doc.moveDown(0.5);
      doc.text("Table preview", { underline: true });
      const headers = Object.keys(rows[0]);
      const previewRows = rows.slice(0, 5);

      doc.moveDown(0.2);
      doc.fontSize(10);
      doc.text(headers.join(" | "));
      doc.moveDown(0.2);
      previewRows.forEach((row) => {
        doc.text(headers.map((header) => String(row[header] ?? "-")).join(" | "));
      });
    }

    doc.end();
  } catch (error) {
    console.error("PDF Error:", error);
    return res.status(500).json({ message: "Error generating PDF" });
  }
});

/* =========================================
   SEND DATASET MAIL
========================================= */

router.post("/send-mail", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    const payload = await getExportPayload(req.body);

    if (!payload.data || payload.data.length === 0) {
      return res.status(400).json({ message: "No dataset found" });
    }

    const filename = buildReportFilename(payload.query);
    const [excelBuffer, pdfBuffer] = await Promise.all([
      buildExcelReportBuffer(payload),
      buildPdfReportBuffer(payload)
    ]);

    await sendDatasetMail({
      to: email,
      subject: `AI Scraping Report - ${payload.query || "Dataset"}`,
      text: buildReportText(payload),
      html: buildReportEmailHtml(payload),
      attachments: [
        {
          filename: `${filename}-report.xlsx`,
          content: Buffer.from(excelBuffer),
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        },
        {
          filename: `${filename}-report.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf"
        }
      ]
    });

    return res.json({
      success: true,
      message: "Report emailed successfully"
    });
  } catch (error) {
    console.error("Email Report Error:", error);
    return res.status(500).json({ message: "Failed to send email" });
  }
});

router.post("/send-mail-legacy", async (req, res) => {

  try {
    return res.status(410).json({ message: "Legacy email export disabled. Use /send-mail." });

    const {

      email,

      data

    } = req.body;

    if (!email) {

      return res.status(400).json({

        message: "Email required"
      });
    }

    if (!data || data.length === 0) {

      return res.status(400).json({

        message: "No dataset found"
      });
    }

    const htmlRows = data.map((row) => `

      <tr>

        ${Object.values(row)
          .map((value) => `

            <td
              style="
                padding:8px;
                border:1px solid #ddd;
              "
            >

              ${value}

            </td>

          `)
          .join("")}

      </tr>

    `).join("");

    const html = `

      <div
        style="
          font-family:Arial;
          padding:20px;
        "
      >

        <h2>
          ScrapeIQ Dataset Export
        </h2>

        <p>
          Your scraping dataset
          is attached below.
        </p>

        <table
          style="
            border-collapse:collapse;
            width:100%;
          "
        >

          ${htmlRows}

        </table>

      </div>
    `;

    await sendDatasetMail({

      to: email,

      subject: "Your ScrapeIQ Dataset",

      html
    });

    return res.json({

      success: true,

      message:
        "Dataset mailed successfully"
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({

      message: "Failed to send email"
    });
  }
});

/* =========================================
   IMAGE GENERATION
========================================= */

router.post("/generate-images", (req, res) => {

  try {

    const {

      answer,

      data,

      count = 3

    } = req.body;

    if (
      !answer &&
      (!data || data.length === 0)
    ) {

      return res.status(400).json({

        message:
          "Answer or data required"
      });
    }

    const prompts =
      buildImagePrompts({

        answer,

        data:
          Array.isArray(data)
            ? data
            : [],

        count:
          Math.min(
            Math.max(
              Number(count) || 3,
              1
            ),
            3
          )
      });

    const images =
      prompts.map((item, index) => ({

        ...item,

        url:
          buildGeneratedImageUrl(
            item.prompt,
            index
          )
      }));

    return res.json({

      images
    });

  } catch (error) {

    console.error(
      "Image Generation Error:",
      error
    );

    return res.status(500).json({

      message:
        "Error generating images"
    });
  }
});

export default router;
