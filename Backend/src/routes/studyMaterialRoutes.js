const express = require("express");
const router = express.Router();
const multer = require("multer");
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const StudyMaterial = require("../models/StudyMaterial");
const PdfProcessingService = require("../services/pdfProcessingService");

// Memory storage for PDF uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB max size limit
});

/**
 * POST /api/study-materials/upload
 * Upload PDF document, extract text & topics, save to database
 */
router.post("/upload", auth, upload.single("file"), async (req, res) => {
  try {
    const userId = req.userId || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized user." });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, error: "Please select a valid PDF file to upload." });
    }

    if (!req.file.mimetype.includes("pdf") && !req.file.originalname.toLowerCase().endsWith(".pdf")) {
      return res.status(400).json({ success: false, error: "Only PDF documents are supported." });
    }

    const { subjectId } = req.body;
    const fileName = req.file.originalname;

    // Validate optional subjectId
    const validSubjectId = (subjectId && mongoose.Types.ObjectId.isValid(subjectId)) ? subjectId : null;

    console.log(`[StudyMaterialRoutes] Processing PDF upload: "${fileName}" (${req.file.size} bytes) for userId: ${userId}`);

    // Parse PDF & extract topics
    const parsedData = await PdfProcessingService.parseAndAnalyzePdf(req.file.buffer, fileName);

    const studyMaterial = new StudyMaterial({
      user: userId,
      subject: validSubjectId,
      fileName: fileName,
      originalFileName: fileName,
      fileSize: req.file.size,
      pageCount: parsedData.pageCount || 1,
      extractedText: parsedData.extractedText || "",
      sections: parsedData.sections || [],
      detectedTopics: parsedData.detectedTopics || [],
      processingStatus: "Ready"
    });

    await studyMaterial.save();

    console.log(`[StudyMaterialRoutes] Successfully created StudyMaterial _id: ${studyMaterial._id} for user: ${userId}`);

    res.status(201).json({
      success: true,
      message: `Study material "${fileName}" processed successfully! Detected ${studyMaterial.detectedTopics.length} topics across ${studyMaterial.pageCount} pages.`,
      studyMaterial: {
        _id: studyMaterial._id,
        fileName: studyMaterial.fileName,
        fileSize: studyMaterial.fileSize,
        pageCount: studyMaterial.pageCount,
        subject: studyMaterial.subject,
        detectedTopics: studyMaterial.detectedTopics,
        createdAt: studyMaterial.createdAt
      }
    });
  } catch (err) {
    console.error("[StudyMaterialRoutes] Upload error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to process uploaded PDF study material: " + (err.message || "Internal server error")
    });
  }
});

/**
 * GET /api/study-materials
 * List user's uploaded study materials
 */
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.userId || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized user." });
    }

    const query = { user: userId };
    if (req.query.subjectId && mongoose.Types.ObjectId.isValid(req.query.subjectId)) {
      query.subject = req.query.subjectId;
    }

    const materials = await StudyMaterial.find(query)
      .select("-extractedText -sections") // Exclude heavy text payload in list query
      .populate("subject", "name color icon")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      materials
    });
  } catch (err) {
    console.error("[StudyMaterialRoutes] Fetch list error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch study materials." });
  }
});

/**
 * GET /api/study-materials/:id
 * Get detail view of specific study material including detected topics
 */
router.get("/:id", auth, async (req, res) => {
  try {
    const userId = req.userId || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized user." });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: "Invalid study material ID format." });
    }

    const material = await StudyMaterial.findOne({ _id: req.params.id, user: userId })
      .populate("subject", "name color icon");

    if (!material) {
      return res.status(404).json({ success: false, error: "Study material not found." });
    }

    res.json({
      success: true,
      material
    });
  } catch (err) {
    console.error("[StudyMaterialRoutes] Fetch detail error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch study material." });
  }
});

/**
 * DELETE /api/study-materials/:id
 * Delete uploaded study material
 */
router.delete("/:id", auth, async (req, res) => {
  try {
    const userId = req.userId || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized user." });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: "Invalid study material ID format." });
    }

    const result = await StudyMaterial.findOneAndDelete({ _id: req.params.id, user: userId });
    if (!result) {
      return res.status(404).json({ success: false, error: "Study material not found." });
    }

    res.json({
      success: true,
      message: "Study material deleted successfully."
    });
  } catch (err) {
    console.error("[StudyMaterialRoutes] Delete error:", err);
    res.status(500).json({ success: false, error: "Failed to delete study material." });
  }
});

module.exports = router;
