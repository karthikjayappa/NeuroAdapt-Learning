// ============================================
// NeuroAdapt Edu - Backend Server (Google Gemini)
// ============================================

// Import required modules
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');

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
// Google Gemini API Configuration
// ============================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// ✅ CORRECT MODEL NAME (not -latest)
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=" + GEMINI_API_KEY;
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

        // Limit text length to avoid API limits
        const maxTextLength = 10000;
        const truncatedText = text.length > maxTextLength 
            ? text.substring(0, maxTextLength) + '\n... (content truncated for API limit)'
            : text;

        // Create the prompt for Google Gemini
        const prompt = `
        Analyze the following study material and convert it into:
        
        1. Easy-to-understand bullet point notes (keep it simple and student-friendly)
        2. A short summary paragraph of the main concepts
        
        Make the explanations simple and easy to understand.
        Only use the content from the PDF provided.
        
        Study Material:
        ${truncatedText}
        `;

        // Call Google Gemini API
        const response = await axios.post(GEMINI_URL, {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048
            }
        });

        // Extract the response content
        let aiResponse = response.data.candidates[0].content.parts[0].text;

        // Return the response to frontend
        res.json({
            success: true,
            data: aiResponse,
            message: 'Analysis completed successfully'
        });

    } catch (error) {
        console.error('Server Error:', error);
        
        // Handle Google Gemini API errors
        if (error.response) {
            return res.status(error.response.status).json({
                error: 'Google Gemini API Error',
                message: error.response.data?.error?.message || 'Unknown API error'
            });
        }
        
        // Handle other errors
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
    ║   NeuroAdapt Edu Backend Server                           ║
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