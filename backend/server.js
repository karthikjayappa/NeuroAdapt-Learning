// ============================================
// NeuroAdapt Edu - Backend Server (Ollama AI)
// ============================================

// Import required modules
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { exec } = require('child_process');

// Load environment variables from .env file
dotenv.config();

// Initialize Express app
const app = express();

// ============================================
// Middleware Configuration
// ============================================

// Enable CORS to allow requests from frontend
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON request bodies with increased limit (50MB)
app.use(express.json({ limit: '50mb' }));

// Parse URL-encoded request bodies with increased limit
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============================================
// Ollama AI Helper Function
// ============================================

/**
 * Call Ollama AI locally using CLI
 * @param {string} prompt - The text prompt to send to the model
 * @returns {Promise<string>} - AI generated response
 */
function callOllama(prompt) {
    return new Promise((resolve, reject) => {
        // Replace quotes to avoid CLI issues
        const command = `ollama run ${process.env.LLM_MODEL} "${prompt.replace(/"/g, '\\"')}"`;

        exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
            if (error) return reject(error);
            if (stderr) console.error('Ollama STDERR:', stderr);
            resolve(stdout);
        });
    });
}

// ============================================
// API Endpoints
// ============================================

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'NeuroAdapt Edu API is running',
        timestamp: new Date().toISOString()
    });
});

// Main analysis endpoint
app.post('/api/analyze', async (req, res) => {
    try {
        // Extract text from request body
        const { text } = req.body;

        // Validate that text is provided
        if (!text || text.trim().length === 0) {
            return res.status(400).json({
                error: 'Text content is required',
                message: 'Please provide extracted text from the PDF'
            });
        }

        // Limit text length to avoid processing overload
        const maxTextLength = process.env.MAX_TEXT_LENGTH || 10000;
        const truncatedText = text.length > maxTextLength
            ? text.substring(0, maxTextLength) + '\n... (content truncated)'
            : text;

        // Create the prompt for Ollama
        const prompt = `
Analyze the following study material and convert it into:

1. Easy-to-understand bullet point notes (student-friendly)
2. Short summary paragraph of main concepts

Keep explanations simple and clear.
Only use the content provided below.

Study Material:
${truncatedText}
`;

        // Call Ollama AI
        const aiResponse = await callOllama(prompt);

        // Return the response to frontend
        res.json({
            success: true,
            data: aiResponse,
            message: 'Analysis completed successfully using Ollama AI'
        });

    } catch (error) {
        console.error('Server Error:', error);

        res.status(500).json({
            error: 'Server Error',
            message: error.message || 'An unexpected error occurred'
        });
    }
});

// ============================================
// Error Handling Middleware
// ============================================

// 404 handler for undefined routes
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested endpoint does not exist'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: 'Something went wrong on the server'
    });
});

// ============================================
// Server Startup
// ============================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   NeuroAdapt Edu Backend Server (Ollama AI)              ║
║                                                           ║
║   Server running on port ${PORT}                            ║
║   Environment: ${process.env.NODE_ENV || 'development'}              ║
║                                                           ║
║   API Endpoints:                                          ║
║   - GET  /api/health                                      ║
║   - POST /api/analyze                                     ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});