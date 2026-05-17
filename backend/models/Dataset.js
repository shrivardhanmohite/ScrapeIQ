import mongoose from "mongoose";

const datasetSchema = new mongoose.Schema(
{
    query: {
        type: String,
        required: true,
        trim: true,
    },

    answer: {
        type: String,
        default: "",
    },

    data: {
        type: Array,
        default: [],
    },

    sources: {
        type: Array,
        default: [],
    },

    sourceUrls: {
        type: Array,
        default: [],
    },

    tables: {
        type: Array,
        default: [],
    },

    images: {
        type: Array,
        default: [],
    },

    text: {
        type: String,
        default: "",
    },

    charts: {
        type: Array,
        default: [],
    },

    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ScrapeJob",
        default: null,
    },

    metadata: {
        type: Object,
        default: {},
    },
},
{
    timestamps: true,
}
);

const Dataset = mongoose.model("Dataset", datasetSchema);

export default Dataset;