require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function run() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction: "Halo!" });
    try {
        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: "Hello AI" }] },
                { role: "model", parts: [{ text: "Hello User!" }] }
            ]
        });
        const result = await chat.sendMessage("Testing testing");
        console.log("SUCCESS:", result.response.text());
    } catch (e) {
        console.error("ERROR:", e.message);
    }
}
run();
