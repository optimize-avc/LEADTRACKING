const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

async function listAllModels() {
    try {
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        console.log('Using API Key Prefix:', apiKey.substring(0, 4));

        // Direct fetch to v1beta to ensure we see everything
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        );
        const data = await response.json();

        if (data.models) {
            console.log('--- TEXT MODELS ONLY ---');
            const textModels = data.models
                .filter(
                    (m) =>
                        (m.name.includes('gemini') || m.name.includes('gemma')) &&
                        m.supportedGenerationMethods?.includes('generateContent')
                )
                .map((m) => m.name);

            console.log(JSON.stringify(textModels, null, 2));
        } else {
            console.log('Error listing models:', data);
        }
    } catch (error) {
        console.error('Script failed:', error);
    }
}

listAllModels();
