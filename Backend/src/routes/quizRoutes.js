const express = require("express");
const Quiz = require("../models/Quiz");
const QuizAttempt = require("../models/QuizAttempt");
const Subject = require("../models/Subject");
const authMiddleware = require("../middleware/auth");
const router = express.Router();

router.use(authMiddleware);

// Get user's quizzes
router.get("/", async (req, res) => {
  try {
    const quizzes = await Quiz.find({ user: req.userId }).populate("subject").sort({ createdAt: -1 });
    res.json(quizzes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Quiz Center Analytics & Stats
router.get("/stats", async (req, res) => {
  try {
    const attempts = await QuizAttempt.find({ user: req.userId }).sort({ createdAt: -1 });
    const totalAttempts = attempts.length;

    let averageScore = 0;
    let bestScore = 0;
    if (totalAttempts > 0) {
      const sumPct = attempts.reduce((acc, curr) => acc + (curr.percentage || 0), 0);
      averageScore = Math.round(sumPct / totalAttempts);
      bestScore = Math.max(...attempts.map((a) => a.percentage || 0));
    }

    // Determine weak topics from attempts
    const topicAgg = {};
    attempts.forEach((attempt) => {
      (attempt.topicScores || []).forEach((ts) => {
        if (!topicAgg[ts.topic]) {
          topicAgg[ts.topic] = { total: 0, count: 0 };
        }
        topicAgg[ts.topic].total += ts.percentage;
        topicAgg[ts.topic].count += 1;
      });
    });

    const weakTopics = Object.keys(topicAgg)
      .map((t) => ({
        topic: t,
        avgPct: Math.round(topicAgg[t].total / topicAgg[t].count)
      }))
      .filter((t) => t.avgPct < 70)
      .sort((a, b) => a.avgPct - b.avgPct);

    res.json({
      totalAttempts,
      averageScore,
      bestScore,
      weakTopics: weakTopics.slice(0, 3),
      recentAttempts: attempts.slice(0, 5)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const AiService = require("../services/aiService");

// Generate Quiz with AI
router.post("/generate", async (req, res) => {
  try {
    const { studyMaterialId, subjectId, subjectName, topic = "General", difficulty = "Medium", questionCount = 5, syllabus } = req.body;

    let generatedResult;

    if (studyMaterialId) {
      console.log(`[QuizRoutes] Generating PDF-grounded quiz for material: ${studyMaterialId}, topic: ${topic}`);
      generatedResult = await AiService.generateQuizFromMaterial({
        userId: req.userId,
        studyMaterialId,
        topic: topic || "General",
        difficulty,
        questionCount: Number(questionCount) || 5
      });
    } else {
      let resolvedSubjectName = subjectName;
      if (subjectId && !resolvedSubjectName) {
        const sub = await Subject.findOne({ _id: subjectId, user: req.userId });
        if (sub) resolvedSubjectName = sub.name;
      }

      generatedResult = await AiService.generateQuiz({
        userId: req.userId,
        subjectId,
        subjectName: resolvedSubjectName || "General Subject",
        topic: topic || "General",
        difficulty,
        questionCount: Number(questionCount) || 5,
        syllabus
      });
    }

    if (!generatedResult.questions || generatedResult.questions.length === 0) {
      return res.status(200).json({
        success: false,
        insufficientContent: true,
        message: generatedResult.message || `Not enough unique content available for topic "${topic}".`
      });
    }

    const quiz = new Quiz({
      user: req.userId,
      title: generatedResult.title,
      subject: subjectId || generatedResult.subject || undefined,
      studyMaterial: studyMaterialId || undefined,
      topic: topic || "General",
      difficulty: generatedResult.difficulty,
      questionCount: generatedResult.questions.length,
      questions: generatedResult.questions
    });

    await quiz.save();
    if (quiz.subject) await quiz.populate("subject");
    if (quiz.studyMaterial) await quiz.populate("studyMaterial", "fileName fileSize detectedTopics");

    res.json({
      success: true,
      quiz,
      insufficientContent: generatedResult.insufficientContent,
      message: generatedResult.message
    });
  } catch (error) {
    console.error("AI Quiz Generation error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Submit Quiz Attempt
router.post("/:id/submit", async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.id, user: req.userId });
    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const { userAnswers = {}, timeTakenSecs = 60 } = req.body;

    let correctCount = 0;
    const answerDetails = [];
    const topicMap = {};

    quiz.questions.forEach((q, idx) => {
      const selected = userAnswers[idx] !== undefined ? userAnswers[idx] : (userAnswers[String(idx)] !== undefined ? userAnswers[String(idx)] : -1);
      const isCorrect = Number(selected) === Number(q.correctAnswer);
      if (isCorrect) correctCount++;

      answerDetails.push({
        questionIndex: idx,
        selectedOption: Number(selected),
        isCorrect,
        topic: q.topic || quiz.topic || "General"
      });

      const qTopic = q.topic || quiz.topic || "General";
      if (!topicMap[qTopic]) {
        topicMap[qTopic] = { total: 0, correct: 0 };
      }
      topicMap[qTopic].total += 1;
      if (isCorrect) topicMap[qTopic].correct += 1;
    });

    const percentage = Math.round((correctCount / quiz.questions.length) * 100);

    const topicScores = Object.keys(topicMap).map((t) => ({
      topic: t,
      total: topicMap[t].total,
      correct: topicMap[t].correct,
      percentage: Math.round((topicMap[t].correct / topicMap[t].total) * 100)
    }));

    // AI Feedback synthesis based on missed questions
    const weakTopicsList = topicScores.filter((ts) => ts.percentage < 70).map((ts) => ts.topic);
    let aiFeedback = `You scored ${percentage}% on this ${quiz.difficulty} quiz. `;
    if (percentage >= 80) {
      aiFeedback += "Outstanding performance! You've demonstrated high accuracy across all tested topics.";
    } else if (weakTopicsList.length > 0) {
      aiFeedback += `Areas needing focus: ${weakTopicsList.join(", ")}. Reviewing these topics in your next study block will strengthen your score.`;
    } else {
      aiFeedback += "Good attempt! Consistent practice with flashcards will help lock in full accuracy.";
    }

    const attempt = new QuizAttempt({
      user: req.userId,
      quiz: quiz._id,
      quizTitle: quiz.title,
      score: correctCount,
      totalQuestions: quiz.questions.length,
      percentage,
      timeTakenSecs,
      difficulty: quiz.difficulty,
      topicScores,
      answers: answerDetails,
      aiFeedback
    });

    await attempt.save();

    // Award Gamification XP for completing quiz
    try {
      const Gamification = require("../models/Gamification");
      let stats = await Gamification.findOne({ user: req.userId });
      if (!stats) {
        stats = new Gamification({ user: req.userId, xp: 0, level: 1, achievements: [] });
      }
      stats.xp += 30;
      stats.level = Math.max(1, Math.floor(stats.xp / 200) + 1);
      if (!stats.achievements.some((a) => a.id === "quiz_master")) {
        stats.achievements.push({
          id: "quiz_master",
          title: "Quiz Master",
          description: "Completed an interactive study quiz",
          unlockedAt: new Date()
        });
      }
      stats.activityLog.push({
        type: "quiz_completed",
        xpGained: 30,
        activityId: String(attempt._id),
        date: new Date()
      });
      await stats.save();
    } catch (gErr) {
      console.error("Gamification error during quiz submit:", gErr);
    }

    res.json({
      success: true,
      attempt,
      correctCount,
      totalQuestions: quiz.questions.length,
      percentage,
      aiFeedback,
      topicScores
    });
  } catch (error) {
    console.error("Quiz submission error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
