import * as cheerio from "cheerio";

export function extractImages(html, baseUrl = "", options = {}) {
    const { limit = 25 } = options;
    const $ = cheerio.load(html || "");
    const images = [];
    const seen = new Set();

    $("img").each((_, image) => {
        if (images.length >= limit) {
            return false;
        }

        const src = $(image).attr("src") || $(image).attr("data-src") || "";
        const alt = $(image).attr("alt") || "";

        if (!src || src.startsWith("data:")) {
            return undefined;
        }

        try {
            const url = new URL(src, baseUrl).toString();

            if (!seen.has(url) && url.startsWith("http")) {
                seen.add(url);
                images.push({
                    url,
                    alt: alt.replace(/\s+/g, " ").trim()
                });
            }
        } catch {
            // Ignore malformed image URLs.
        }

        return undefined;
    });

    return images;
}
