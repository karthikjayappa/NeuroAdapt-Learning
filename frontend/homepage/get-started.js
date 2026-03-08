document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('needsForm');
    const resultsArea = document.getElementById('results-area');
    const loadingSpinner = document.getElementById('loading-spinner');
    const finalResults = document.getElementById('final-results');
    const fileInput = document.getElementById('pdfUpload');
    const fileNameDisplay = document.getElementById('file-name-display');

    // Update file name display when a file is selected
    fileInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            fileNameDisplay.textContent = `Selected: ${this.files[0].name}`;
            fileNameDisplay.style.color = '#5d9cec';
        } else {
            fileNameDisplay.textContent = 'No file chosen';
            fileNameDisplay.style.color = '#888';
        }
    });

    form.addEventListener('submit', function(e) {
        e.preventDefault(); // Prevent page reload

        // 1. Collect Data
        const name = document.getElementById('studentName').value;
        const age = document.getElementById('age').value;
        const selectedDifficulties = Array.from(document.querySelectorAll('input[name="difficulty"]:checked')).map(cb => cb.value);
        const file = fileInput.files[0];

        // 2. Validation
        if (!file) {
            alert("Please upload a PDF file to proceed.");
            return;
        }
        if (selectedDifficulties.length === 0) {
            alert("Please select at least one learning difficulty to personalize your results.");
            return;
        }

        // 3. UI Updates: Show Results Area & Loading State
        resultsArea.classList.remove('hidden');
        finalResults.classList.add('hidden');
        loadingSpinner.classList.remove('hidden');
        
        // Scroll to results
        resultsArea.scrollIntoView({ behavior: 'smooth' });

        // 4. Simulate AI Processing (Mocking the backend)
        setTimeout(() => {
            loadingSpinner.classList.add('hidden');
            finalResults.classList.remove('hidden');
            
            // Generate Content
            const pdfSummary = generateMockPDFSummary(file.name);
            const recommendations = generateRecommendations(selectedDifficulties);

            // Render HTML
            finalResults.innerHTML = `
                <h3>👋 Hello, ${name} (${age})</h3>
                <p>We have analyzed <strong>${file.name}</strong> and tailored a strategy for you.</p>
                
                <h3>📄 PDF Key Insights</h3>
                <p>${pdfSummary}</p>

                <h3>🧠 Personalized Recommendations</h3>
                <p>Based on your selected needs, here is how we will adapt your learning:</p>
                <ul>
                    ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            `;

        }, 2000); // 2 second simulated delay
    });

    // --- Helper Functions ---

    function generateMockPDFSummary(filename) {
        return `We identified ${Math.floor(Math.random() * 5) + 3} main concepts in "${filename}". The text focuses on core definitions, historical context, and practical application examples. Key terms are highlighted in the summary.`;
    }

    function generateRecommendations(difficulties) {
        const recommendations = [];

        if (difficulties.includes('ADHD')) {
            recommendations.push("🧩 <strong>Focus Strategy:</strong> We will break the content into 15-minute 'micro-sessions' with visual progress bars to maintain engagement.");
            recommendations.push("🚫 <strong>Distraction-Free Mode:</strong> The interface will hide non-essential navigation elements while you read.");
        }

        if (difficulties.includes('Dyslexia')) {
            recommendations.push("🔤 <strong>Font Adjustment:</strong> Text will be displayed in OpenDyslexic font with increased letter spacing (1.5x) to reduce visual crowding.");
            recommendations.push("🎨 <strong>High Contrast:</strong> We will use a cream background with dark grey text to reduce glare.");
        }

        if (difficulties.includes('SlowReading')) {
            recommendations.push("🔊 <strong>Audio Support:</strong> A 'Read Aloud' feature is enabled for every paragraph, allowing you to listen while following the text.");
            recommendations.push("🔍 <strong>Zoom Control:</strong> You can increase font size up to 200% without breaking the layout.");
        }

        if (difficulties.includes('LongText')) {
            recommendations.push("🧱 <strong>Chunking:</strong> Long paragraphs are automatically broken into bullet points and summary cards.");
            recommendations.push("📑 <strong>Visual Outlines:</strong> A sticky sidebar will show the document structure so you never lose your place.");
        }

        return recommendations;
    }
});