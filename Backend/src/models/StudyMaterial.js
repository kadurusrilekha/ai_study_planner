const mongoose = require("mongoose");

const sectionSchema = new mongoose.Schema({
  title: String,
  pageNumber: Number,
  content: String
});

const detectedTopicSchema = new mongoose.Schema({
  name: { type: String, required: true },
  pageNumber: { type: Number, default: 1 },
  summary: String
});

const studyMaterialSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject"
  },
  fileName: { type: String, required: true },
  originalFileName: String,
  fileSize: Number, // in bytes
  pageCount: { type: Number, default: 1 },
  extractedText: { type: String, required: true },
  sections: [sectionSchema],
  detectedTopics: [detectedTopicSchema],
  processingStatus: {
    type: String,
    enum: ["Processing", "Ready", "Failed"],
    default: "Ready"
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

studyMaterialSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("StudyMaterial", studyMaterialSchema);
