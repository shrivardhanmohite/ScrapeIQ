import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

// 🔥 DOMAIN INTELLIGENCE FUNCTION
function enhanceQuery(query){

    const q = query.toLowerCase();

    // 🎬 Movies
    if(q.includes("movie") || q.includes("film") || q.includes("bollywood")){
        return query + " site:imdb.com OR site:wikipedia.org";
    }

    // 🛒 Products
    if(q.includes("phone") || q.includes("laptop") || q.includes("price") || q.includes("product")){
        return query + " site:amazon.in OR site:flipkart.com";
    }

    // 🏢 Companies / startups
    if(q.includes("company") || q.includes("startup") || q.includes("ceo")){
        return query + " site:forbes.com OR site:crunchbase.com";
    }

    // 🎓 Education / concepts
    if(q.includes("what is") || q.includes("explain") || q.includes("definition")){
        return query + " site:wikipedia.org OR site:britannica.com";
    }

    // 🧠 Default (balanced)
    return query;
}

export async function searchWeb(query){

    try{

        const enhancedQuery = enhanceQuery(query);

        console.log("🧠 Enhanced Query:", enhancedQuery);

        const response = await axios.post(
            "https://api.tavily.com/search",
            {
                api_key: process.env.TAVILY_API_KEY,
                query: enhancedQuery,

                max_results: 10,
                search_depth: "advanced"
            }
        );

        let urls = response.data.results.map(r => r.url);

        // 🔥 Clean URLs
        urls = urls.filter(Boolean);
        urls = [...new Set(urls)];

        console.log("🔍 Search results:", urls);

        return urls;

    } catch(error){

        console.log("❌ Search API Error:", error.message);

        return [];
    }
}