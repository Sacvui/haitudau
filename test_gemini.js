require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
    console.log("Testing Gemini API with key:", process.env.GEMINI_API_KEY?.slice(0, 10));
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Try the standard flash model
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent("Hello!");
        console.log("SUCCESS! Response:", result.response.text());
    } catch (e) {
        console.error("FAILED:", e.message);
    }
}

testGemini();
