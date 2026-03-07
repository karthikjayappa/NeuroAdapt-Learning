// --- State Management ---
let userPreferences = {
    name: '',
    age: '',
    difficulties: []
};

// --- Step 1: Handle Onboarding Form ---
document.getElementById('needsForm').addEventListener('submit', function(e) {
    e.preventDefault();

    // Capture Data
    userPreferences.name = document.getElementById('studentName').value.trim();
    userPreferences.age = document.getElementById('age').value.trim();
    
    const checkboxes = document.querySelectorAll('input[name="difficulty"]:checked');
    userPreferences.difficulties = Array.from(checkboxes).map(cb => cb.value);

    // Validate
    if (!userPreferences.name) {
        alert("Please enter your name.");
        return;
    }

    // UI Transition with animation
    const onboardingSection = document.getElementById('onboarding-section');
    const appSection = document.getElementById('app-section');
    
    onboardingSection.style.opacity = '0';
    onboardingSection.style.transform = 'translateY(-20px)';
    
    setTimeout(() => {
        onboardingSection.classList.add('hidden');
        appSection.classList.remove('hidden');
        appSection.style.opacity = '0';
        
        // Fade in app section
        setTimeout(() => {
            appSection.style.transition = 'opacity 0.5s ease';
            appSection.style.opacity = '1';
        }, 50);
    }, 300);
    
    console.log("User Profile Created:", userPreferences);
});

// --- Step 2: Handle File Upload ---
const fileInput = document.getElementById('file-upload');
const fileNameDisplay = document.getElementById('file-name');
const analyzeBtn = document.getElementById('analyze-btn');

fileInput.addEventListener('change', function() {
    if (this.files && this.files[0]) {
        const file = this.files[0];
        fileNameDisplay.textContent = file.name;
        analyzeBtn.disabled = false;
        
        // Show file info
        const fileSize = (file.size / 1024).toFixed(2);
        fileNameDisplay.textContent = `${file.name} (${fileSize} KB)`;
    } else {
        fileNameDisplay.textContent = "No file chosen";
        analyzeBtn.disabled = true;
    }
});

// --- Step 3: Handle Analysis & AI Call ---
analyzeBtn.addEventListener('click', async function() {
    const file = fileInput.files[0];
    const apiKey = document.getElementById('apiKey').value.trim();
    const loader = document.getElementById('loader');
    const resultsArea = document.getElementById('results-area');

    // Validation
    if (!apiKey) {
        alert("Please enter your OpenAI API Key.");
        return;
    }

    if (!file) {
        alert("Please select a file first.");
        return;
    }

    // UI Loading State
    loader.style.display = 'block';
    resultsArea.style.display = 'none';
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = 'Analyzing...';

    try {
        // 1. Read File Content
        let fileContent = "";
        if (file.type === "text/plain") {
            fileContent = await file.text();
        } else if (file.type === "application/pdf") {
            fileContent = await readPDF(file);
        } else {
            throw new Error("Unsupported file type. Please upload .txt or .pdf");
        }

        // 2. Construct Prompt based on User Preferences
        const difficultyContext = userPreferences.difficulties.length > 0 
            ? `The user has the following learning needs: ${userPreferences.difficulties.join(", ")}. Please simplify the language, use bullet points, and avoid long paragraphs.` 
            : "Please provide standard educational content.";

        const prompt = `
            Act as an expert AI tutor. 
            User Name: ${userPreferences.name}
            User Age: ${userPreferences.age}
            ${difficultyContext}

            Here is the text content from the uploaded file:
            "${fileContent.substring(0, 10000)}"

            Please generate:
            1. Easy-to-understand notes (bullet points).
            2. A concise summary.
            3. 3-5 Flashcards (Question/Answer format).
            4. 3 YouTube search terms for video suggestions.
        `;

        // 3. Call OpenAI API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                temperature: 0.7,
                max_tokens: 2000,
                messages: [
                    { role: "system", content: "You are a helpful educational assistant." },
                    { role: "user", content: prompt }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "API request failed");
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        // 4. Parse AI Response and Display
        const aiText = data.choices[0].message.content;
        displayResults(aiText);

    } catch (error) {
        alert("Error: " + error.message);
        console.error(error);
    } finally {
        loader.style.display = 'none';
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = 'Analyze with AI';
    }
});

// Helper: Read PDF
async function readPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let text = "";
    
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        text += pageText + "\n\n";
    }
    
    return text;
}

// Helper: Parse AI Response
function parseAIResponse(text) {
    const sections = [];
    
    // Split by common headers
    const headers = ['Notes', 'Summary', 'Flashcards', 'Video', 'YouTube'];
    
    let currentSection = null;
    let currentContent = [];
    
    const lines = text.split('\n');
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Check if this line is a section header
        const isHeader = headers.some(header => 
            trimmedLine.toLowerCase().includes(header.toLowerCase())
        );
        
        if (isHeader && trimmedLine.length < 50) {
            // Save previous section
            if (currentSection && currentContent.length > 0) {
                sections.push({
                    type: currentSection,
                    content: currentContent.join('\n')
                });
            }
            
            // Start new section
            currentSection = trimmedLine.toLowerCase().includes('notes') ? 'notes' :
                            trimmedLine.toLowerCase().includes('summary') ? 'summary' :
                            trimmedLine.toLowerCase().includes('flashcard') ? 'flashcards' :
                            trimmedLine.toLowerCase().includes('video') ? 'videos' : null;
            currentContent = [];
        } else if (currentSection) {
            currentContent.push(trimmedLine);
        }
    }
    
    // Save last section
    if (currentSection && currentContent.length > 0) {
        sections.push({
            type: currentSection,
            content: currentContent.join('\n')
        });
    }
    
    return sections;
}

// Helper: Display Results
function displayResults(aiText) {
    const resultsArea = document.getElementById('results-area');
    const notesList = document.getElementById('notes-content');
    const summaryContent = document.getElementById('summary-content');
    const flashcardsContent = document.getElementById('flashcards-content');
    const videosContent = document.getElementById('videos-content');

    // Clear previous content
    notesList.innerHTML = '';
    summaryContent.innerHTML = '';
    flashcardsContent.innerHTML = '';
    videosContent.innerHTML = '';

    // Parse AI response
    const sections = parseAIResponse(aiText);
    
    sections.forEach(section => {
        if (section.type === 'notes') {
            section.content.split('\n').forEach(item => {
                if (item.trim()) {
                    const li = document.createElement('li');
                    li.textContent = item.replace(/[-*•]/, '').trim();
                    notesList.appendChild(li);
                }
            });
        } else if (section.type === 'summary') {
            summaryContent.textContent = section.content;
        } else if (section.type === 'flashcards') {
            const cards = section.content.split('\n').filter(line => line.trim().length > 0);
            cards.forEach(card => {
                const div = document.createElement('div');
                div.className = 'flashcard';
                div.textContent = card;
                flashcardsContent.appendChild(div);
            });
        } else if (section.type === 'videos') {
            const terms = section.content.split('\n').filter(line => line.trim() !== '');
            terms.forEach(term => {
                const a = document.createElement('a');
                a.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(term)}`;
                a.target = '_blank';
                a.textContent = term;
                a.style.display = 'block';
                a.style.marginBottom = '8px';
                a.style.color = 'var(--primary-color)';
                a.style.textDecoration = 'none';
                a.style.fontSize = '0.95rem';
                a.style.transition = 'color 0.3s ease';
                
                a.addEventListener('mouseover', () => {
                    a.style.color = 'var(--primary-dark)';
                });
                
                a.addEventListener('mouseout', () => {
                    a.style.color = 'var(--primary-color)';
                });
                
                videosContent.appendChild(a);
            });
        }
    });

    // If parsing fails to find sections, just dump the text
    if (notesList.innerHTML === '' && summaryContent.innerHTML === '') {
        summaryContent.textContent = aiText;
    }

    resultsArea.style.display = 'grid';
}