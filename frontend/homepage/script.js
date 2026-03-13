// ============================================
// NeuroAdapt AI Chatbot - script.js
// ============================================

const chat = document.getElementById("chat");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const resetBtn = document.getElementById("reset-btn");

// Append message to chat window
function appendMessage(text, sender) {
  const msg = document.createElement("div");
  msg.classList.add("message", sender);
  msg.textContent = text;
  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
}

// Show "AI is typing..." indicator
function showTypingIndicator() {
  const typing = document.createElement("div");
  typing.id = "typing-indicator";
  typing.classList.add("message", "ai");
  typing.textContent = "AI is typing...";
  chat.appendChild(typing);
  chat.scrollTop = chat.scrollHeight;
}

// Remove typing indicator
function removeTypingIndicator() {
  const typing = document.getElementById("typing-indicator");
  if (typing) typing.remove();
}

// Send user message to backend
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  appendMessage(text, "user");
  userInput.value = "";

  showTypingIndicator();

  try {
    const res = await fetch("http://localhost:3000/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    const data = await res.json();

    removeTypingIndicator();

    if (data.success) {
      appendMessage(data.response, "ai");
    } else {
      appendMessage("Error: " + (data.error || "No response"), "ai");
    }
  } catch (err) {
    removeTypingIndicator();
    appendMessage("Error: Could not reach AI.", "ai");
    console.error("Fetch error:", err);
  }
}

// Reset chat both frontend and backend
async function resetChat() {
  try {
    await fetch("http://localhost:3000/api/reset", { method: "POST" });
    chat.innerHTML = "";
  } catch (err) {
    appendMessage("Error: Could not reset chat.", "ai");
    console.error("Reset error:", err);
  }
}

// Event listeners
sendBtn.addEventListener("click", sendMessage);
resetBtn.addEventListener("click", resetChat);
userInput.addEventListener("keypress", e => {
  if (e.key === "Enter") sendMessage();
});