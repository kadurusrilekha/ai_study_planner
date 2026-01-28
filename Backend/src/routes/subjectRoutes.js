const express = require("express");
const Subject = require("../models/Subject");
const authMiddleware = require("../middleware/auth");
const router = express.Router();

router.use(authMiddleware);

// Add subject
router.post("/", async (req, res) => {
  try {
    const subject = new Subject({ ...req.body, user: req.userId });
    await subject.save();
    res.json(subject);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get user's subjects
router.get("/", async (req, res) => {
  try {
    const subjects = await Subject.find({ user: req.userId });
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;