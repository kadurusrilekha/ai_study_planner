const express = require("express");
const Exam = require("../models/Exam");
const AnalyticsService = require("../services/analyticsService");
const authMiddleware = require("../middleware/auth");
const router = express.Router();

router.use(authMiddleware);

// Add exam target
router.post("/", async (req, res) => {
  try {
    const exam = new Exam({ ...req.body, user: req.userId });
    await exam.save();
    if (exam.subject) await exam.populate("subject");

    const [analyzed] = await AnalyticsService.calculateExamAnalytics(req.userId, [exam]);
    res.json(analyzed);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get user's exams with dynamic analytics
router.get("/", async (req, res) => {
  try {
    const exams = await Exam.find({ user: req.userId }).sort({ examDate: 1 });
    const analyzedExams = await AnalyticsService.calculateExamAnalytics(req.userId, exams);
    res.json(analyzedExams);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dedicated dashboard endpoint for exams
router.get("/dashboard", async (req, res) => {
  try {
    const exams = await Exam.find({ user: req.userId }).sort({ examDate: 1 });
    const analyzedExams = await AnalyticsService.calculateExamAnalytics(req.userId, exams);
    res.json({
      success: true,
      exams: analyzedExams
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update exam target
router.put("/:id", async (req, res) => {
  try {
    const { title, subject, examDate, targetScore, priority, notes } = req.body;
    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { $set: { title, subject: subject || null, examDate, targetScore, priority, notes } },
      { new: true, runValidators: true }
    );
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }
    if (exam.subject) await exam.populate("subject");

    const [analyzed] = await AnalyticsService.calculateExamAnalytics(req.userId, [exam]);
    res.json(analyzed);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete exam
router.delete("/:id", async (req, res) => {
  try {
    await Exam.findOneAndDelete({ _id: req.params.id, user: req.userId });
    res.json({ message: "Exam deleted" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;

