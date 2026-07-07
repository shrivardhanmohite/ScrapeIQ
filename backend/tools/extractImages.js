import * as cheerio from "cheerio";

const BLOCKED_IMAGE_TERMS = [
    "favicon",
    "logo",
    "icon",
    "sprite",
    "placeholder",
    "avatar",
    "wikipedia/static"
];

const BLOCKED_EXTENSIONS = [".ico", ".svg"];

function normalizeText(value = "") {
    return String(value).replace(/\s+/g, " ").trim();
}

function hasBlockedImageSignal(url = "", metadata = "") {
    const haystack = `${url} ${metadata}`.toLowerCase();
    return (
        BLOCKED_IMAGE_TERMS.some((term) => haystack.includes(term)) ||
        BLOCKED_EXTENSIONS.some((extension) => {
            try {
                return new URL(url).pathname.toLowerCase().endsWith(extension);
            } catch {
                return url.toLowerCase().includes(extension);
            }
        })
    );
}

function parseDimension(value) {
    const number = Number.parseInt(String(value || "").replace(/[^\d]/g, ""), 10);
    return Number.isFinite(number) ? number : 0;
}

function scoreImage({ url, alt, title, caption, width, height, parentText }) {
    let score = 0;
    const metadata = `${alt} ${title} ${caption} ${parentText}`;

    if (alt && alt.length > 6) score += 20;
    if (title && title.length > 6) score += 8;
    if (caption && caption.length > 8) score += 20;
    if (parentText && parentText.length > 20) score += 8;
    if (width >= 240 || height >= 180) score += 18;
    if (width >= 500 || height >= 320) score += 10;

    const path = new URL(url).pathname.toLowerCase();
    if (/\.(jpe?g|png|webp|avif)$/i.test(path)) score += 8;
    if (/\/(images?|photos?|media|uploads?|content)\//i.test(path)) score += 12;
    if (/\/(thumb|thumbnail|small|badge)\//i.test(path)) score -= 16;
    if (hasBlockedImageSignal(url, metadata)) score -= 100;

    return score;
}

export function extractImages(html, baseUrl = "", options = {}) {
    const { limit = 8, scanLimit = 80 } = options;
    const $ = cheerio.load(html || "");
    const candidates = [];
    const seen = new Set();

    $("img").each((_, image) => {
        if (candidates.length >= scanLimit) {
            return false;
        }

        const element = $(image);
        const src =
            element.attr("src") ||
            element.attr("data-src") ||
            element.attr("data-original") ||
            element.attr("data-lazy-src") ||
            "";
        const alt = normalizeText(element.attr("alt") || "");
        const title = normalizeText(element.attr("title") || element.attr("aria-label") || "");
        const caption = normalizeText(
            element.closest("figure").find("figcaption").first().text() ||
            element.closest("[class*='card' i], article, li").find("figcaption, [class*='caption' i]").first().text()
        );
        const parentText = normalizeText(
            element.closest("figure, article, [class*='card' i], li").text()
        ).slice(0, 180);

        if (!src || src.startsWith("data:")) {
            return undefined;
        }

        try {
            const url = new URL(src, baseUrl).toString();

            const metadata = `${alt} ${title} ${caption} ${parentText}`;
            const width = parseDimension(element.attr("width") || element.attr("data-width"));
            const height = parseDimension(element.attr("height") || element.attr("data-height"));

            if (
                !seen.has(url) &&
                url.startsWith("http") &&
                !hasBlockedImageSignal(url, metadata)
            ) {
                seen.add(url);
                const score = scoreImage({
                    url,
                    alt,
                    title,
                    caption,
                    width,
                    height,
                    parentText
                });

                if (score > 0) {
                    candidates.push({
                        url,
                        alt,
                        label: alt || title || caption || "Content image",
                        caption,
                        score
                    });
                }
            }
        } catch {
            // Ignore malformed image URLs.
        }

        return undefined;
    });

    $("meta[property='og:image'], meta[name='twitter:image']").each((_, meta) => {
        const src = $(meta).attr("content") || "";
        if (!src) return undefined;

        try {
            const url = new URL(src, baseUrl).toString();
            if (!seen.has(url) && url.startsWith("http") && !hasBlockedImageSignal(url)) {
                seen.add(url);
                candidates.push({
                    url,
                    alt: "Primary content image",
                    label: "Primary content image",
                    caption: "",
                    score: 28
                });
            }
        } catch {
            // Ignore malformed image URLs.
        }

        return undefined;
    });

    return candidates
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(({ score, ...image }) => image);
}
