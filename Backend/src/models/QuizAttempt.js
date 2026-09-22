const mongoose = require("mongoose");

const answerDetailSchema = new mongoose.Schema({
  questionIndex: Number,
  selectedOption: Number,
  isCorrect: Boolean,
  topic: String
});

const topicScoreSchema = new mongoose.Schema({
  topic: String,
  total: Number,
  correct: Number,
  percentage: Number
});

const quizAttemptSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Quiz"
  },
  quizTitle: String,
  score: Number,
  totalQuestions: Number,
  percentage: Number,
  timeTakenSecs: Number,
  difficulty: String,
  topicScores: [topicScoreSchema],
  answers: [answerDetailSchema],
  aiFeedback: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("QuizAttempt", quizAttemptSchema);
