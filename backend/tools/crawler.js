import { openUrl } from "./openUrl.js";
import { extractLinks } from "./extractLinks.js";

export function normalizeUrl(url) {
    try {
        const parsed = new URL(url);
        parsed.hash = "";
        parsed.hostname = parsed.hostname.toLowerCase();

        for (const key of [...parsed.searchParams.keys()]) {
            if (/^(utm_|fbclid|gclid|mc_)/i.test(key)) {
                parsed.searchParams.delete(key);
            }
        }

        if (parsed.pathname !== "/" && parsed.pathname.endsWith("/")) {
            parsed.pathname = parsed.pathname.slice(0, -1);
        }

        return parsed.toString();
    } catch {
        return "";
    }
}

function sameHost(url, seedHosts) {
    try {
        return seedHosts.has(new URL(url).hostname);
    } catch {
        return false;
    }
}

export async function crawlUrls(seedUrls, options = {}) {
    const {
        maxDepth = 1,
        maxPages = 20,
        sameDomain = true,
        delayMs = Number(process.env.CRAWL_DELAY_MS) || 250,
        timeoutMs = Number(process.env.PAGE_TIMEOUT_MS) || 30000,
        linksPerPage = 50,
        onProgress
    } = options;

    const seeds = [...new Set(seedUrls.map(normalizeUrl).filter(Boolean))];
    const seedHosts = new Set(seeds.map((url) => new URL(url).hostname));
    const visited = new Set();
    const discovered = [];
    const queue = seeds.map((url) => ({ url, depth: 0 }));

    while (queue.length > 0 && visited.size < maxPages) {
        const next = queue.shift();

        if (!next || visited.has(next.url)) {
            continue;
        }

        visited.add(next.url);
        discovered.push(next.url);
        onProgress?.({
            visited: visited.size,
            queued: queue.length,
            url: next.url,
            depth: next.depth
        });

        if (next.depth >= maxDepth) {
            continue;
        }

        try {
            const html = await openUrl(next.url, { delayMs, timeoutMs });
            const links = extractLinks(html, next.url, linksPerPage);

            for (const link of links) {
                const normalized = normalizeUrl(link);

                if (!normalized || visited.has(normalized) || queue.some((item) => item.url === normalized)) {
                    continue;
                }

                if (sameDomain && !sameHost(normalized, seedHosts)) {
                    continue;
                }

                queue.push({ url: normalized, depth: next.depth + 1 });
            }
        } catch (error) {
            console.log("Crawl failed:", next.url, error.message);
        }
    }

    return discovered.slice(0, maxPages);
}
