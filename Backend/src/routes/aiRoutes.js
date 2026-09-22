const express = require("express");
const AiService = require("../services/aiService");
const Subject = require("../models/Subject");
const Task = require("../models/Task");
const QuizAttempt = require("../models/QuizAttempt");
const Flashcard = require("../models/Flashcard");
const Exam = require("../models/Exam");
const authMiddleware = require("../middleware/auth");
const router = express.Router();

router.use(authMiddleware);

// Generate personalized study plan
router.post("/generate-plan", async (req, res) => {
  try {
    const result = await AiService.generateStudyPlan(req.body);
    res.json(result);
  } catch (error) {
    console.error("AI Plan Generation Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Context-Aware AI Study Assistant Chat Endpoint
router.post("/chat", async (req, res) => {
  try {
    const { message = "" } = req.body;
    const userId = req.userId;

    // Gather Live Database Context
    const [subjects, tasks, attempts, flashcards, exams] = await Promise.all([
      Subject.find({ user: userId }),
      Task.find({ user: userId, status: { $ne: "Completed" } }),
      QuizAttempt.find({ user: userId }),
      Flashcard.find({ user: userId }),
      Exam.find({ user: userId }).sort({ examDate: 1 })
    ]);

    const result = AiService.chatWithAssistant(message, {
      subjects,
      tasks,
      attempts,
      flashcards,
      exams
    });

    res.json({
      success: true,
      reply: result.reply,
      actionLink: result.actionLink,
      contextData: {
        activeSubjectsCount: subjects.length,
        pendingTasksCount: tasks.length,
        totalFlashcardsCount: flashcards.length
      }
    });
  } catch (error) {
    console.error("AI Assistant Chat Error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
