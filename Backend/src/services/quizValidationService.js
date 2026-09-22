/**
 * Dedicated Quiz Question Validation Service
 * Strict source grounding, option homogeneity, single-correct-answer verification,
 * grammar check, duplicate checking, and AI second-pass validation.
 */

const DeduplicationService = require("./deduplicationService");

class QuizValidationService {
  /**
   * 1. Validate Basic Question Schema/Structure
   */
  static validateQuestionStructure(q) {
    if (!q || typeof q !== "object") return false;

    const qText = String(q.questionText || "").trim();
    if (qText.length < 10) return false;

    if (!Array.isArray(q.options) || q.options.length !== 4) return false;

    const cleanOpts = q.options.map((o) => String(o || "").trim());
    if (cleanOpts.some((o) => o.length === 0)) return false;

    const correctIdx = Number(q.correctAnswer);
    if (!Number.isInteger(correctIdx) || correctIdx < 0 || correctIdx > 3) return false;

    const explanation = String(q.explanation || "").trim();
    if (explanation.length < 8) return false;

    return true;
  }

  /**
   * 2. Validate Question Grammar, Phrasing, & Naturalness
   */
  static validateQuestionGrammar(q) {
    const qText = String(q.questionText || "").trim();

    // Must start with uppercase letter or number and end with ?
    if (!/^[A-Z0-9"']/.test(qText)) return false;
    if (!qText.endsWith("?")) return false;

    // Reject awkward AI prompt templates, meta-phrases referencing document/page/PDF, or broken sentences
    const awkwardPatterns = [
      /is the concept of .* which provides/i,
      /what is the use of .* regarding the use of/i,
      /according to (the|page|pdf|document|text|file)/i,
      /based on (the|page|pdf|document|text|file)/i,
      /as (mentioned|stated|described|referenced) in (the|page|pdf|document|text|file)/i,
      /referenced on page/i,
      /on page \d+/i,
      /in page \d+/i,
      /of the document/i,
      /of the pdf/i,
      /in the statement:\s*"/i,
      /```/i,                           // no code blocks or raw markdown artifacts
      /\{[\s\S]*\}/,                    // no JSON strings inside questionText
      /undefined/i,
      /null/i
    ];

    for (const pattern of awkwardPatterns) {
      if (pattern.test(qText)) return false;
    }

    return true;
  }

  /**
   * 3. Validate Topic Relevance
   */
  /**
   * 3. Validate Topic Relevance
   */
  static validateTopicRelevance(q, targetTopic) {
    if (!targetTopic || targetTopic.toLowerCase() === "all topics" || targetTopic.toLowerCase() === "general") {
      return true;
    }

    const cleanTopic = targetTopic.toLowerCase().replace(/[^\w\s]/g, " ");
    const topicKeywords = cleanTopic
      .split(/\s+/)
      .filter((w) => w.length > 2 && !/^(and|the|for|with|from|into|about|this|that|is|are|an|a|or)$/i.test(w));

    if (topicKeywords.length === 0) return true;

    const qText = (q.questionText || "").toLowerCase();
    const explanation = (q.explanation || "").toLowerCase();
    const topicField = (q.topic || "").toLowerCase();
    const optText = (q.options || []).join(" ").toLowerCase();
    const excerptText = (q.sourceRef?.excerpt || "").toLowerCase();

    const fullCombinedText = `${qText} ${explanation} ${topicField} ${optText} ${excerptText}`;

    // Check if at least one topic keyword exists in the combined text
    return topicKeywords.some((kw) => fullCombinedText.includes(kw));
  }

  /**
   * 4. Validate Option Homogeneity, Uniqueness, & Quality
   */
  static validateOptions(q) {
    const cleanOpts = (q.options || []).map((o) => String(o || "").trim());
    if (cleanOpts.length !== 4) return false;

    // Check option uniqueness (case-insensitive & whitespace trimmed)
    const uniqueOpts = new Set(cleanOpts.map((o) => o.toLowerCase()));
    if (uniqueOpts.size !== 4) return false;

    // Reject filler options or silly distractors
    const invalidOptionPatterns = [
      /^(option\s*[a-d0-9]|incorrect option|dummy|placeholder|none of the above|all of the above)$/i,
      /^undefined$/i,
      /^null$/i
    ];

    if (cleanOpts.some((o) => invalidOptionPatterns.some((p) => p.test(o)))) return false;

    // Check option length category homogeneity: prevent 3 2-word options + 1 50-word paragraph
    const lengths = cleanOpts.map((o) => o.split(/\s+/).length);
    const maxLen = Math.max(...lengths);
    const minLen = Math.min(...lengths);

    // If max length is > 25 words while min length is <= 2 words, reject option length imbalance
    if (maxLen > 25 && minLen <= 2) return false;

    return true;
  }

  /**
   * 5. Validate Answer Mapping
   */
  static validateAnswerMapping(q) {
    const correctIdx = Number(q.correctAnswer);
    if (!Number.isInteger(correctIdx) || correctIdx < 0 || correctIdx > 3) return false;
    const correctOptionText = String(q.options[correctIdx] || "").trim();
    return correctOptionText.length > 0;
  }

  /**
   * 6. Validate Source Grounding & Single Correct Answer
   * Verifies that the question & correct answer terms exist in the provided PDF text chunks.
   */
  static validateSourceGrounding(q, relevantChunksText) {
    if (!relevantChunksText || relevantChunksText.length < 20) return true;

    const sourceLower = relevantChunksText.toLowerCase();
    const qTextLower = (q.questionText || "").toLowerCase();
    const correctOpt = String(q.options[q.correctAnswer] || "").toLowerCase().trim();

    // Key terms from question
    const qKeywords = qTextLower
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 4 && !/^(which|what|where|when|according|following|document|select|statement|option)$/i.test(w));

    if (qKeywords.length > 0) {
      const qGrounded = qKeywords.some((kw) => sourceLower.includes(kw));
      if (!qGrounded) return false;
    }

    // Key terms from correct option
    const optKeywords = correctOpt
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !/^(the|and|for|with|from|into|that|this|these|those)$/i.test(w));

    if (optKeywords.length > 0) {
      const optGrounded = optKeywords.some((kw) => sourceLower.includes(kw));
      if (!optGrounded) return false;
    }

    return true;
  }

  /**
   * 7. Validate & Attach Source Reference from PDF Chunks
   */
  static validateSourceReference(q, relevantChunksText, defaultFileName = "Document.pdf") {
    if (!relevantChunksText || relevantChunksText.length < 20) {
      return {
        fileName: defaultFileName,
        pageNumber: 1,
        excerpt: (q.explanation || "").slice(0, 150)
      };
    }

    const pageRegex = /\[Page\s+(\d+)\]/gi;
    const pageBlocks = [];
    let match;
    let lastIndex = 0;
    let lastPageNum = 1;

    while ((match = pageRegex.exec(relevantChunksText)) !== null) {
      if (pageBlocks.length > 0) {
        pageBlocks[pageBlocks.length - 1].text = relevantChunksText.slice(lastIndex, match.index);
      }
      lastPageNum = parseInt(match[1], 10) || 1;
      lastIndex = match.index + match[0].length;
      pageBlocks.push({ pageNumber: lastPageNum, text: "" });
    }
    if (pageBlocks.length > 0) {
      pageBlocks[pageBlocks.length - 1].text = relevantChunksText.slice(lastIndex);
    } else {
      pageBlocks.push({ pageNumber: 1, text: relevantChunksText });
    }

    const cleanExcerpt = (q.sourceRef?.excerpt || q.explanation || "").trim().toLowerCase();
    const searchTerms = cleanExcerpt.length > 10
      ? [cleanExcerpt]
      : (q.questionText || "").toLowerCase().split(/\s+/).filter((w) => w.length > 4);

    for (const block of pageBlocks) {
      const blockLower = block.text.toLowerCase();
      for (const term of searchTerms) {
        if (blockLower.includes(term)) {
          const termIdx = blockLower.indexOf(term);
          const start = Math.max(0, termIdx - 40);
          const end = Math.min(block.text.length, termIdx + term.length + 140);
          const snippet = block.text.slice(start, end).replace(/\s+/g, " ").trim();

          return {
            fileName: q.sourceRef?.fileName || defaultFileName,
            pageNumber: block.pageNumber,
            excerpt: q.sourceRef?.excerpt && q.sourceRef.excerpt.length > 15 ? q.sourceRef.excerpt : `...${snippet}...`
          };
        }
      }
    }

    return {
      fileName: q.sourceRef?.fileName || defaultFileName,
      pageNumber: pageBlocks[0]?.pageNumber || 1,
      excerpt: q.sourceRef?.excerpt && q.sourceRef.excerpt.length > 15 ? q.sourceRef.excerpt : relevantChunksText.slice(0, 150).replace(/\s+/g, " ").trim() + "..."
    };
  }

  /**
   * 8. Validate Explanation
   */
  static validateExplanation(q, relevantChunksText) {
    const explanation = String(q.explanation || "").trim();
    if (explanation.length < 8) return false;
    return true;
  }

  /**
   * 9. Duplicate & Near-Duplicate Check
   */
  static validateDuplicate(q, previousQuestions = [], currentBatch = []) {
    const qText = String(q.questionText || "").trim();
    if (DeduplicationService.isDuplicateQuestion(qText, previousQuestions, 0.75)) return false;
    if (DeduplicationService.isDuplicateQuestion(qText, currentBatch.map((b) => b.questionText), 0.75)) return false;
    return true;
  }

  /**
   * 10. AI Second-Pass Verification (Optional Gemini verification pass)
   */
  static async verifyWithAiPass(q, sourceExcerpt, apiKey) {
    if (!apiKey || !sourceExcerpt || sourceExcerpt.length < 20) return true;

    try {
      const correctOptionText = q.options[q.correctAnswer];
      const promptText = `You are a strict academic QA reviewer.
Review the following multiple-choice question against the provided PDF source excerpt:

PDF Source Excerpt:
"""
${sourceExcerpt}
"""

Proposed Question: "${q.questionText}"
Option A: "${q.options[0]}"
Option B: "${q.options[1]}"
Option C: "${q.options[2]}"
Option D: "${q.options[3]}"
Proposed Correct Answer: Option ${String.fromCharCode(65 + q.correctAnswer)} ("${correctOptionText}")
Proposed Explanation: "${q.explanation}"

VERIFICATION QUESTIONS:
1. Is the question directly answerable from the PDF source excerpt?
2. Is Option ${String.fromCharCode(65 + q.correctAnswer)} supported by the excerpt as the correct answer?
3. Is EXACTLY ONE option correct (and the other three options incorrect)?
4. Is the question clear, natural, and grammatically correct?

Respond ONLY with a JSON object:
{ "approved": true, "reason": "Reason..." } or { "approved": false, "reason": "Reason..." }`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return parsed.approved === true;
        }
      }
    } catch (err) {
      console.warn("[QuizValidationService] AI verification pass skipped due to error:", err.message);
    }

    return true;
  }

  /**
   * Complete Multi-Step Pipeline: Run all checks on a candidate question
   */
  static async validateCandidateQuestion(q, {
    relevantChunksText = "",
    targetTopic = "General",
    difficulty = "Medium",
    fileName = "Document.pdf",
    previousQuestions = [],
    currentBatch = [],
    apiKey = null
  }) {
    if (!this.validateQuestionStructure(q)) return null;
    if (!this.validateQuestionGrammar(q)) return null;
    if (!this.validateTopicRelevance(q, targetTopic)) return null;
    if (!this.validateOptions(q)) return null;
    if (!this.validateAnswerMapping(q)) return null;
    if (!this.validateSourceGrounding(q, relevantChunksText)) return null;
    if (!this.validateExplanation(q, relevantChunksText)) return null;
    if (!this.validateDuplicate(q, previousQuestions, currentBatch)) return null;

    const validatedSourceRef = this.validateSourceReference(q, relevantChunksText, fileName);

    // AI Second-Pass Verification if key is active
    if (apiKey) {
      const aiApproved = await this.verifyWithAiPass(q, validatedSourceRef.excerpt, apiKey);
      if (!aiApproved) {
        console.warn(`[QuizValidationService] Question rejected by AI verification pass: "${q.questionText}"`);
        return null;
      }
    }

    return {
      questionText: String(q.questionText).trim(),
      options: q.options.map((o) => String(o).trim()),
      correctAnswer: Number(q.correctAnswer),
      explanation: String(q.explanation).trim(),
      topic: String(q.topic || targetTopic || "General").trim(),
      sourceRef: validatedSourceRef
    };
  }
}

module.exports = QuizValidationService;
