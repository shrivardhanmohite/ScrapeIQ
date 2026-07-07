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

export async function runAgent(query, workspaceId, workspaceName) {
    const response = await axios.post(
        `${API_BASE_URL}/scrape`,
        { query, workspaceId, workspaceName }
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

export async function getDatasets(workspaceId) {
    try {
        const params = workspaceId ? { workspaceId } : undefined;
        const response = await axios.get(`${API_BASE_URL}/dataset/all`, { params });
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error));
    }
}

export async function getDataset(datasetId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/dataset/${datasetId}`);
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

export async function getWorkspaces() {
    try {
        const response = await axios.get(`${API_BASE_URL}/workspace`);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error));
    }
}

export async function createWorkspace(name) {
    try {
        const response = await axios.post(`${API_BASE_URL}/workspace`, { name });
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error));
    }
}

export async function renameWorkspace(id, name) {
    try {
        const response = await axios.patch(`${API_BASE_URL}/workspace/${id}`, { name });
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error));
    }
}

export async function deleteWorkspace(id) {
    try {
        const response = await axios.delete(`${API_BASE_URL}/workspace/${id}`);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error));
    }
}

export async function assignDatasetToWorkspace(workspaceId, datasetId) {
    try {
        const response = await axios.put(`${API_BASE_URL}/workspace/${workspaceId}/dataset/${datasetId}`);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error));
    }
}

export async function getInsights(payload) {
    try {
        const response = await axios.post(`${API_BASE_URL}/dataset/insights`, payload);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error));
    }
}

export async function ragQuery(payload) {
    try {
        const response = await axios.post(`${API_BASE_URL}/dataset/chat`, payload);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error));
    }
}

export async function generateReport(workspaceId, datasetId) {
    try {
        const response = await axios.post(`${API_BASE_URL}/report/generate`, {
            workspaceId,
            datasetId,
        });
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error));
    }
}

export async function getReport(reportId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/report/${reportId}`);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error));
    }
}

export async function getWorkspaceReports(workspaceId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/report/workspace/${workspaceId}`);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error));
    }
}

export async function getReports() {
    try {
        const response = await axios.get(`${API_BASE_URL}/report/all`);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error));
    }
}

export async function deleteReport(reportId) {
    try {
        const response = await axios.delete(`${API_BASE_URL}/report/${reportId}`);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error));
    }
}

export async function exportReportPDF(reportId) {
    try {
        const response = await axios.post(`${API_BASE_URL}/report/${reportId}/export-pdf`, {}, {
            responseType: 'blob',
        });
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error));
    }
}

export async function exportDatasetExcel(payload) {
    try {
        const response = await axios.post(`${API_BASE_URL}/download-excel`, payload, {
            responseType: 'blob',
        });
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error));
    }
}

export async function sendDatasetEmail(payload) {
    try {
        const response = await axios.post(`${API_BASE_URL}/send-mail`, payload);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error));
    }
}
