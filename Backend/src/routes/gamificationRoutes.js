const express = require("express");
const Gamification = require("../models/Gamification");
const authMiddleware = require("../middleware/auth");
const router = express.Router();

router.use(authMiddleware);

// Get user gamification data
router.get("/", async (req, res) => {
  try {
    let stats = await Gamification.findOne({ user: req.userId });
    if (!stats) {
      stats = new Gamification({
        user: req.userId,
        xp: 0,
        level: 1,
        achievements: [
          { id: "first_login", title: "Welcome Scholar", description: "Created your AI Study Planner account" }
        ]
      });
      await stats.save();
    }
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Award XP Endpoint (Idempotent by activityId)
router.post("/award-xp", async (req, res) => {
  try {
    const { actionType, customXp, activityId } = req.body;
    const now = new Date();

    let stats = await Gamification.findOne({ user: req.userId });
    if (!stats) {
      stats = new Gamification({
        user: req.userId,
        xp: 0,
        level: 1,
        achievements: [
          { id: "first_login", title: "Welcome Scholar", description: "Created your AI Study Planner account" }
        ]
      });
    }

    // Check for idempotency: if activityId was already logged, return current stats without duplicate XP
    if (activityId && stats.activityLog.some((log) => log.activityId === String(activityId))) {
      return res.json({
        success: true,
        alreadyAwarded: true,
        xpGained: 0,
        totalXp: stats.xp,
        level: stats.level,
        achievements: stats.achievements
      });
    }

    // Determine XP to award
    let xpGained = customXp || 20;
    if (actionType === "session_completed") xpGained = 50;
    else if (actionType === "quiz_completed") xpGained = 30;
    else if (actionType === "task_completed") xpGained = 20;
    else if (actionType === "flashcard_reviewed") xpGained = 10;

    stats.xp += xpGained;

    // Calculate level (every 200 XP = 1 Level)
    const newLevel = Math.max(1, Math.floor(stats.xp / 200) + 1);
    const leveledUp = newLevel > stats.level;
    stats.level = newLevel;

    // Check achievement unlocks
    const hasBadge = (id) => stats.achievements.some((a) => a.id === id);

    if (actionType === "task_completed" && !hasBadge("first_task")) {
      stats.achievements.push({
        id: "first_task",
        title: "Task Crusher",
        description: "Completed your first focus task",
        unlockedAt: now
      });
    }

    if (actionType === "quiz_completed" && !hasBadge("quiz_master")) {
      stats.achievements.push({
        id: "quiz_master",
        title: "Quiz Master",
        description: "Completed an interactive study quiz",
        unlockedAt: now
      });
    }

    // Log activity
    stats.activityLog.push({
      type: actionType,
      xpGained,
      activityId: activityId ? String(activityId) : undefined,
      date: now
    });

    await stats.save();

    res.json({
      success: true,
      alreadyAwarded: false,
      xpGained,
      totalXp: stats.xp,
      level: stats.level,
      leveledUp,
      achievements: stats.achievements
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
