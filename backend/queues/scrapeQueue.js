import ScrapeJob from "../models/ScrapeJob.js";
import { createRedisConnection, pingRedis } from "../config/redis.js";
import { parseUrls, processScrapeJob } from "../services/scrapeJobService.js";

const QUEUE_NAME = "scrape-jobs";
let queuePromise;

async function createBullQueue() {
    if (!process.env.REDIS_URL) {
        return null;
    }

    let connection;

    try {
        const [{ Queue }, IORedisModule] = await Promise.all([
            import("bullmq"),
            import("ioredis")
        ]);
        const IORedis = IORedisModule.default;
        connection = await createRedisConnection(IORedis, process.env.REDIS_URL);
        await pingRedis(connection);

        const queue = new Queue(QUEUE_NAME, { connection });
        queue.on("error", (error) => {
            console.log("BullMQ queue error:", error.message);
        });

        return queue;
    } catch (error) {
        connection?.disconnect();
        console.log("BullMQ unavailable, using in-process jobs:", error.message);
        return null;
    }
}

async function getQueue() {
    if (!queuePromise) {
        queuePromise = createBullQueue();
    }

    return queuePromise;
}

export async function enqueueScrapeJob(payload) {
    const urls = parseUrls(payload.urls);
    const job = await ScrapeJob.create({
        query: payload.query,
        urls,
        mode: payload.mode === "crawl" ? "crawl" : "scrape",
        status: "queued",
        progress: 0
    });

    const normalizedPayload = {
        query: payload.query,
        urls,
        mode: job.mode,
        maxPages: Number(payload.maxPages) || 20,
        maxDepth: Number(payload.maxDepth) || 1
    };
    const queue = await getQueue();

    if (queue) {
        try {
            await queue.add("scrape", {
                jobId: job._id.toString(),
                payload: normalizedPayload
            }, {
                jobId: job._id.toString(),
                attempts: 3,
                backoff: { type: "exponential", delay: 5000 },
                removeOnComplete: 100,
                removeOnFail: 100
            });

            return job;
        } catch (error) {
            console.log("BullMQ enqueue failed, using in-process job:", error.message);
            queuePromise = null;
        }
    }

    setImmediate(() => {
        processScrapeJob(job._id, normalizedPayload)
            .catch((error) => console.log("In-process job failed:", error.message));
    });

    return job;
}

export { QUEUE_NAME };
