import express from "express";
import Dataset from "../models/Dataset.js";
import { askAI } from "../ai/openRouter.js";
import { getDatasetRows, getAnalytics } from "../utils/dataUtils.js";

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
            charts = [],
            workspaceId = null,
            workspaceName = ""
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
            charts,
            workspaceId
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
            workspaceId,
            workspaceName,
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
        const filter = {};
        if (req.query.workspaceId) {
            filter.workspaceId = req.query.workspaceId;
        }

        const datasets = await Dataset.find(filter).sort({ createdAt: -1 });
        res.json(datasets);
    } catch (err) {
        res.status(500).json({ message: "Error fetching datasets" });
    }
});

router.post("/insights", async (req, res) => {
    try {
        const { datasetId, query, answer, data, tables, sourceUrls, sources } = req.body;
        let dataset = null;

        if (datasetId) {
            dataset = await Dataset.findById(datasetId).lean();
        }

        const rows = getDatasetRows(dataset || { data, tables });
        const metadata = {
            query: dataset?.query || query || "",
            answer: dataset?.answer || answer || "",
            sourceUrls: dataset?.sourceUrls || sourceUrls || dataset?.sources || sources || []
        };

        const analytics = getAnalytics(rows);
        const rowSample = JSON.stringify(rows.slice(0, 10), null, 2);
        const prompt = `You are a data analyst. Use ONLY the dataset information provided below. Do not hallucinate. Return 3 to 6 concise bullet findings.

Query: ${metadata.query}

Summary: ${metadata.answer}

Columns: ${rows.length > 0 ? Object.keys(rows[0]).join(", ") : "none"}

Row sample:
${rowSample}

Source URLs: ${metadata.sourceUrls.join(", ")}

Analytics: ${JSON.stringify(analytics, null, 2)}

Write bullets only. If you cannot answer from this dataset, say: I could not determine that from the dataset provided.`;

        const insightText = await askAI(prompt);
        const bullets = insightText
            .split(/\r?\n+/)
            .map((line) => line.trim())
            .filter((line) => line);

        res.json({ insights: bullets });
    } catch (err) {
        console.error("Insights error:", err);
        res.status(500).json({ message: "Error generating insights" });
    }
});

router.post("/chat", async (req, res) => {
    try {
        const { datasetId, question, data, tables, sourceUrls, sources } = req.body;

        if (!question || !question.trim()) {
            return res.status(400).json({ message: "Question is required" });
        }

        let dataset = null;
        if (datasetId) {
            dataset = await Dataset.findById(datasetId).lean();
        }

        const rows = getDatasetRows(dataset || { data, tables });
        const helpText = rows.length
            ? JSON.stringify(rows.slice(0, 15), null, 2)
            : "No structured rows available.";
        const columns = rows.length ? Object.keys(rows[0]).join(", ") : "none";
        const prompt = `You are a data assistant. Answer using only the provided dataset and sources. Do not hallucinate. If the dataset does not contain enough information, respond: I could not determine that from the dataset provided.

Question: ${question}

Dataset query: ${dataset?.query || ""}
Dataset columns: ${columns}
Dataset sample rows: ${helpText}

Source URLs: ${(dataset?.sourceUrls || sourceUrls || sources || []).join(", ")}`;

        const answer = await askAI(prompt);

        res.json({ answer: answer.trim() });
    } catch (err) {
        console.error("Chat error:", err);
        res.status(500).json({ message: "Error generating chat answer" });
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
