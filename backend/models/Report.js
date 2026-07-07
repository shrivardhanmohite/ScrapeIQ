import mongoose from "mongoose";

function normalizeChartSnapshot(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object") {
        return normalizeChartSnapshot(parsed);
      }
    } catch {
      // Fall back to a simple title-based snapshot for legacy string values.
    }

    return {
      title: value,
      chartType: "bar",
      description: "",
      config: {},
      image: "",
      createdAt: new Date(),
    };
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const chartType =
    typeof value.chartType === "string" && value.chartType.trim()
      ? value.chartType
      : typeof value.type === "string" && value.type.trim()
        ? value.type
        : "bar";

  const title =
    typeof value.title === "string" && value.title.trim()
      ? value.title
      : "Chart";

  const description =
    typeof value.description === "string" && value.description.trim()
      ? value.description
      : typeof value.reason === "string" && value.reason.trim()
        ? value.reason
        : "";

  const image =
    typeof value.image === "string"
      ? value.image
      : typeof value.imageData === "string"
        ? value.imageData
        : "";

  const config =
    value.config && typeof value.config === "object" && !Array.isArray(value.config)
      ? value.config
      : {
          xKey: value.xKey || "",
          yKey: value.yKey || "",
          dataKey: value.dataKey || "",
          applicable: value.applicable ?? true,
          reason: value.reason || "",
        };

  return {
    title,
    chartType,
    description,
    config,
    image,
    createdAt:
      value.createdAt instanceof Date
        ? value.createdAt
        : value.createdAt
          ? new Date(value.createdAt)
          : new Date(),
    applicable: value.applicable ?? true,
    reason: typeof value.reason === "string" ? value.reason : "",
    xKey: typeof value.xKey === "string" ? value.xKey : "",
    yKey: typeof value.yKey === "string" ? value.yKey : "",
    dataKey: typeof value.dataKey === "string" ? value.dataKey : "",
    imageData: image,
  };
}

export function normalizeChartSnapshots(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(normalizeChartSnapshot).filter(Boolean);
}

const chartSnapshotSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "Chart",
    },
    chartType: {
      type: String,
      default: "bar",
    },
    description: {
      type: String,
      default: "",
    },
    config: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    image: {
      type: String,
      default: "",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    applicable: {
      type: Boolean,
      default: true,
    },
    reason: {
      type: String,
      default: "",
    },
    xKey: {
      type: String,
      default: "",
    },
    yKey: {
      type: String,
      default: "",
    },
    dataKey: {
      type: String,
      default: "",
    },
    imageData: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const reportSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    datasetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dataset",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    query: {
      type: String,
      default: "",
    },
    reportContent: {
      type: Object,
      default: {},
    },
    generatedInsights: [String],
    analystProfile: {
      type: Object,
      default: {},
    },
    chartSnapshots: {
      type: [chartSnapshotSchema],
      default: [],
      set: normalizeChartSnapshots,
      get: (value) => normalizeChartSnapshots(value),
    },
    metadata: {
      rowCount: Number,
      sourceCount: Number,
      imageCount: Number,
      chartCount: Number,
      confidenceScore: Number,
      datasetQualityScore: Number,
      duplicatePercentage: Number,
      missingDataPercentage: Number,
      generatedAt: Date,
      generationDuration: Number, // in milliseconds
      exportedAt: Date,
    },
    status: {
      type: String,
      enum: ["generating", "completed", "failed"],
      default: "generating",
    },
    error: String,
  },
  {
    timestamps: true,
  }
);

const Report = mongoose.model("Report", reportSchema);

export default Report;
