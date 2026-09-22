const mongoose = require("mongoose");

const scheduleSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject"
  },
  topic: String,
  date: {
    type: Date,
    default: Date.now
  },
  day: String,
  time: String,
  startTime: String, // e.g. "09:00"
  endTime: String,   // e.g. "10:30"
  duration: {
    type: Number, // in hours
    default: 1
  },
  priority: {
    type: String,
    enum: ["High", "Medium", "Low"],
    default: "Medium"
  },
  notes: String,
  type: {
    type: String,
    enum: ["Study", "Revision", "Practice", "Quiz", "Flashcard"],
    default: "Study"
  },
  completed: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Schedule", scheduleSchema);