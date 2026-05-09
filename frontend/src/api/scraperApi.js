import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

function getApiErrorMessage(error) {
    if (error.response?.data?.message) {
        return error.response.data.message;
    }

    if (error.code === "ERR_NETWORK") {
        return "Backend API is not reachable. Start the backend on port 5000 and refresh the page.";
    }

    return error.message || "Request failed";
}

export async function runAgent(query){

    const response = await axios.post(
        `${API_BASE_URL}/scrape`,
        {query}
    );

    return response.data;
}

export async function createScrapeJob(payload) {
    try {
        const response = await axios.post(`${API_BASE_URL}/scrape/jobs`, payload);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error));
    }
}

export async function getScrapeJob(jobId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/scrape/jobs/${jobId}`);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error));
    }
}

export async function waitForScrapeJob(jobId, onUpdate) {
    while (true) {
        const job = await getScrapeJob(jobId);
        onUpdate?.(job);

        if (job.status === "completed") {
            return job.result;
        }

        if (job.status === "failed") {
            throw new Error(job.error || "Scrape job failed");
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
    }
}
