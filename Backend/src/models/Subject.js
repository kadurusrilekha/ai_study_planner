const mongoose = require("mongoose");

const topicSchema = new mongoose.Schema({
  name: { type: String, required: true },
  progress: { type: Number, default: 0 }, // 0 to 100
  completed: { type: Boolean, default: false }
});

const subjectSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  name: { type: String, required: true },
  syllabus: String,
  topics: [topicSchema],
  priority: {
    type: String,
    enum: ["High", "Medium", "Low"],
    default: "Medium"
  },
  color: {
    type: String,
    default: "#6366f1"
  },
  studyHours: {
    type: Number,
    default: 0
  },
  quizAccuracy: {
    type: Number,
    default: 0
  },
  lastStudied: {
    type: Date,
    default: Date.now
  },
  nextSession: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Subject", subjectSchema);