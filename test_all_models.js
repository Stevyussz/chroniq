require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const modelsToTest = [
        'gemini-1.5-flash',
        'gemini-flash-latest',
        'gemini-flash-lite-latest',
        'gemini-2.5-flash-lite',
        'gemini-2.0-flash-lite',
        'gemini-2.0-flash',
        'gemini-2.5-flash'
    ];

    for (const modelName of modelsToTest) {
        console.log(`\nTesting model: ${modelName}`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Halo pendek");
            console.log(`[SUCCESS] ${modelName}:`, result.response.text());
        } catch (e) {
            console.error(`[ERROR] ${modelName}:`, e.message.split('\n')[0]);
        }
    }
}

testModels();
