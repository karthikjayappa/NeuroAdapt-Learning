// ============================================
// NeuroAdapt Edu - Backend Server (Ollama AI)
// ============================================

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// ============================================
// Middleware
// ============================================

app.use(cors());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============================================
// Ollama API Call (FASTER METHOD)
// ============================================

async function callOllama(prompt) {

    const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: process.env.LLM_MODEL || "phi3",
            prompt: prompt,
            stream: false
        })
    });

    const data = await response.json();

    return data.response;

}

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', (req, res) => {

    res.json({
        status: "OK",
        message: "NeuroAdapt Edu API running",
        time: new Date()
    });

});

// ============================================
// AI ANALYSIS ENDPOINT
// ============================================

app.post('/api/analyze', async (req, res) => {

    try {

        const { text } = req.body;

        if (!text) {

            return res.status(400).json({
                error: "No text provided"
            });

        }

        // Limit text length for faster AI processing
        const MAX_TEXT = process.env.MAX_TEXT_LENGTH || 5000;

        const truncatedText =
            text.length > MAX_TEXT
                ? text.substring(0, MAX_TEXT)
                : text;

        // ============================================
        // AI PROMPT
        // ============================================

        const prompt = `
You are an AI study assistant.

Analyze the following study material.

Return ONLY JSON in this format:

{
 "summary": "short summary",
 "keyConcepts": ["concept1","concept2","concept3"],
 "quizQuestions": ["question1","question2","question3"],
 "studyTips": ["tip1","tip2"]
}

Rules:
- Summary max 3 sentences
- 3 key concepts
- 3 quiz questions
- 2 study tips

Study Material:
${truncatedText}
`;

        // ============================================
        // CALL OLLAMA
        // ============================================

        const aiResponse = await callOllama(prompt);

        let parsed;

        try {

            parsed = JSON.parse(aiResponse);

        } catch {

            parsed = {
                summary: aiResponse,
                keyConcepts: [],
                quizQuestions: [],
                studyTips: []
            };

        }

        res.json({
            success: true,
            analysis: parsed
        });

    } catch (error) {

        console.error("AI ERROR:", error);

        res.status(500).json({
            error: "AI Processing Failed"
        });

    }

});

// ============================================
// 404 ROUTE
// ============================================

app.use((req, res) => {

    res.status(404).json({
        error: "Endpoint not found"
    });

});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log(`
=========================================
NeuroAdapt Edu Backend Running
Port: ${PORT}
AI Model: ${process.env.LLM_MODEL || 'phi3'}
=========================================
`);

});