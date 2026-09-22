const mongoose = require("mongoose");

const achievementSchema = new mongoose.Schema({
  id: String,
  title: String,
  description: String,
  unlockedAt: { type: Date, default: Date.now }
});

const activityLogSchema = new mongoose.Schema({
  type: String, // "task_completed", "session_completed", "quiz_completed", "flashcard_reviewed"
  xpGained: Number,
  activityId: String, // Unique identifier to prevent duplicate XP for same activity
  date: { type: Date, default: Date.now }
});

const gamificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  achievements: [achievementSchema],
  activityLog: [activityLogSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Gamification", gamificationSchema);
