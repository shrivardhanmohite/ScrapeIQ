import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import scrapeRoutes from "./routes/scrapeRoute.js";
import datasetRoutes from "./routes/datasetRoute.js";
import authRoutes from "./routes/authRoute.js";
import { connectDb } from "./config/db.js";

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

app.use("/api", scrapeRoutes);
app.use("/api/dataset", datasetRoutes);
app.use("/api/auth", authRoutes);

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
