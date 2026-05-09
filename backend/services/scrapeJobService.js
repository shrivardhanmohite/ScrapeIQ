import Dataset from "../models/Dataset.js";
import ScrapeJob from "../models/ScrapeJob.js";
import { runAgent } from "../agents/orchestrator.js";

export function parseUrls(value) {
    if (Array.isArray(value)) {
        return value.map((url) => String(url).trim()).filter(Boolean);
    }

    if (typeof value === "string") {
        return value
            .split(/[\n,]+/)
            .map((url) => url.trim())
            .filter(Boolean);
    }

    return [];
}

async function updateJobProgress(jobId, progressUpdate) {
    await ScrapeJob.findByIdAndUpdate(jobId, {
        $set: {
            status: "processing",
            progress: progressUpdate.progress
        },
        ...(progressUpdate.stage ? { $addToSet: { steps: progressUpdate.stage } } : {})
    });
}

export async function processScrapeJob(jobId, payload) {
    const startedAt = Date.now();

    await ScrapeJob.findByIdAndUpdate(jobId, {
        status: "processing",
        progress: 10,
        startedAt: new Date(),
        error: ""
    });

    try {
        const result = await runAgent({
            query: payload.query,
            urls: parseUrls(payload.urls),
            mode: payload.mode,
            maxPages: payload.maxPages,
            maxDepth: payload.maxDepth
        }, {
            onProgress: (progressUpdate) => {
                updateJobProgress(jobId, progressUpdate)
                    .catch((error) => console.log("Progress update failed:", error.message));
            }
        });

        const dataset = await Dataset.create({
            query: payload.query,
            answer: result.answer,
            data: result.data || [],
            sources: result.sources || [],
            sourceUrls: result.sourceUrls || result.sources || [],
            tables: result.tables || [],
            images: result.images || [],
            text: result.text || "",
            charts: result.charts || [],
            jobId,
            metadata: {
                mode: payload.mode || "scrape",
                rowCount: result.data?.length || 0,
                sourceCount: result.sources?.length || 0,
                tableCount: result.tables?.length || 0,
                imageCount: result.images?.length || 0,
                chartCount: result.charts?.length || 0,
                failedSourceCount: result.failures?.length || 0
            }
        });

        await ScrapeJob.findByIdAndUpdate(jobId, {
            status: "completed",
            progress: 100,
            steps: result.steps || [],
            result,
            datasetId: dataset._id,
            failures: result.failures || [],
            metrics: {
                sourceCount: result.sources?.length || 0,
                rowCount: result.data?.length || 0,
                failedSourceCount: result.failures?.length || 0,
                durationMs: Date.now() - startedAt
            },
            completedAt: new Date()
        });

        return result;
    } catch (error) {
        await ScrapeJob.findByIdAndUpdate(jobId, {
            status: "failed",
            progress: 100,
            error: error.message,
            failures: [
                {
                    url: "",
                    stage: "JOB",
                    message: error.message
                }
            ],
            completedAt: new Date(),
            metrics: {
                durationMs: Date.now() - startedAt
            }
        });

        throw error;
    }
}
