import mongoose from "mongoose";

const scrapeJobSchema = new mongoose.Schema({
    query: {
        type: String,
        required: true,
        trim: true
    },
    urls: {
        type: [String],
        default: []
    },
    mode: {
        type: String,
        enum: ["scrape", "crawl"],
        default: "scrape"
    },
    status: {
        type: String,
        enum: ["queued", "running", "processing", "completed", "failed"],
        default: "queued",
        index: true
    },
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    steps: {
        type: [String],
        default: []
    },
    result: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    datasetId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Dataset",
        default: null
    },
    error: {
        type: String,
        default: ""
    },
    metrics: {
        sourceCount: { type: Number, default: 0 },
        rowCount: { type: Number, default: 0 },
        failedSourceCount: { type: Number, default: 0 },
        durationMs: { type: Number, default: 0 }
    },
    failures: {
        type: [
            {
                url: { type: String, default: "" },
                stage: { type: String, default: "" },
                message: { type: String, default: "" }
            }
        ],
        default: []
    },
    startedAt: Date,
    completedAt: Date
}, {
    timestamps: true
});

export default mongoose.model("ScrapeJob", scrapeJobSchema);
