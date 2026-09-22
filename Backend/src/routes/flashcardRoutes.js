const express = require("express");
const Flashcard = require("../models/Flashcard");
const authMiddleware = require("../middleware/auth");
const router = express.Router();

router.use(authMiddleware);

// Get user's flashcards
router.get("/", async (req, res) => {
  try {
    const flashcards = await Flashcard.find({ user: req.userId }).populate("subject").sort({ nextReviewDate: 1 });
    res.json(flashcards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get cards due today & difficult cards
router.get("/due", async (req, res) => {
  try {
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const dueCards = await Flashcard.find({
      user: req.userId,
      nextReviewDate: { $lte: todayEnd }
    }).populate("subject");

    const difficultCards = await Flashcard.find({
      user: req.userId,
      $or: [{ status: "Difficult" }, { easeFactor: { $lt: 2.0 } }]
    }).populate("subject");

    const masteredCardsCount = await Flashcard.countDocuments({
      user: req.userId,
      status: "Mastered"
    });

    const totalFlashcardsCount = await Flashcard.countDocuments({
      user: req.userId
    });

    const retentionRate = totalFlashcardsCount > 0 ? Math.round((masteredCardsCount / totalFlashcardsCount) * 100) : 0;

    res.json({
      dueTodayCount: dueCards.length,
      difficultCount: difficultCards.length,
      masteredCount: masteredCardsCount,
      totalCount: totalFlashcardsCount,
      retentionRate,
      dueCards,
      difficultCards
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create single flashcard
router.post("/", async (req, res) => {
  try {
    const flashcard = new Flashcard({ ...req.body, user: req.userId });
    await flashcard.save();
    if (req.body.subject) await flashcard.populate("subject");
    res.json(flashcard);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Batch create flashcards (for AI Generator bulk save)
router.post("/batch", async (req, res) => {
  try {
    const { cards } = req.body;
    if (!Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({ error: "Invalid cards array" });
    }

    const cardsToInsert = cards.map((c) => ({
      ...c,
      user: req.userId
    }));

    const savedCards = await Flashcard.insertMany(cardsToInsert);
    res.json({ success: true, count: savedCards.length, cards: savedCards });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const AiService = require("../services/aiService");
const Subject = require("../models/Subject");

// Generate Flashcards with AI
router.post("/generate", async (req, res) => {
  try {
    const { studyMaterialId, subjectId, subjectName, topic = "Core Concepts", cardCount = 5, difficulty = "Medium", syllabus } = req.body;

    let generatedResult;

    if (studyMaterialId) {
      console.log(`[FlashcardRoutes] Generating PDF-grounded flashcards for material: ${studyMaterialId}, topic: ${topic}`);
      generatedResult = await AiService.generateFlashcardsFromMaterial({
        userId: req.userId,
        studyMaterialId,
        topic: topic || "Core Concepts",
        difficulty,
        cardCount: Number(cardCount) || 5
      });
    } else {
      let resolvedSubjectName = subjectName;
      if (subjectId && !resolvedSubjectName) {
        const sub = await Subject.findOne({ _id: subjectId, user: req.userId });
        if (sub) resolvedSubjectName = sub.name;
      }

      generatedResult = await AiService.generateFlashcards({
        userId: req.userId,
        subjectId,
        subjectName: resolvedSubjectName || "General Subject",
        topic: topic || "Core Concepts",
        difficulty,
        cardCount: Number(cardCount) || 5,
        syllabus
      });
    }

    res.json({
      success: true,
      cards: generatedResult.cards || [],
      count: generatedResult.count || 0,
      insufficientContent: generatedResult.insufficientContent,
      message: generatedResult.message
    });
  } catch (error) {
    console.error("AI Flashcard Generation error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Record Spaced Repetition (SuperMemo SM-2) Rating
// Quality Rating: "Again" (0), "Hard" (1), "Good" (2), "Easy" (3)
router.post("/:id/review", async (req, res) => {
  try {
    const { rating } = req.body; // "Again", "Hard", "Good", "Easy"
    const card = await Flashcard.findOne({ _id: req.params.id, user: req.userId });

    if (!card) {
      return res.status(404).json({ error: "Flashcard not found" });
    }

    let interval = card.interval || 1;
    let easeFactor = card.easeFactor || 2.5;
    let repetitions = card.repetitions || 0;
    let status = card.status || "Learning";

    if (rating === "Again") {
      repetitions = 0;
      interval = 1; // 1 day
      status = "Difficult";
    } else if (rating === "Hard") {
      repetitions += 1;
      interval = Math.max(1, Math.round(interval * 1.2));
      easeFactor = Math.max(1.3, easeFactor - 0.15);
      status = "Learning";
    } else if (rating === "Good") {
      repetitions += 1;
      interval = Math.max(2, Math.round(interval * easeFactor));
      status = repetitions >= 3 ? "Mastered" : "Learning";
    } else if (rating === "Easy") {
      repetitions += 1;
      interval = Math.max(4, Math.round(interval * easeFactor * 1.3));
      easeFactor += 0.15;
      status = "Mastered";
    }

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);

    card.interval = interval;
    card.easeFactor = easeFactor;
    card.repetitions = repetitions;
    card.status = status;
    card.lastReviewedDate = new Date();
    card.nextReviewDate = nextReview;

    await card.save();
    res.json({ success: true, card, nextReviewIntervalDays: interval });
  } catch (error) {
    console.error("Flashcard review error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update flashcard
router.put("/:id", async (req, res) => {
  try {
    const { front, back, topic, difficulty, status, subject } = req.body;
    const flashcard = await Flashcard.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { $set: { front, back, topic, difficulty, status, subject: subject || null } },
      { new: true, runValidators: true }
    ).populate("subject");

    if (!flashcard) {
      return res.status(404).json({ error: "Flashcard not found" });
    }

    res.json(flashcard);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete flashcard
router.delete("/:id", async (req, res) => {
  try {
    await Flashcard.findOneAndDelete({ _id: req.params.id, user: req.userId });
    res.json({ message: "Flashcard deleted" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
