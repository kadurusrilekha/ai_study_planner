const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: Number, required: true }, // Index 0-3
  explanation: String,
  topic: String,
  sourceRef: {
    fileName: String,
    pageNumber: Number,
    excerpt: String
  }
});

const quizSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  title: { type: String, required: true },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject"
  },
  studyMaterial: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "StudyMaterial"
  },
  topic: String,
  difficulty: {
    type: String,
    enum: ["Easy", "Medium", "Hard"],
    default: "Medium"
  },
  questionCount: { type: Number, default: 5 },
  questions: [questionSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Quiz", quizSchema);
