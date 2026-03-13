document.addEventListener('DOMContentLoaded', () => {

    console.log("JS Loaded");

    const form = document.getElementById('needsForm');
    const fileInput = document.getElementById('pdfUpload');
    const fileNameDisplay = document.getElementById('file-name-display');

    // Progress Bar Elements
    const progressContainer = document.getElementById("progressContainer");
    const progressBar = document.getElementById("progressBar");
    const progressText = document.getElementById("progressText");
    const analyzeBtn = document.getElementById("analyzeBtn");

    // ==============================
    // Progress Update Function
    // ==============================
    function updateProgress(percent, message) {
        progressBar.style.width = percent + "%";
        progressText.innerText = percent + "% - " + message;
    }

    // ==============================
    // Show selected file name
    // ==============================
    fileInput.addEventListener('change', function () {
        if (this.files && this.files[0]) {
            fileNameDisplay.textContent = `Selected: ${this.files[0].name}`;
            fileNameDisplay.style.color = '#5d9cec';
        } else {
            fileNameDisplay.textContent = 'No file chosen';
            fileNameDisplay.style.color = '#888';
        }
    });

    // ==============================
    // Extract PDF text using PDF.js
    // ==============================
    async function extractPDFText(file) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let fullText = "";
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(" ");
            fullText += pageText + "\n";
        }
        return fullText;
    }

    // ==============================
    // Form Submit
    // ==============================
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const name = document.getElementById('studentName').value;
        const age = document.getElementById('age').value;

        // Single selection for radio buttons
        const selectedDifficulty = document.querySelector('input[name="difficulty"]:checked')?.value;

        const file = fileInput.files[0];

        // ==============================
        // Validation
        // ==============================
        if (!file) {
            alert("Please upload a PDF file.");
            return;
        }

        if (!selectedDifficulty) {
            alert("Please select a learning difficulty.");
            return;
        }

        try {
            // Show Progress Bar
            progressContainer.style.display = "block";
            analyzeBtn.disabled = true;
            analyzeBtn.innerText = "Analyzing...";
            updateProgress(5, "Starting analysis...");

            // ==============================
            // Extract PDF Text
            // ==============================
            updateProgress(20, "Extracting text from PDF...");
            const pdfText = await extractPDFText(file);

            updateProgress(40, "Preparing document...");

            // ==============================
            // Send request to backend
            // ==============================
            updateProgress(60, "Sending content to AI...");
            const response = await fetch("http://localhost:3000/api/analyze", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    text: pdfText
                })
            });

            updateProgress(80, "AI is analyzing the learning material...");
            const data = await response.json();
            updateProgress(100, "Analysis complete!");

            // ==============================
            // Recommendations based on selected difficulty
            // ==============================
            const recommendations = generateRecommendations(selectedDifficulty);

            // ==============================
            // Combine results
            // ==============================
            const resultPayload = {
                studentName: name,
                age: age,
                fileName: file.name,
                summary: data.summary || "No summary generated.",
                keyConcepts: data.keyConcepts || [],
                studyTips: data.studyTips || [],
                quizQuestions: data.quizQuestions || [],
                recommendations: recommendations
            };

            // ==============================
            // Redirect to analysis page
            // ==============================
            const encoded = encodeURIComponent(JSON.stringify(resultPayload));
            setTimeout(() => {
                window.location.href = `analysis.html?data=${encoded}`;
            }, 1000);

        } catch (error) {
            console.error("AI request failed:", error);
            alert("AI analysis failed. Please check server connection.");
            analyzeBtn.disabled = false;
            analyzeBtn.innerText = "Analyze";
        }
    });

    // ==========================================
    // Recommendation Logic
    // ==========================================
    function generateRecommendations(difficulty) {
        const recommendations = [];

        if (difficulty === 'ADHD') {
            recommendations.push("🧩 Focus Strategy: Break study into 15-minute micro sessions.");
            recommendations.push("🚫 Distraction-Free Mode: Hide non-essential navigation.");
        }

        if (difficulty === 'Dyslexia') {
            recommendations.push("🔤 Use OpenDyslexic font with extra letter spacing.");
            recommendations.push("🎨 Use cream background with dark text.");
        }

        return recommendations;
    }

});