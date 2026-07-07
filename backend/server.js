import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import scrapeRoutes from "./routes/scrapeRoute.js";
import datasetRoutes from "./routes/datasetRoute.js";
import workspaceRoutes from "./routes/workspaceRoute.js";
import reportRoutes from "./routes/reportRoute.js";
import authRoutes from "./routes/authRoute.js";
import { connectDb } from "./config/db.js";
import mailRoute from "./routes/mailRoute.js";
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

connectDb().catch(() => {
  process.exit(1);
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    queue: process.env.REDIS_URL ? "bullmq" : "in-process"
  });
});

app.get("/api", (req, res) => {
  res.json({
    name: "ScrapeIQ API",
    status: "ok",
    health: "/api/health",
    endpoints: {
      scrape: "/api/scrape",
      datasets: "/api/dataset/all",
      workspaces: "/api/workspace",
      reports: "/api/report"
    }
  });
});

app.use("/api", scrapeRoutes);
app.use("/api/dataset", datasetRoutes);
app.use("/api/datasets", datasetRoutes);
app.use("/api/workspace", workspaceRoutes);
app.use("/api/report", reportRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", mailRoute);

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
