const express = require("express");
const Schedule = require("../models/Schedule");
const authMiddleware = require("../middleware/auth");
const router = express.Router();

router.use(authMiddleware);

// Add schedule
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

// Get user's schedules
router.get("/", async (req, res) => {
  try {
    const schedules = await Schedule.find({ user: req.userId }).populate("subject");
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete schedule
router.delete("/:id", async (req, res) => {
  try {
    await Schedule.findByIdAndDelete(req.params.id);
    res.json({ message: "Schedule deleted" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;