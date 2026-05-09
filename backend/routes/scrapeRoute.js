import express from "express";
import * as XLSX from "xlsx";

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

      maxDepth

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

        maxDepth
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

    const data =
      await getExportRows(req.body);

    if (!data || data.length === 0) {

      return res.status(400).json({

        message: "No data provided"
      });
    }

    const worksheet =
      XLSX.utils.json_to_sheet(data);

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(

      workbook,

      worksheet,

      "Dataset"
    );

    const buffer =
      XLSX.write(workbook, {

        type: "buffer",

        bookType: "xlsx"
      });

    res.header(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.attachment("dataset.xlsx");

    return res.send(buffer);

  } catch (error) {

    console.error("Excel Error:", error);

    return res.status(500).json({

      message: "Error generating Excel"
    });
  }
});

/* =========================================
   SEND DATASET MAIL
========================================= */

router.post("/send-mail", async (req, res) => {

  try {

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