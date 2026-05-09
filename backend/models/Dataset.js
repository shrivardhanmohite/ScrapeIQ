import express from "express";
import Dataset from "../models/Dataset.js";

const router = express.Router();

/* =========================================
   SAVE DATASET
========================================= */

router.post("/save", async (req, res) => {

  try {

    const {

      query,

      answer = "",

      data = [],

      sources = [],

      sourceUrls = sources,

      tables = [],

      images = [],

      text = "",

      charts = []

    } = req.body;

    console.log("Saving dataset:", query);

    if (!query) {

      return res.status(400).json({
        message: "Query required"
      });
    }

    const dataset = new Dataset({

      query,

      answer,

      data,

      sources,

      sourceUrls,

      tables,

      images,

      text,

      charts,

      metadata: {

        rowCount:
          Array.isArray(data)
            ? data.length
            : 0,

        sourceCount:
          Array.isArray(sources)
            ? sources.length
            : 0,

        tableCount:
          Array.isArray(tables)
            ? tables.length
            : 0,

        imageCount:
          Array.isArray(images)
            ? images.length
            : 0,

        chartCount:
          Array.isArray(charts)
            ? charts.length
            : 0
      }
    });

    await dataset.save();

    console.log(
      "Dataset saved successfully"
    );

    return res.json({

      success: true,

      message:
        "Dataset saved successfully",

      dataset
    });

  } catch (err) {

    console.error(
      "Dataset Save Error:",
      err
    );

    return res.status(500).json({

      success: false,

      message:
        "Error saving dataset"
    });
  }
});

/* =========================================
   GET ALL DATASETS
========================================= */

router.get("/all", async (req, res) => {

  try {

    const datasets =
      await Dataset
        .find()
        .sort({ createdAt: -1 });

    return res.json(datasets);

  } catch (err) {

    console.error(err);

    return res.status(500).json({

      message:
        "Error fetching datasets"
    });
  }
});

/* =========================================
   ANALYTICS
========================================= */

router.get("/analytics", async (req, res) => {

  try {

    const datasets =
      await Dataset
        .find()
        .sort({ createdAt: -1 })
        .lean();

    const totalRows =
      datasets.reduce(
        (sum, dataset) =>
          sum +
          (dataset.data?.length || 0),
        0
      );

    const totalSources =
      datasets.reduce(
        (sum, dataset) =>
          sum +
          (dataset.sources?.length || 0),
        0
      );

    const latest =
      datasets
        .slice(0, 5)
        .map((dataset) => ({

          id: dataset._id,

          query: dataset.query,

          rows:
            dataset.data?.length || 0,

          sources:
            dataset.sources?.length || 0,

          createdAt:
            dataset.createdAt
        }));

    return res.json({

      totalDatasets:
        datasets.length,

      totalRows,

      totalSources,

      latest
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({

      message:
        "Error fetching analytics"
    });
  }
});

/* =========================================
   GET DATASET BY ID
========================================= */

router.get("/:id", async (req, res) => {

  try {

    const dataset =
      await Dataset.findById(
        req.params.id
      );

    if (!dataset) {

      return res.status(404).json({

        message:
          "Dataset not found"
      });
    }

    return res.json(dataset);

  } catch (err) {

    console.error(err);

    return res.status(500).json({

      message:
        "Error fetching dataset"
    });
  }
});

export default router;