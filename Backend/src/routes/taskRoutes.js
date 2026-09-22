const express = require("express");
const Task = require("../models/Task");
const authMiddleware = require("../middleware/auth");
const router = express.Router();

router.use(authMiddleware);

// Add task
router.post("/", async (req, res) => {
  try {
    const task = new Task({ ...req.body, user: req.userId });
    await task.save();
    await task.populate("subject");
    res.json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get user's tasks
router.get("/", async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.userId }).populate("subject");
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update task details/status
router.put("/:id", async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate("subject");
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete task
router.delete("/:id", async (req, res) => {
  try {
    await Task.findOneAndDelete({ _id: req.params.id, user: req.userId });
    res.json({ message: "Task deleted" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;