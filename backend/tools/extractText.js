import * as cheerio from "cheerio";

export function extractText(html){

    const $ = cheerio.load(html);

    // remove unwanted tags
    $("script, style, nav, footer, header").remove();

    let text = $("body").text();

    // clean text
    text = text.replace(/\s+/g, " ").trim();

    return text.slice(0, 2000);
}