import dotenv from "dotenv";
import { connectDb } from "../config/db.js";
import { createRedisConnection, pingRedis } from "../config/redis.js";
import { QUEUE_NAME } from "../queues/scrapeQueue.js";
import { processScrapeJob } from "../services/scrapeJobService.js";

dotenv.config();

async function startWorker() {
    if (!process.env.REDIS_URL) {
        throw new Error("REDIS_URL is required to run the BullMQ worker");
    }

    await connectDb();

    const [{ Worker }, IORedisModule] = await Promise.all([
        import("bullmq"),
        import("ioredis")
    ]);
    const IORedis = IORedisModule.default;
    const connection = await createRedisConnection(IORedis, process.env.REDIS_URL);

    try {
        await pingRedis(connection);
    } catch (error) {
        connection.disconnect();
        throw new Error(`Redis is not reachable at ${process.env.REDIS_URL}: ${error.message}`);
    }

    const worker = new Worker(QUEUE_NAME, async (job) => {
        const { jobId, payload } = job.data;
        return processScrapeJob(jobId, payload);
    }, {
        connection,
        concurrency: Number(process.env.SCRAPE_WORKER_CONCURRENCY) || 2
    });

    worker.on("completed", (job) => {
        console.log(`Scrape job completed: ${job.id}`);
    });

    worker.on("failed", (job, error) => {
        console.log(`Scrape job failed: ${job?.id}`, error.message);
    });

    worker.on("error", (error) => {
        console.log("Scrape worker Redis error:", error.message);
    });

    console.log("Scrape worker running");
}

startWorker().catch((error) => {
    console.error("Worker startup failed:", error.message);
    process.exit(1);
});
