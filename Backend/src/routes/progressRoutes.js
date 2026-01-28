const express = require("express");
const Progress = require("../models/Progress");
const authMiddleware = require("../middleware/auth");
const router = express.Router();

router.use(authMiddleware);

// Add progress
router.post("/", async (req, res) => {
  try {
    const progress = new Progress({ ...req.body, user: req.userId });
    await progress.save();
    await progress.populate("subject");
    res.json(progress);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get user's progress
router.get("/", async (req, res) => {
  try {
    const progress = await Progress.find({ user: req.userId }).populate("subject");
    res.json(progress);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update progress
router.put("/:id", async (req, res) => {
  try {
    const progress = await Progress.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate("subject");
    res.json(progress);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete progress
router.delete("/:id", async (req, res) => {
  try {
    await Progress.findByIdAndDelete(req.params.id);
    res.json({ message: "Progress deleted" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;