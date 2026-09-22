const { PDFParse } = require("pdf-parse");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

class PdfProcessingService {
  /**
   * Parse PDF buffer using pdf-parse v2.4.5 API, extracting page-by-page text,
   * total page count, cleaned full text, sections, and detected topics.
   */
  static async parseAndAnalyzePdf(buffer, fileName = "Document.pdf") {
    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new Error("Invalid or empty PDF file buffer provided.");
    }

    const parser = new PDFParse({ data: buffer });
    let parseResult;

    try {
      parseResult = await parser.getText();
    } catch (parseError) {
      console.error("[PdfProcessingService] PDFParse failed:", parseError.message);
      throw new Error("Failed to read PDF file. The document may be corrupted, password-protected, or unsupported.");
    } finally {
      if (typeof parser.destroy === "function") {
        try {
          await parser.destroy();
        } catch (destroyErr) {
          // ignore cleanup errors
        }
      }
    }

    if (!parseResult || !Array.isArray(parseResult.pages)) {
      throw new Error("Failed to extract pages from PDF document.");
    }

    const pageDataList = parseResult.pages.map((p, index) => {
      const pageNum = p.num || index + 1;
      const rawText = String(p.text || "");
      const cleanedPageText = rawText.replace(/[^\S\r\n]+/g, " ").trim();

      return {
        pageNumber: pageNum,
        content: cleanedPageText
      };
    });

    const pageCount = parseResult.total || pageDataList.length || 1;
    const fullText = pageDataList.map((p) => `[Page ${p.pageNumber}]\n${p.content}`).join("\n\n");

    // Scanned / Image-based PDF Check: Ensure there is readable text
    const alphanumericCharCount = fullText.replace(/[^a-zA-Z0-9]/g, "").length;
    if (alphanumericCharCount < 20) {
      throw new Error("This PDF does not contain readable text. Please upload a text-based PDF document.");
    }

    // Build section structure from pages
    const sections = pageDataList.map((p) => ({
      title: `Page ${p.pageNumber}`,
      pageNumber: p.pageNumber,
      content: p.content
    }));

    // Detect topics using Gemini or heuristic fallback
    let detectedTopics = [];
    try {
      detectedTopics = await this.detectTopicsWithAI(fullText, pageDataList);
    } catch (err) {
      console.warn("AI topic detection fallback trigger:", err.message);
      detectedTopics = this.detectTopicsFallback(pageDataList);
    }

    if (!detectedTopics || detectedTopics.length === 0) {
      detectedTopics = [{ name: "General Concepts", pageNumber: 1, summary: "Overview of key material in this document." }];
    }

    return {
      fileName,
      pageCount,
      extractedText: fullText,
      pageDataList,
      sections,
      detectedTopics
    };
  }

  /**
   * Use Gemini AI to detect main study topics from text
   */
  static async detectTopicsWithAI(fullText, pageDataList) {
    if (!genAI || !process.env.GEMINI_API_KEY) {
      return this.detectTopicsFallback(pageDataList);
    }

    const sampleText = fullText.slice(0, 12000);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are an educational AI assistant analyzing study material text.
Identify 3 to 10 distinct, specific academic topics or modules present in this text.

Study Material Sample:
"""
${sampleText}
"""

Return ONLY a raw JSON array of objects with the following schema:
[
  {
    "name": "Topic Name (Concise, e.g., 'Inheritance & Polymorphism')",
    "pageNumber": 1,
    "summary": "Brief 1-sentence summary of this topic from the text."
  }
]
Do not output markdown code blocks (\`\`\`json), explanations, or preamble. Return ONLY valid JSON array.`;

    const result = await model.generateContent(prompt);
    const textResponse = result.response.text();
    const cleanJson = textResponse.replace(/```json/gi, "").replace(/```/gi, "").trim();

    const topics = JSON.parse(cleanJson);
    if (Array.isArray(topics) && topics.length > 0) {
      return topics.map((t) => ({
        name: String(t.name || "Topic").trim(),
        pageNumber: Number(t.pageNumber) || 1,
        summary: String(t.summary || "").trim()
      }));
    }

    return this.detectTopicsFallback(pageDataList);
  }

  /**
   * Heuristic fallback to detect topics if AI fails or key is missing
   */
  static detectTopicsFallback(pageDataList) {
    const topicsMap = new Map();

    pageDataList.forEach((page) => {
      const lines = page.content.split("\n").map((l) => l.trim()).filter((l) => l.length > 3);
      lines.forEach((line) => {
        if (/^(chapter|section|module|unit|topic|\d+\.|\d+\:\s)/i.test(line) && line.length < 60) {
          const cleanName = line.replace(/^(chapter|section|module|unit|topic|\d+\.|\d+\:\s)\s*/i, "").trim();
          if (cleanName && !topicsMap.has(cleanName.toLowerCase())) {
            topicsMap.set(cleanName.toLowerCase(), {
              name: cleanName,
              pageNumber: page.pageNumber,
              summary: `Topics covered around page ${page.pageNumber}`
            });
          }
        }
      });
    });

    const topicsList = Array.from(topicsMap.values());
    if (topicsList.length > 0) {
      return topicsList.slice(0, 8);
    }

    return [
      { name: "Core Concepts", pageNumber: 1, summary: "Fundamental concepts from the study material." },
      { name: "Advanced Application", pageNumber: Math.ceil(pageDataList.length / 2) || 1, summary: "Detailed methods and applications." }
    ];
  }
}

module.exports = PdfProcessingService;
