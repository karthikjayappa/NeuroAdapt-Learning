// ============================================
// NeuroAdapt Edu - Backend Server (Professional Chatbot)
// ============================================

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// ============================================
// MULTI-TURN CHAT HISTORY (OPTIONAL)
// ============================================
let conversationHistory = []; // optional, can remove if not needed
const MAX_HISTORY = 3; // only keep last 3 AI + 3 user for very short context

// ============================================
// CALL OLLAMA
// ============================================
async function callOllama(prompt) {
  try {
    console.log("Prompt sent to Ollama:\n", prompt);

    const model = process.env.LLM_MODEL || "phi3";
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false })
    });

    const data = await response.json();
    console.log("Ollama Raw Response:\n", data);

    return data.response || "Sorry, I couldn't generate a response.";
  } catch (err) {
    console.error("Ollama call error:", err);
    return "Sorry, AI service is unavailable.";
  }
}

// ============================================
// HEALTH CHECK
// ============================================
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "NeuroAdapt Edu Professional Chatbot API running",
    time: new Date()
  });
});

// ============================================
// CHATBOT ENDPOINT
// ============================================
app.post("/api/analyze", async (req, res) => {
  try {
    const { text, mode } = req.body; // mode: "independent" or "multi-turn"
    if (!text) return res.status(400).json({ error: "No text provided" });

    let prompt = "";

    if (mode === "independent" || !mode) {
      // always concise, no history
      prompt = `You are a professional AI assistant. Answer the user's question directly and concisely (1–3 sentences). Do NOT reference previous answers. Question: ${text}`;
    } else {
      // optional multi-turn (very short history)
      conversationHistory.push({ role: "user", content: text });
      if (conversationHistory.length > MAX_HISTORY) {
        conversationHistory = conversationHistory.slice(-MAX_HISTORY);
      }

      prompt = `
You are a professional AI assistant.
- Keep answers concise: 1-3 sentences maximum.
- Only answer what the user asks.
- Do NOT reference previous answers.
- Maintain a friendly, professional tone.

Conversation history:
`;
      conversationHistory.forEach(msg => {
        prompt += `${msg.role === "user" ? "User" : "AI"}: ${msg.content}\n`;
      });

      prompt += "AI:";
    }

    const aiResponse = await callOllama(prompt);

    // Store in history only for multi-turn
    if (mode && mode !== "independent") {
      conversationHistory.push({ role: "ai", content: aiResponse });
    }

    res.json({ success: true, response: aiResponse });

  } catch (error) {
    console.error("AI ERROR:", error);
    res.status(500).json({ error: "AI processing failed" });
  }
});

// ============================================
// RESET CHAT HISTORY
// ============================================
app.post("/api/reset", (req, res) => {
  conversationHistory = [];
  res.json({ success: true, message: "Conversation history cleared." });
});

// ============================================
// 404 HANDLER
// ============================================
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
=========================================
NeuroAdapt Edu Professional Chatbot Running
Port: ${PORT}
Model: ${process.env.LLM_MODEL || "phi3"}
Responses: concise & professional by default
=========================================
`);
});