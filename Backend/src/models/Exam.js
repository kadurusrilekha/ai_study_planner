const mongoose = require("mongoose");

const examSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  title: {
    type: String,
    required: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject"
  },
  examDate: {
    type: Date,
    required: true
  },
  targetScore: {
    type: String,
    default: "90%"
  },
  priority: {
    type: String,
    enum: ["High", "Medium", "Low"],
    default: "High"
  },
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Exam", examSchema);
