const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dns = require("dns");
require("dotenv").config();

// Configure Google Public DNS for Node.js to fix Windows/ISP DNS SRV lookup issues
try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch (e) {
  console.warn("Could not set custom DNS servers:", e.message);
}

console.log("mongoDB URI is ", process.env.MONGODB_URI);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api", require("./routes/authRoutes"));
app.use("/api/subjects", require("./routes/subjectRoutes"));
app.use("/api/tasks", require("./routes/taskRoutes"));
app.use("/api/progress", require("./routes/progressRoutes"));
app.use("/api/schedule", require("./routes/scheduleRoutes"));
app.use("/api/ai", require("./routes/aiRoutes"));
app.use("/api/exams", require("./routes/examRoutes"));
app.use("/api/quizzes", require("./routes/quizRoutes"));
app.use("/api/flashcards", require("./routes/flashcardRoutes"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));
app.use("/api/gamification", require("./routes/gamificationRoutes"));
app.use("/api/search", require("./routes/searchRoutes"));
app.use("/api/study-materials", require("./routes/studyMaterialRoutes"));

const PORT = process.env.PORT || 5000;

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully");
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    console.error("Please verify your MONGODB_URI in .env or update IP whitelist on MongoDB Atlas.");
  }
};

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

connectDB();

