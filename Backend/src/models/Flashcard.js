const mongoose = require("mongoose");

const flashcardSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject"
  },
  studyMaterial: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "StudyMaterial"
  },
  topic: { type: String, default: "General" },
  front: { type: String, required: true }, // Question / Prompt
  back: { type: String, required: true },  // Answer / Explanation
  difficulty: {
    type: String,
    enum: ["Easy", "Medium", "Hard"],
    default: "Medium"
  },
  sourceRef: {
    fileName: String,
    pageNumber: Number,
    excerpt: String
  },
  // Spaced Repetition (SuperMemo SM-2) Fields
  interval: { type: Number, default: 1 }, // Review interval in days
  easeFactor: { type: Number, default: 2.5 }, // Multiplier for interval
  repetitions: { type: Number, default: 0 },
  nextReviewDate: {
    type: Date,
    default: Date.now
  },
  lastReviewedDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ["New", "Learning", "Mastered", "Difficult"],
    default: "New"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Flashcard", flashcardSchema);
