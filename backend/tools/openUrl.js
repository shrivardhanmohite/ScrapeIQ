import { chromium } from "playwright";

export async function openUrl(url, options = {}){
    const {
        browser,
        timeoutMs = Number(process.env.PAGE_TIMEOUT_MS) || 30000,
        delayMs = 0
    } = options;

    console.log("Opening URL:", url);

    if(!url || !url.startsWith("http")){
        throw new Error("Invalid URL provided to openUrl()");
    }

    if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    const ownsBrowser = !browser;
    const activeBrowser = browser || await chromium.launch({
        headless: true
    });
    const page = await activeBrowser.newPage();

    try{

        await page.goto(url,{
            waitUntil: "domcontentloaded",
            timeout: timeoutMs
        });

        const html = await page.content();

        await page.close();

        if (ownsBrowser) {
            await activeBrowser.close();
        }

        return html;

    }catch(error){

        await page.close().catch(() => {});

        if (ownsBrowser) {
            await activeBrowser.close().catch(() => {});
        }

        throw new Error("Failed to open page: " + error.message);
    }
}
