/**
 * Deduplication & Normalization Service
 * Provides case-insensitive string normalization, similarity comparison,
 * and duplicate filtering for AI Quiz questions and Flashcards.
 */

class DeduplicationService {
  /**
   * Normalize text by trimming whitespace, converting to lowercase,
   * and stripping non-alphanumeric characters.
   */
  static normalizeText(text = "") {
    if (!text || typeof text !== "string") return "";
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ");
  }

  /**
   * Extract words token set for Jaccard similarity comparison
   */
  static getTokenSet(text = "") {
    const normalized = this.normalizeText(text);
    return new Set(normalized.split(" ").filter((w) => w.length > 2));
  }

  /**
   * Compute token Jaccard similarity index between two strings (0.0 to 1.0)
   */
  static getSimilarityRatio(str1 = "", str2 = "") {
    const norm1 = this.normalizeText(str1);
    const norm2 = this.normalizeText(str2);

    if (norm1 === norm2) return 1.0;
    if (!norm1 || !norm2) return 0.0;

    const set1 = this.getTokenSet(norm1);
    const set2 = this.getTokenSet(norm2);

    if (set1.size === 0 || set2.size === 0) return 0.0;

    let intersectionSize = 0;
    set1.forEach((token) => {
      if (set2.has(token)) intersectionSize++;
    });

    const unionSize = new Set([...set1, ...set2]).size;
    return unionSize > 0 ? intersectionSize / unionSize : 0.0;
  }

  /**
   * Check if a question text is a duplicate or near-duplicate relative to a set/list of existing questions
   */
  static isDuplicateQuestion(newQuestionText = "", existingTexts = [], threshold = 0.82) {
    const normNew = this.normalizeText(newQuestionText);
    if (!normNew) return true;

    for (const existing of existingTexts) {
      const normExisting = this.normalizeText(existing);
      if (!normExisting) continue;

      // Exact normalized match
      if (normNew === normExisting) return true;

      // High similarity match (near-duplicate)
      const ratio = this.getSimilarityRatio(normNew, normExisting);
      if (ratio >= threshold) {
        return true;
      }
    }

    return false;
  }

  /**
   * Deduplicate an array of generated questions against existing exclusion list and within the array
   */
  static deduplicateQuestions(generatedQuestions = [], existingExclusionList = []) {
    const uniqueQuestions = [];
    const accumulatedTexts = [...existingExclusionList];

    for (const q of generatedQuestions) {
      if (!q || !q.questionText || typeof q.questionText !== "string") continue;

      const qText = q.questionText.trim();
      if (!qText) continue;

      if (!this.isDuplicateQuestion(qText, accumulatedTexts)) {
        uniqueQuestions.push(q);
        accumulatedTexts.push(qText);
      }
    }

    return uniqueQuestions;
  }

  /**
   * Deduplicate an array of generated flashcards against existing exclusion list and within the array
   */
  static deduplicateFlashcards(generatedCards = [], existingExclusionFronts = []) {
    const uniqueCards = [];
    const accumulatedFronts = [...existingExclusionFronts];

    for (const card of generatedCards) {
      if (!card || !card.front || typeof card.front !== "string") continue;

      const cardFront = card.front.trim();
      if (!cardFront) continue;

      if (!this.isDuplicateQuestion(cardFront, accumulatedFronts)) {
        uniqueCards.push(card);
        accumulatedFronts.push(cardFront);
      }
    }

    return uniqueCards;
  }
}

module.exports = DeduplicationService;
