// ============================================
// NeuroAdapt Edu - Backend Server (RAG + Cosine Similarity)
// ============================================

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const fetch = (...args) => import("node-fetch").then(({default: fetch}) => fetch(...args));

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// ============================================
// VECTOR STORE (IN MEMORY)
// ============================================

let vectorStore = [];

// ============================================
// TEXT CHUNKING
// ============================================

function splitText(text, chunkSize = 800) {

    const chunks = [];

    for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.substring(i, i + chunkSize));
    }

    return chunks;

}

// ============================================
// CREATE EMBEDDING
// ============================================

async function createEmbedding(text) {

    const response = await fetch("http://localhost:11434/api/embeddings", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "nomic-embed-text",
            prompt: text
        })
    });

    const data = await response.json();

    return data.embedding;

}

// ============================================
// STORE CHUNKS + EMBEDDINGS
// ============================================

async function storeChunks(chunks) {

    vectorStore = [];

    for (const chunk of chunks) {

        const embedding = await createEmbedding(chunk);

        vectorStore.push({
            text: chunk,
            embedding: embedding
        });

    }

}

// ============================================
// COSINE SIMILARITY
// ============================================

function cosineSimilarity(a, b) {

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {

        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];

    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));

}

// ============================================
// SMART CHUNK RETRIEVAL
// ============================================

async function retrieveChunks(queryText) {

    const queryEmbedding = await createEmbedding(queryText);

    const scoredChunks = vectorStore.map(chunk => {

        const score = cosineSimilarity(queryEmbedding, chunk.embedding);

        return {
            text: chunk.text,
            score: score
        };

    });

    scoredChunks.sort((a, b) => b.score - a.score);

    return scoredChunks.slice(0, 3).map(c => c.text);

}

// ============================================
// CALL OLLAMA LLM
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

app.get("/api/health", (req, res) => {

    res.json({
        status: "OK",
        message: "NeuroAdapt Edu API running",
        time: new Date()
    });

});

// ============================================
// MAIN ANALYSIS API
// ============================================

app.post("/api/analyze", async (req, res) => {

    try {

        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ error: "No text provided" });
        }

        // STEP 1: SPLIT TEXT
        const chunks = splitText(text);

        // STEP 2: CREATE EMBEDDINGS
        await storeChunks(chunks);

        // STEP 3: RETRIEVE MOST RELEVANT CHUNKS
        const relevantChunks = await retrieveChunks(text);

        const context = relevantChunks.join("\n");

        // STEP 4: AI PROMPT

        const prompt = `
You are an AI study assistant.

Analyze the learning material below.

Return JSON only in this format:

{
 "summary": "short summary",
 "keyConcepts": ["concept1","concept2","concept3"],
 "quizQuestions": ["question1","question2","question3"],
 "studyTips": ["tip1","tip2"]
}

Content:
${context}
`;

        // STEP 5: CALL AI

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
            error: "AI processing failed"
        });

    }

});

// ============================================
// 404 HANDLER
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
Model: ${process.env.LLM_MODEL || "phi3"}
RAG: ENABLED
Cosine Similarity: ENABLED
=========================================
`);

});