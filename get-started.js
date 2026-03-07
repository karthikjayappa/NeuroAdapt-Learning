// --- JAVASCRIPT FUNCTIONALITY FOR THE NEW PAGE ---

document.addEventListener('DOMContentLoaded', function() {
    
    // Get the form and result elements
    const form = document.getElementById('needsForm');
    const resultsArea = document.getElementById('results-area');
    const list = document.getElementById('recommendation-list');

    // Add event listener for form submission
    form.addEventListener('submit', function(e) {
        // 1. Prevent page reload
        e.preventDefault();

        // 2. Clear previous results
        list.innerHTML = '';
        let recommendations = [];

        // 3. Read Selected Learning Difficulties (Checkboxes)
        const difficulties = document.querySelectorAll('input[name="difficulty"]:checked');
        
        difficulties.forEach((checkbox) => {
            const value = checkbox.value;
            
            if (value === 'ADHD') {
                recommendations.push("We recommend a distraction-free interface with minimal colors and shorter learning sessions.");
            }
            if (value === 'Dyslexia') {
                recommendations.push("We recommend dyslexia-friendly fonts, larger spacing, and simplified text.");
            }
            if (value === 'Autism') {
                recommendations.push("We recommend a predictable layout with clear visual cues and no sudden animations.");
            }
            if (value === 'SlowReading') {
                recommendations.push("We recommend text-to-speech integration and adjustable font sizes.");
            }
            if (value === 'LongText') {
                recommendations.push("We recommend breaking content into small, digestible chunks.");
            }
        });

        // 4. Read Preferred Learning Style (Radio Buttons)
        const style = document.querySelector('input[name="style"]:checked');
        if (style) {
            let styleText = "";
            switch(style.value) {
                case 'Summarized': styleText = "Content will be summarized into bullet points."; break;
                case 'Visual': styleText = "We will prioritize diagrams and infographics."; break;
                case 'Audio': styleText = "Audio explanations will be enabled by default."; break;
                case 'StepByStep': styleText = "Tasks will be broken down into numbered steps."; break;
            }
            recommendations.push(styleText);
        }

        // 5. Display Recommendations
        if (recommendations.length > 0) {
            recommendations.forEach(rec => {
                const li = document.createElement('li');
                li.textContent = rec;
                list.appendChild(li);
            });
            
            // Show the results area
            resultsArea.style.display = 'block';
            
            // Scroll smoothly to the results
            resultsArea.scrollIntoView({ behavior: 'smooth' });
        } else {
            alert("Please select at least one learning difficulty to generate a recommendation.");
        }
    });
});