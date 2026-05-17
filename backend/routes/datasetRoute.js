import express from "express";
import Dataset from "../models/Dataset.js";

const router = express.Router();

// ✅ SAVE DATASET
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

        if (!query) {
            return res.status(400).json({ message: "Query required" });
        }

        const duplicate = await Dataset.findOne({
            query,
            answer,
            data,
            sources,
            sourceUrls,
            tables,
            images,
            text,
            charts
        });

        if (duplicate) {
            console.log("Duplicate dataset save skipped for query:", query);
            return res.status(200).json({
                success: true,
                message: "Dataset already exists",
                dataset: duplicate,
                duplicate: true
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
                rowCount: Array.isArray(data) ? data.length : 0,
                sourceCount: Array.isArray(sources) ? sources.length : 0,
                tableCount: Array.isArray(tables) ? tables.length : 0,
                imageCount: Array.isArray(images) ? images.length : 0,
                chartCount: Array.isArray(charts) ? charts.length : 0
            }
        });
        await dataset.save();

        res.json({ message: "Dataset saved successfully", dataset });

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Error saving dataset" });
    }
});

// ✅ GET ALL DATASETS
router.get("/all", async (req, res) => {
    try {
        const datasets = await Dataset.find().sort({ createdAt: -1 });
        res.json(datasets);
    } catch (err) {
        res.status(500).json({ message: "Error fetching datasets" });
    }
});

router.get("/analytics", async (req, res) => {
    try {
        const datasets = await Dataset.find().sort({ createdAt: -1 }).lean();
        const totalRows = datasets.reduce((sum, dataset) => sum + (dataset.data?.length || 0), 0);
        const totalSources = datasets.reduce((sum, dataset) => sum + (dataset.sources?.length || 0), 0);
        const latest = datasets.slice(0, 5).map((dataset) => ({
            id: dataset._id,
            query: dataset.query,
            rows: dataset.data?.length || 0,
            sources: dataset.sources?.length || 0,
            createdAt: dataset.createdAt
        }));

        res.json({
            totalDatasets: datasets.length,
            totalRows,
            totalSources,
            latest
        });
    } catch (err) {
        res.status(500).json({ message: "Error fetching analytics" });
    }
});

router.get("/:id", async (req, res) => {
    try {
        const dataset = await Dataset.findById(req.params.id);

        if (!dataset) {
            return res.status(404).json({ message: "Dataset not found" });
        }

        res.json(dataset);
    } catch (err) {
        res.status(500).json({ message: "Error fetching dataset" });
    }
});

export default router;
