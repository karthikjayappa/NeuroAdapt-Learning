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

        console.log("Form Submitted");

        e.preventDefault();

        const name = document.getElementById('studentName').value;
        const age = document.getElementById('age').value;

        const selectedDifficulties =
            Array.from(document.querySelectorAll('input[name="difficulty"]:checked'))
                .map(cb => cb.value);

        const file = fileInput.files[0];

        // ==============================
        // Validation
        // ==============================
        if (!file) {
            alert("Please upload a PDF file.");
            return;
        }

        if (selectedDifficulties.length === 0) {
            alert("Please select at least one learning difficulty.");
            return;
        }

        console.log("File selected:", file.name);

        try {

            // Show Progress Bar
            progressContainer.style.display = "block";

            analyzeBtn.disabled = true;
            analyzeBtn.innerText = "Analyzing...";

            updateProgress(5, "Starting analysis...");


            // ==============================
            // Extract PDF Text
            // ==============================
            console.log("Extracting PDF text...");
            updateProgress(20, "Extracting text from PDF...");

            const pdfText = await extractPDFText(file);

            console.log("PDF Text Extracted");
            updateProgress(40, "Preparing document...");


            // ==============================
            // Send request to backend
            // ==============================
            console.log("Sending request to backend...");
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

            console.log("Response received");

            const data = await response.json();

            console.log("Backend Data:", data);

            updateProgress(100, "Analysis complete!");


            // ==============================
            // Support multiple response formats
            // ==============================
            const analysis = data.analysis || data;


            // ==============================
            // Generate Recommendations
            // ==============================
            const recommendations = generateRecommendations(selectedDifficulties);


            // ==============================
            // Combine results
            // ==============================
            const resultPayload = {

                studentName: name,
                age: age,
                fileName: file.name,

                summary: analysis.summary || "No summary generated.",

                keyConcepts: analysis.keyConcepts || [],

                studyTips: analysis.studyTips || [],

                quizQuestions: analysis.quizQuestions || [],

                recommendations: recommendations

            };


            // ==============================
            // Redirect to analysis page (FIXED: use sessionStorage to avoid URL length limits)
            // ==============================
            sessionStorage.setItem('neuroadapt_result', JSON.stringify(resultPayload));

            console.log("Redirecting to analysis.html");

            setTimeout(() => {

                window.location.href = `analysis.html`;

            }, 1000);

        }

        catch (error) {

            console.error("AI request failed:", error);

            alert("AI analysis failed. Please check server connection.");

            analyzeBtn.disabled = false;
            analyzeBtn.innerText = "Analyze";

        }

    });


    // ==========================================
    // Recommendation Logic
    // ==========================================
    function generateRecommendations(difficulties) {

        const recommendations = [];

        if (difficulties.includes('ADHD')) {

            recommendations.push(
                "🧩 Focus Strategy: Break study into 15-minute micro sessions."
            );

            recommendations.push(
                "🚫 Distraction-Free Mode: Hide non-essential navigation."
            );

        }

        if (difficulties.includes('Dyslexia')) {

            recommendations.push(
                "🔤 Use OpenDyslexic font with extra letter spacing."
            );

            recommendations.push(
                "🎨 Use cream background with dark text."
            );

        }

        if (difficulties.includes('SlowReading')) {

            recommendations.push(
                "🔊 Enable text-to-speech reading support."
            );

            recommendations.push(
                "🔍 Increase font size up to 200%."
            );

        }

        if (difficulties.includes('LongText')) {

            recommendations.push(
                "🧱 Convert paragraphs into bullet summaries."
            );

            recommendations.push(
                "📑 Provide visual document outlines."
            );

        }

        return recommendations;

    }

});