import * as cheerio from "cheerio";

export function extractLinks(html, baseUrl = "", limit = 25) {

    const $ = cheerio.load(html);

    const links = [];

    $("a").each((i, el) => {

        const href = $(el).attr("href");

        if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
            return;
        }

        try {
            const absoluteUrl = new URL(href, baseUrl).toString();
            const normalizedUrl = absoluteUrl.split("#")[0];

            if (normalizedUrl.startsWith("http")) {
                links.push(normalizedUrl);
            }
        } catch {
            // Ignore malformed hrefs.
        }

    });

    return [...new Set(links)].slice(0, limit);
}
