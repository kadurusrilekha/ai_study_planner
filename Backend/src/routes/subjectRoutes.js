const express = require("express");
const Subject = require("../models/Subject");
const AnalyticsService = require("../services/analyticsService");
const authMiddleware = require("../middleware/auth");
const router = express.Router();

router.use(authMiddleware);

// Add subject
router.post("/", async (req, res) => {
  try {
    const { name, syllabus, priority, topics = [], color } = req.body;
    const subject = new Subject({
      user: req.userId,
      name,
      syllabus,
      priority: priority || "Medium",
      topics,
      color: color || "#6366f1",
      studyHours: 0,
      quizAccuracy: 0
    });

    await subject.save();

    const [analyzed] = await AnalyticsService.calculateSubjectAnalytics(req.userId, [subject]);
    res.json(analyzed);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get user's subjects with dynamic analytics
router.get("/", async (req, res) => {
  try {
    const subjects = await Subject.find({ user: req.userId }).sort({ createdAt: -1 });
    const analyzedSubjects = await AnalyticsService.calculateSubjectAnalytics(req.userId, subjects);
    res.json(analyzedSubjects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dedicated dashboard endpoint for subject analytics
router.get("/dashboard", async (req, res) => {
  try {
    const subjects = await Subject.find({ user: req.userId }).sort({ createdAt: -1 });
    const analyzedSubjects = await AnalyticsService.calculateSubjectAnalytics(req.userId, subjects);
    res.json({
      success: true,
      subjects: analyzedSubjects
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update subject details
router.put("/:id", async (req, res) => {
  try {
    const subject = await Subject.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!subject) {
      return res.status(404).json({ error: "Subject not found" });
    }
    const [analyzed] = await AnalyticsService.calculateSubjectAnalytics(req.userId, [subject]);
    res.json(analyzed);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete subject
router.delete("/:id", async (req, res) => {
  try {
    await Subject.findOneAndDelete({ _id: req.params.id, user: req.userId });
    res.json({ message: "Subject deleted" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;