require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function run() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const messages = [
        { role: 'user', content: 'Halo Chroniq!' }
    ];

    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: "Kamu AI produktivitas."
    });

    const userMessages = messages.filter((m) => m.role === 'user');
    const lastUserPrompt = userMessages[userMessages.length - 1]?.content || "Halo Chroniq!";

    const rawHistory = messages.slice(0, messages.length - 1);
    const formattedHistory = [];
    let expectedRole = 'user';

    for (const msg of rawHistory) {
        const role = msg.role === 'user' ? 'user' : 'model';

        if (role === expectedRole) {
            formattedHistory.push({
                role,
                parts: [{ text: msg.content }]
            });
            expectedRole = expectedRole === 'user' ? 'model' : 'user';
        } else if (formattedHistory.length > 0) {
            formattedHistory[formattedHistory.length - 1].parts[0].text += '\n\n' + msg.content;
        } else if (role === 'model') {
            continue;
        }
    }

    try {
        console.log("Starting chat session with gemini-2.0-flash...");
        const chatSession = model.startChat({
            history: formattedHistory
        });
        const result = await chatSession.sendMessage(lastUserPrompt);
        console.log("SUCCESS:", result.response.text());
    } catch (error) {
        console.error("API ERROR:", error);
    }
}
run();
