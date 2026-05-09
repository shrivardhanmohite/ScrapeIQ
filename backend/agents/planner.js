export function createPlan(query){

    return [
        "SEARCH_WEB",
        "OPEN_URL",
        "EXTRACT_TEXT",
        "SUMMARIZE",
        "FINISH"
    ];

}