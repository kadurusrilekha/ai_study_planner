const express = require("express");
const Subject = require("../models/Subject");
const Schedule = require("../models/Schedule");
const Task = require("../models/Task");
const Quiz = require("../models/Quiz");
const Flashcard = require("../models/Flashcard");
const Exam = require("../models/Exam");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.use(authMiddleware);

// GET /api/search?q=query
router.get("/", async (req, res) => {
  try {
    const queryStr = (req.query.q || "").trim();
    if (!queryStr) {
      return res.json({
        success: true,
        query: "",
        totalMatches: 0,
        results: { subjects: [], schedules: [], tasks: [], quizzes: [], flashcards: [], exams: [] }
      });
    }

    const userId = req.userId;
    // Normalize regex special characters and handle flexible multi-space matching
    const safeQuery = queryStr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(safeQuery.replace(/\s+/g, "\\s+"), "i");

    // Pre-fetch matching subject IDs to support cross-referencing in related models
    const matchingSubjectDocs = await Subject.find({
      user: userId,
      $or: [
        { name: regex },
        { syllabus: regex },
        { "topics.name": regex }
      ]
    }).select("_id");
    const matchingSubjectIds = matchingSubjectDocs.map((s) => s._id);

    // Parallel multi-model search
    const [subjects, schedules, tasks, quizzes, flashcards, exams] = await Promise.all([
      Subject.find({
        user: userId,
        $or: [
          { name: regex },
          { syllabus: regex },
          { "topics.name": regex }
        ]
      }).limit(5),

      Schedule.find({
        user: userId,
        $or: [
          { topic: regex },
          { notes: regex },
          { type: regex },
          { day: regex },
          { subject: { $in: matchingSubjectIds } }
        ]
      }).populate("subject").limit(5),

      Task.find({
        user: userId,
        $or: [
          { title: regex },
          { topic: regex },
          { subject: { $in: matchingSubjectIds } }
        ]
      }).populate("subject").limit(5),

      Quiz.find({
        user: userId,
        $or: [
          { title: regex },
          { topic: regex },
          { "questions.questionText": regex },
          { subject: { $in: matchingSubjectIds } }
        ]
      }).populate("subject").limit(5),

      Flashcard.find({
        user: userId,
        $or: [
          { front: regex },
          { back: regex },
          { topic: regex },
          { subject: { $in: matchingSubjectIds } }
        ]
      }).populate("subject").limit(5),

      Exam.find({
        user: userId,
        $or: [
          { title: regex },
          { notes: regex },
          { subject: { $in: matchingSubjectIds } }
        ]
      }).populate("subject").limit(5)
    ]);

    const totalMatches =
      subjects.length +
      schedules.length +
      tasks.length +
      quizzes.length +
      flashcards.length +
      exams.length;

    res.json({
      success: true,
      query: queryStr,
      totalMatches,
      results: {
        subjects,
        schedules,
        tasks,
        quizzes,
        flashcards,
        exams
      }
    });
  } catch (error) {
    console.error("Search API error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
