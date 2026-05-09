import * as cheerio from "cheerio";

export function extractCharts(html, options = {}) {
    const { limit = 20 } = options;
    const $ = cheerio.load(html || "");
    const charts = [];

    $("svg, canvas, [class*='chart' i], [id*='chart' i], [class*='graph' i], [id*='graph' i]")
        .each((index, element) => {
            if (charts.length >= limit) {
                return false;
            }

            const tag = element.tagName?.toLowerCase() || "element";
            const label = $(element).attr("aria-label") ||
                $(element).attr("title") ||
                $(element).text().replace(/\s+/g, " ").trim().slice(0, 120);

            charts.push({
                index,
                type: tag,
                label: label || "Detected chart-like element"
            });

            return undefined;
        });

    return charts;
}
