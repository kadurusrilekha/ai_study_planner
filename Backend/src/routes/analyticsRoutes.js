const express = require("express");
const AnalyticsService = require("../services/analyticsService");
const authMiddleware = require("../middleware/auth");
const router = express.Router();

router.use(authMiddleware);

// Get Comprehensive Analytics Data from real MongoDB records
router.get("/", async (req, res) => {
  try {
    const analytics = await AnalyticsService.calculateOverviewAnalytics(req.userId);
    res.json(analytics);
  } catch (error) {
    console.error("Analytics fetch error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

