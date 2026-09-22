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
    const progress = await Progress.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate("subject");
    if (!progress) {
      return res.status(404).json({ error: "Progress record not found" });
    }
    res.json(progress);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete progress
router.delete("/:id", async (req, res) => {
  try {
    const result = await Progress.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!result) {
      return res.status(404).json({ error: "Progress record not found" });
    }
    res.json({ message: "Progress deleted" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;