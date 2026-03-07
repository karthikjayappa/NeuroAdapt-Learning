// DOM Elements
const fileInput = document.getElementById('file-upload');
const fileNameDisplay = document.getElementById('file-name');
const analyzeBtn = document.getElementById('analyze-btn');
const loader = document.getElementById('loader');
const resultsArea = document.getElementById('results-area');
const apiKeyInput = document.getElementById('apiKey');

let extractedText = "";

// 1. Handle File Selection
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        fileNameDisplay.textContent = file.name;
        analyzeBtn.disabled = false;
        processFile(file);
    }
});

// 2. Process File (PDF or Text)
async function processFile(file) {
    const reader = new FileReader();

    if (file.type === "application/pdf") {
        reader.onload = async function() {
            const typedarray = new Uint8Array(this.result);
            try {
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                let fullText = "";
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(" ");
                    fullText += pageText + "\n";
                }
                extractedText = fullText;
            } catch (error) {
                alert("Error reading PDF: " + error.message);
            }
        };
        reader.readAsArrayBuffer(file);
    } else if (file.type === "text/plain") {
        reader.onload = function() {
            extractedText = this.result;
        };
        reader.readAsText(file);
    }
}

// 3. Handle Analysis Button Click
analyzeBtn.addEventListener('click', async () => {
    if (!extractedText) return;
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        alert("Please enter your OpenAI API Key.");
        return;
    }

    // UI State: Loading
    loader.style.display = 'block';
    resultsArea.style.display = 'none';
    analyzeBtn.disabled = true;

    // Prepare Prompt
    const prompt = `
    Analyze the following study material and transform it into a structured JSON format.
    Do not output markdown code blocks (like \`\`\`json). Just output the raw JSON.
    
    The JSON structure must be:
    {
        "notes": ["bullet point 1", "bullet point 2"],
        "summary": "A short paragraph summary",
        "flashcards": [
            {"question": "Question 1", "answer": "Answer 1"},
            {"question": "Question 2", "answer": "Answer 2"}
        ],
        "videoTopics": ["Topic 1", "Topic 2"]
    }

    Material:
    ${extractedText}
    `;

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo", // Or "gpt-4" if you have access
                messages: [
                    { role: "system", content: "You are a helpful educational assistant." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7
            })
        });

        const data = await response.json();

        if (data.error) {
            alert("API Error: " + data.error.message);
            loader.style.display = 'none';
            analyzeBtn.disabled = false;
            return;
        }

        // Parse the AI response
        let content = data.choices[0].message.content;
        
        // Clean up potential markdown code blocks if the AI adds them
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();

        const resultData = JSON.parse(content);

        // Display Results
        displayResults(resultData);

    } catch (error) {
        console.error(error);
        alert("An error occurred while processing.");
    } finally {
        loader.style.display = 'none';
        analyzeBtn.disabled = false;
    }
});

// 4. Display Results
function displayResults(data) {
    resultsArea.style.display = 'grid';

    // Notes
    const notesList = document.getElementById('notes-content');
    notesList.innerHTML = "";
    data.notes.forEach(note => {
        const li = document.createElement('li');
        li.textContent = note;
        notesList.appendChild(li);
    });

    // Summary
    document.getElementById('summary-content').textContent = data.summary;

    // Flashcards
    const flashcardsContainer = document.getElementById('flashcards-content');
    flashcardsContainer.innerHTML = "";
    data.flashcards.forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.className = 'flashcard';
        cardEl.innerHTML = `
            <div class="flashcard-inner">
                <div class="flashcard-front">${card.question}</div>
                <div class="flashcard-back">${card.answer}</div>
            </div>
        `;
        cardEl.addEventListener('click', () => {
            cardEl.classList.toggle('flipped');
        });
        flashcardsContainer.appendChild(cardEl);
    });

    // Video Suggestions
    const videosContainer = document.getElementById('videos-content');
    videosContainer.innerHTML = "";
    data.videoTopics.forEach(topic => {
        const videoEl = document.createElement('div');
        videoEl.className = 'video-suggestion';
        // Create a search link for YouTube since we don't have specific video IDs
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(topic)}`;
        
        videoEl.innerHTML = `
            <h4>${topic}</h4>
            <p>Watch related videos on YouTube</p>
            <a href="${searchUrl}" target="_blank" class="btn-youtube">
                <i class="fab fa-youtube"></i> Search on YouTube
            </a>
        `;
        videosContainer.appendChild(videoEl);
    });
}