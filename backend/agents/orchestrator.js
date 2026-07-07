import { searchWeb } from "../tools/searchWeb.js";
import { openUrl } from "../tools/openUrl.js";
import { extractText } from "../tools/extractText.js";
import { extractTables } from "../tools/extractTables.js";
import { extractImages } from "../tools/extractImages.js";
import { extractCharts } from "../tools/extractCharts.js";
import { crawlUrls } from "../tools/crawler.js";
import { askAI } from "../ai/openRouter.js";
import { generateChartSuggestions } from "../utils/chartGenerator.js";

// 🔥 SMART SCHEMA DETECTION
export function detectSchema(query){

    const q = query.toLowerCase();

    if(q.includes("movie") || q.includes("film") || q.includes("bollywood")){
        return {
            type: "movie",
            columns: ["name", "year", "rating", "genre"]
        };
    }

    if(q.includes("phone") || q.includes("laptop") || q.includes("price") || q.includes("product")){
        return {
            type: "product",
            columns: ["name", "price", "rating", "features"]
        };
    }

    if(q.includes("company") || q.includes("startup") || q.includes("ceo")){
        return {
            type: "company",
            columns: ["name", "CEO", "industry", "revenue"]
        };
    }

    return {
        type: "general",
        columns: ["name", "description", "category"]
    };
}

function normalizeInput(input, options = {}) {
    if (typeof input === "string") {
        return { query: input, ...options };
    }

    const urls = Array.isArray(input?.urls)
        ? input.urls
        : String(input?.urls || "")
            .split(/[\n,]+/)
            .map((url) => url.trim())
            .filter(Boolean);

    return {
        query: input?.query || "",
        urls,
        mode: input?.mode || options.mode || "scrape",
        maxPages: Number(input?.maxPages || options.maxPages || 20),
        maxDepth: Number(input?.maxDepth || options.maxDepth || 1)
    };
}

function reportProgress(callback, progress, stage, extra = {}) {
    callback?.({
        progress: Math.min(100, Math.max(0, progress)),
        stage,
        ...extra
    });
}

function parseStructuredRows(aiResponse) {
    const candidates = getJsonCandidates(aiResponse);
    const errors = [];

    for (const candidate of candidates) {
        for (const text of [candidate, repairJson(candidate)]) {
            try {
                const parsed = JSON.parse(text);
                const rows = unwrapRows(parsed);

                if (Array.isArray(rows)) {
                    return rows;
                }
            } catch (error) {
                errors.push(error.message);
            }
        }
    }

    throw new Error(errors[0] || "No JSON array found in AI response");
}

function getJsonCandidates(value) {
    const text = String(value || "").trim();
    const candidates = new Set();

    if (!text) {
        return [];
    }

    candidates.add(stripCodeFence(text));

    const fencedBlocks = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)]
        .map(match => match[1].trim())
        .filter(Boolean);

    fencedBlocks.forEach(block => candidates.add(stripCodeFence(block)));

    const arrayCandidate = extractBalancedJson(text, "[", "]");
    if (arrayCandidate) {
        candidates.add(arrayCandidate);
    }

    const objectCandidate = extractBalancedJson(text, "{", "}");
    if (objectCandidate) {
        candidates.add(objectCandidate);
    }

    return [...candidates].filter(Boolean);
}

function stripCodeFence(text) {
    return text
        .replace(/^\uFEFF/, "")
        .replace(/^```(?:json)?/i, "")
        .replace(/```$/i, "")
        .trim();
}

function extractBalancedJson(text, openChar, closeChar) {
    const start = text.indexOf(openChar);

    if (start === -1) {
        return "";
    }

    let depth = 0;
    let inString = false;
    let quote = "";
    let escaped = false;

    for (let index = start; index < text.length; index += 1) {
        const char = text[index];

        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (char === "\\") {
                escaped = true;
            } else if (char === quote) {
                inString = false;
            }

            continue;
        }

        if (char === "\"" || char === "'") {
            inString = true;
            quote = char;
            continue;
        }

        if (char === openChar) {
            depth += 1;
        } else if (char === closeChar) {
            depth -= 1;

            if (depth === 0) {
                return text.slice(start, index + 1).trim();
            }
        }
    }

    return "";
}

function repairJson(text) {
    return stripCodeFence(text)
        .replace(/[“”]/g, "\"")
        .replace(/[‘’]/g, "'")
        .replace(/,\s*([}\]])/g, "$1")
        .replace(/([{,]\s*)([A-Za-z_$][\w$-]*)(\s*:)/g, "$1\"$2\"$3")
        .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_, value) =>
            JSON.stringify(value.replace(/\\"/g, "\""))
        )
        .trim();
}

function unwrapRows(value) {
    if (Array.isArray(value)) {
        return value;
    }

    if (!value || typeof value !== "object") {
        return [];
    }

    for (const key of ["data", "items", "results", "rows", "table"]) {
        if (Array.isArray(value[key])) {
            return value[key];
        }
    }

    return [];
}

export async function runAgent(input, options = {}){

    let steps = [];
    let collectedText = [];
    let urls = [];
    let scrapedPages = [];
    let failures = [];
    let tables = [];
    let images = [];
    let charts = [];

    try{

        const jobInput = normalizeInput(input, options);
        const query = jobInput.query;
        const onProgress = options.onProgress;

        if (!query.trim()) {
            throw new Error("Query is required");
        }

        const schema = detectSchema(query);
        reportProgress(onProgress, 15, "DISCOVERING_SOURCES");
        console.log("🧠 Detected Schema:", schema);


        // 🔍 STEP 1: MULTI SEARCH
        console.log("\n🔍 STEP 1: MULTI SEARCH");

        const searchQueries = [
            query,
            query + " latest",
            query + " list",
            query + " top 10"
        ];

        let allUrls = [...jobInput.urls];

        if (allUrls.length === 0) {
            for (let q of searchQueries) {
                try {
                    const results = await searchWeb(q);
                    allUrls.push(...results);
                } catch (err) {
                    console.log("Search error:", err.message);
                }
            }
        }

        urls = [...new Set(allUrls)].slice(0, jobInput.maxPages);

        steps.push("SEARCH_WEB");
        reportProgress(onProgress, 30, "SOURCES_DISCOVERED", { sourceCount: urls.length });
        console.log("Collected URLs:", urls);

        if (jobInput.mode === "crawl" && urls.length > 0) {
            steps.push("CRAWL_URLS");
            urls = await crawlUrls(urls, {
                maxDepth: jobInput.maxDepth,
                maxPages: jobInput.maxPages,
                sameDomain: true,
                onProgress: ({ visited }) => {
                    const crawlProgress = Math.min(45, 30 + Math.round((visited / jobInput.maxPages) * 15));
                    reportProgress(onProgress, crawlProgress, "CRAWLING", { visited });
                }
            });
            reportProgress(onProgress, 45, "CRAWL_COMPLETE", { sourceCount: urls.length });
            console.log("Crawled URLs:", urls);
        }


        // 🌐 STEP 2: PARALLEL SCRAPING
        console.log("\n🌐 STEP 2: SCRAPING");

        const scrapePromises = urls.map(async (url, index) => {
            try {
                console.log("Opening:", url);

                const html = await openUrl(url, {
                    delayMs: Number(process.env.SCRAPE_DELAY_MS) || 250,
                    timeoutMs: Number(process.env.PAGE_TIMEOUT_MS) || 30000
                });
                const text = extractText(html);
                const pageTables = extractTables(html);
                const pageImages = extractImages(html, url);
                const pageCharts = extractCharts(html);

                reportProgress(onProgress, Math.min(70, 45 + Math.round(((index + 1) / urls.length) * 25)), "SCRAPING", {
                    processedSources: index + 1,
                    sourceCount: urls.length
                });

                if(text && text.length > 100){
                    return {
                        url,
                        text: text.slice(0, 1500),
                        tables: pageTables,
                        images: pageImages,
                        charts: pageCharts
                    };
                }

            } catch(err){
                console.log("❌ Failed:", url);
                failures.push({
                    url,
                    stage: "SCRAPE",
                    message: err.message
                });
            }

            return null;
        });

        const results = await Promise.all(scrapePromises);
        scrapedPages = results.filter(Boolean);
        collectedText = scrapedPages.map(page => page.text).filter(Boolean);
        tables = scrapedPages.flatMap(page =>
            page.tables.map(table => ({ ...table, sourceUrl: page.url }))
        );
        images = scrapedPages.flatMap(page =>
            page.images.map(image => ({ ...image, sourceUrl: page.url }))
        );
        charts = scrapedPages.flatMap(page =>
            page.charts.map(chart => ({ ...chart, sourceUrl: page.url }))
        );

        steps.push("OPEN_URL");
        steps.push("EXTRACT_TEXT");
        steps.push("EXTRACT_TABLES");
        steps.push("EXTRACT_IMAGES");
        steps.push("EXTRACT_CHARTS");
        reportProgress(onProgress, 72, "PROCESSING_CONTENT", {
            processedSources: scrapedPages.length,
            failedSourceCount: failures.length
        });


        // 🧹 STEP 3: CLEAN TEXT
        collectedText = collectedText.filter(text =>
            text.length > 200 &&
            !text.toLowerCase().includes("cookie") &&
            !text.toLowerCase().includes("subscribe")
        );

        const combinedText = collectedText.join("\n\n").slice(0, 8000);

        console.log("🧠 COMBINED TEXT LENGTH:", combinedText.length);


        // ⚠️ FALLBACK IF SCRAPING FAILS
        if(!combinedText || combinedText.length < 200){

            console.log("⚠️ Using fallback data");

            const fallbackData = [
                { name: "Fallback Item 1", description: "No data", category: "General" },
                { name: "Fallback Item 2", description: "No data", category: "General" }
            ];

            return {
                query,
                steps,
                answer: "Could not extract reliable live data.",
                sources: urls,
                sourceUrls: urls,
                text: combinedText,
                tables,
                images,
                charts: generateChartSuggestions(fallbackData),
                failures,
                data: fallbackData
            };
        }


        // 🧾 STEP 4: SUMMARIZE
        console.log("\n🧾 STEP 4: SUMMARIZE");

        const summaryPrompt = `
Answer the user query in a clean structured list.

User Question:
${query}

Data:
${combinedText.slice(0,4000)}
`;

        const summary = await askAI(summaryPrompt);

        steps.push("SUMMARIZE");
        reportProgress(onProgress, 82, "SUMMARIZED");


        // 📊 STEP 5: STRUCTURED TABLE
        console.log("\n📊 STEP 5: STRUCTURED TABLE");

        const structuredPrompt = `
Convert the following text into a structured table.

STRICT RULES:
- Each row = ONE item
- Extract ALL items (minimum 8–10 if available)
- ALL rows MUST follow SAME structure
- Keep values SHORT
- Do NOT hallucinate
- If missing, use "N/A"
- Return valid JSON only
- Do not wrap JSON in markdown or explanation

Use EXACT columns:
${schema.columns.join(", ")}

Return ONLY JSON array.

Text:
${summary}
`;

        let structuredData = [];

        try{
            const jsonResponse = await askAI(structuredPrompt);

            console.log("RAW JSON:", jsonResponse);

            structuredData = parseStructuredRows(jsonResponse);

            if(!Array.isArray(structuredData)){
                structuredData = [];
            }

        } catch(err){
            console.log("❌ JSON parsing failed:", err.message);
            structuredData = [];
        }


        // 🧹 STEP 6: CLEAN + ENFORCE SCHEMA
        reportProgress(onProgress, 90, "STRUCTURING_DATA");

        structuredData = structuredData.map(obj => {

            const cleanObj = {};

            schema.columns.forEach(col => {

                let value = obj[col];

                if(typeof value === "string"){
                    value = value.trim();

                    if(value.length > 80){
                        value = value.slice(0, 80);
                    }
                }

                cleanObj[col] = value || "N/A";
            });

            return cleanObj;
        });


        // ⚠️ STEP 7: FALLBACK IF TOO FEW ROWS
        if(structuredData.length < 5){

            console.log("⚠️ Using schema fallback");

            structuredData = summary.split(/[\.\n]/)
                .map((line, i) => {
                    const obj = {};

                    schema.columns.forEach((col, index) => {
                        obj[col] = index === 0 ? line.trim() : "N/A";
                    });

                    return obj;
                })
                .filter(item => item[schema.columns[0]].length > 10)
                .slice(0, 10);
        }


        steps.push("STRUCTURE_DATA");
        steps.push("FINISH");

        charts = generateChartSuggestions(structuredData);


        return {
            query,
            steps,
            answer: summary,
            sources: urls,
            sourceUrls: urls,
            text: combinedText,
            tables,
            images,
            charts,
            failures,
            data: structuredData
        };

    } catch(error){

        console.log("🔥 Agent Error:", error.message);

        const errorData = [
            {
                name: "Error",
                description: error.message,
                category: "System"
            }
        ];

        return {
            query: typeof input === "string" ? input : input?.query,
            steps,
            answer: "Agent failed: " + error.message,
            sources: urls,
            sourceUrls: urls,
            text: collectedText.join("\n\n"),
            tables,
            images,
            charts: generateChartSuggestions(errorData),
            failures: [
                ...failures,
                {
                    url: "",
                    stage: "AGENT",
                    message: error.message
                }
            ],
            data: errorData
        };
    }
}
