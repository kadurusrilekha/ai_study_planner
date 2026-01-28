const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  title: String,
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Task", taskSchema);