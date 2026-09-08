import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import connectDB from "../db/connectDB.js";
import jwt from "jsonwebtoken";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: "*", credentials: true }));
app.use(cookieParser());

// Connect to MongoDB
connectDB();

// Serve static files
app.use(express.static(path.join(__dirname, "../public")));

// ==================== AUTH ROUTES ====================

app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "All fields required" });
    }
    const token = jwt.sign(
      { email, name, id: Date.now() },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({ success: true, token, user: { email, name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }
    const token = jwt.sign(
      { email, id: Date.now() },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({ success: true, token, user: { email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.json({ success: true, message: "Logged out" });
});

app.get("/api/auth/me", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ success: true, user: decoded });
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
});

// ==================== CHATBOT ROUTES ====================

app.post("/api/chat", async (req, res) => {
  try {
    const { messages = [] } = req.body;
    const lastUserMessage = messages.filter(m => m.role === "user").pop();
    const userText = lastUserMessage?.text?.toLowerCase().trim() || "";
    const greetings = ["hi", "hello", "hey", "start", "help", "menu"];
    if (greetings.some(g => userText.includes(g))) {
      return res.json({
        reply: `Hey there! 👋 I'm your Streak Coach. What would you like to know?\n\n📊 Streaks Analysis\n🎯 Where You Lack\n📈 Your Stats\n🏆 Motivation\n💡 Tips`
      });
    }
    res.json({ reply: "I didn't understand that. Try asking about Streaks, Stats, or Tips!" });
  } catch (err) {
    res.status(500).json({ reply: "Something went wrong!" });
  }
});

app.post("/api/coach", (req, res) => {
  const motivations = [
    "🔥 Every day is a new opportunity to build momentum!",
    "💪 You're crushing it! Consistency is the secret to success.",
    "⚡ Small steps lead to big wins. Keep going!",
    "🎯 Focus on today. That's all that matters.",
    "🏅 You've got this! Your future self will thank you."
  ];
  res.json({ message: motivations[Math.floor(Math.random() * motivations.length)] });
});

// SPA fallback - must be last
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
