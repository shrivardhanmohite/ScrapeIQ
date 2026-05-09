import { runAgent } from "../agents/orchestrator.js";

export async function runScraper(req, res) {

    const { query } = req.body;

    console.log("User Query:", query);

    const result = await runAgent(query);

    console.log("Agent Result:", result);

    res.json(result);
}