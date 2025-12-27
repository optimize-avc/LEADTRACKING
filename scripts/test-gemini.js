const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

async function test() {
    console.log("Testing Gemini API...");
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
        console.error("No API Key found in .env.local");
        return;
    }
    console.log("API Key Prefix:", apiKey.substring(0, 4));

    const genAI = new GoogleGenerativeAI(apiKey);

    // List available models
    try {
        console.log("\n--- Listing Models ---");
        // Note: SDK doesn't always expose listModels on the client instance easily, 
        // usually it's a separate API call or manager.
        // But let's try a direct fetch to the API to see what we have access to.
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        if (data.models) {
            console.log("AVAILABLE MODELS (Exact Names):");
            console.log(JSON.stringify(data.models.map(m => m.name), null, 2));
        } else {
            console.log("ListModels response:", data);
        }
    } catch (e) {
        console.error("ListModels failed", e.message);
    }

    // Try experimental models commonly found on new keys
    const moreModels = ["gemini-2.0-flash-exp", "gemini-experimental", "gemini-1.5-pro-latest", "gemma-2-9b-it"];
    for (const modelName of moreModels) {
        console.log(`\n--- Testing ${modelName} ---`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hello?");
            const response = await result.response;
            console.log(`SUCCESS [${modelName}]:`, response.text());
        } catch (error) {
            console.error(`FAILED [${modelName}]:`, error.message);
        }
    }
}

test();
