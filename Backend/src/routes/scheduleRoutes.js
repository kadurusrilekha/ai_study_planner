const express = require("express");
const Schedule = require("../models/Schedule");
const authMiddleware = require("../middleware/auth");
const router = express.Router();

router.use(authMiddleware);

// Add single schedule session
router.post("/", async (req, res) => {
  try {
    const schedule = new Schedule({ ...req.body, user: req.userId });
    await schedule.save();
    await schedule.populate("subject");
    res.json(schedule);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Batch save multiple schedule sessions (for AI Study Plan bulk save)
router.post("/batch", async (req, res) => {
  try {
    const { sessions } = req.body;
    if (!Array.isArray(sessions) || sessions.length === 0) {
      return res.status(400).json({ error: "Invalid sessions array" });
    }

    const sessionsToInsert = sessions.map((s) => ({
      ...s,
      user: req.userId
    }));

    const savedSessions = await Schedule.insertMany(sessionsToInsert);
    res.json({ success: true, count: savedSessions.length, data: savedSessions });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get user's schedules
router.get("/", async (req, res) => {
  try {
    const schedules = await Schedule.find({ user: req.userId }).populate("subject");
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update schedule session
router.put("/:id", async (req, res) => {
  try {
    const schedule = await Schedule.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate("subject");
    if (!schedule) {
      return res.status(404).json({ error: "Schedule not found" });
    }
    res.json(schedule);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete schedule session
router.delete("/:id", async (req, res) => {
  try {
    await Schedule.findOneAndDelete({ _id: req.params.id, user: req.userId });
    res.json({ message: "Schedule deleted" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;