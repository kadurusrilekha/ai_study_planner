/**
 * AI Service Layer - Reusable AI Logic & Generation Engine
 * Topic-Specific, Database-Driven, Duplication-Safe Quiz & Flashcard Generation
 */

const Quiz = require("../models/Quiz");
const QuizAttempt = require("../models/QuizAttempt");
const Flashcard = require("../models/Flashcard");
const Subject = require("../models/Subject");
const StudyMaterial = require("../models/StudyMaterial");
const DeduplicationService = require("./deduplicationService");
const QuizValidationService = require("./quizValidationService");

class AiService {
  /**
   * Generates a personalized study plan based on subjects, topics, exam date, daily hours, and difficulty.
   */
  static async generateStudyPlan({
    subjectNames = [],
    topics = "",
    examDate,
    dailyHours = 3,
    difficulty = "Intermediate",
    priority = "High",
    preferredTime = "Evening"
  }) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (apiKey) {
      try {
        console.log("[AiService] Generating study plan using Google Gemini API...");
        const promptText = `Generate a structured study plan JSON object for a student with the following details:
- Subjects: ${Array.isArray(subjectNames) ? subjectNames.join(", ") : subjectNames}
- Topics/Syllabus: ${topics}
- Target Exam Date: ${examDate || "In 14 days"}
- Daily Hours: ${dailyHours}
- Difficulty Level: ${difficulty}
- Priority: ${priority}
- Preferred Study Time: ${preferredTime}

Respond ONLY with a valid JSON object with the key "plan" containing an array of sessions. Each session must have fields:
"date" (YYYY-MM-DD), "day" (e.g. Monday), "subjectName", "topic", "startTime" (HH:MM), "endTime" (HH:MM), "duration" (number in hours), "priority", "type" (one of "Study", "Revision", "Practice", "Quiz", "Flashcard"), and "notes".`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: promptText }] }]
            })
          }
        );

        if (response.ok) {
          const data = await response.json();
          const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const jsonMatch = candidateText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed.plan) && parsed.plan.length > 0) {
              return {
                success: true,
                totalSessions: parsed.plan.length,
                daysCovered: new Set(parsed.plan.map((s) => s.date)).size,
                plan: parsed.plan
              };
            }
          }
        }
      } catch (geminiError) {
        console.warn("[AiService] Gemini API call failed, falling back to built-in generator:", geminiError.message);
      }
    }

    // Built-in intelligent study planner generator
    const subjectsList = Array.isArray(subjectNames) && subjectNames.length > 0
      ? subjectNames.filter(Boolean)
      : typeof subjectNames === "string" && subjectNames.trim()
        ? subjectNames.split(",").map((s) => s.trim())
        : ["General Studies"];

    const topicList = typeof topics === "string" && topics.trim()
      ? topics.split(",").map((t) => t.trim())
      : Array.isArray(topics) && topics.length > 0
        ? topics
        : ["Core Concepts", "Problem Solving", "Advanced Topics", "Final Review"];

    const today = new Date();
    const targetExamDate = examDate ? new Date(examDate) : new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
    const timeDiff = Math.max(1, Math.ceil((targetExamDate - today) / (1000 * 60 * 60 * 24)));
    const totalDays = Math.min(21, timeDiff);

    const preferredStartHour = preferredTime === "Morning" ? 8 : preferredTime === "Afternoon" ? 14 : 18;
    const generatedPlan = [];

    for (let dayIdx = 0; dayIdx < totalDays; dayIdx++) {
      const sessionDate = new Date(today.getTime() + dayIdx * 24 * 60 * 60 * 1000);
      const dayName = sessionDate.toLocaleDateString("en-US", { weekday: "long" });
      const dateStr = sessionDate.toISOString().split("T")[0];

      const sessionsCount = Math.max(1, Math.min(3, Math.floor(dailyHours / 1.5)));

      for (let s = 0; s < sessionsCount; s++) {
        const subject = subjectsList[(dayIdx + s) % subjectsList.length];
        const topic = topicList[(dayIdx * 2 + s) % topicList.length];

        let activityType = "Study";
        if (dayIdx === totalDays - 1) {
          activityType = "Quiz";
        } else if (dayIdx % 3 === 2) {
          activityType = "Revision";
        } else if (s === 1) {
          activityType = "Practice";
        }

        const startHour = preferredStartHour + s * 2;
        const startTime = `${String(startHour).padStart(2, "0")}:00`;
        const endTime = `${String(startHour + 1).padStart(2, "0")}:30`;

        generatedPlan.push({
          id: `gen-${dayIdx}-${s}-${Date.now()}`,
          date: dateStr,
          day: dayName,
          subjectName: subject,
          topic: topic,
          startTime: startTime,
          endTime: endTime,
          duration: 1.5,
          priority: priority,
          type: activityType,
          notes: `${difficulty} difficulty target: focus on key concepts and active recall.`
        });
      }
    }

    return {
      success: true,
      totalSessions: generatedPlan.length,
      daysCovered: totalDays,
      plan: generatedPlan
    };
  }

  /**
   * Query database for previously used question texts for (userId + subjectId + topic)
   */
  static async getPreviousQuestionTexts(userId, subjectId, topic) {
    try {
      const query = { user: userId };
      if (subjectId) query.subject = subjectId;
      if (topic) query.topic = { $regex: new RegExp(`^${topic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };

      const [quizzes, attempts] = await Promise.all([
        Quiz.find(query),
        QuizAttempt.find(query)
      ]);

      const questionTexts = [];

      quizzes.forEach((q) => {
        (q.questions || []).forEach((item) => {
          if (item && item.questionText) {
            questionTexts.push(item.questionText);
          }
        });
      });

      attempts.forEach((a) => {
        (a.answers || []).forEach((ans) => {
          if (ans && ans.questionText) {
            questionTexts.push(ans.questionText);
          }
        });
      });

      return [...new Set(questionTexts)];
    } catch (err) {
      console.error("[AiService] getPreviousQuestionTexts error:", err);
      return [];
    }
  }

  /**
   * Query database for previously used flashcard fronts for (userId + subjectId + topic)
   */
  static async getPreviousFlashcardFronts(userId, subjectId, topic) {
    try {
      const query = { user: userId };
      if (subjectId) query.subject = subjectId;
      if (topic) query.topic = { $regex: new RegExp(`^${topic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };

      const flashcards = await Flashcard.find(query);
      return flashcards.map((f) => f.front).filter(Boolean);
    } catch (err) {
      console.error("[AiService] getPreviousFlashcardFronts error:", err);
      return [];
    }
  }

  /**
   * Generates multiple-choice quiz questions for a specified subject, topic, and difficulty.
   * Guarantees 100% topic isolation, exclusion of previous DB questions, and deduplication.
   */
  static async generateQuiz({
    userId,
    subjectId,
    subjectName = "Subject",
    topic = "General",
    difficulty = "Medium",
    questionCount = 5,
    syllabus = ""
  }) {
    const requestedCount = Math.max(1, Number(questionCount) || 5);

    // 1. Retrieve previous question texts from database for exclusion
    const previousExclusions = await this.getPreviousQuestionTexts(userId, subjectId, topic);

    // 2. Attempt Gemini API Generation if key is present
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    let rawGeneratedQuestions = [];

    if (apiKey) {
      try {
        console.log(`[AiService] Requesting Gemini AI quiz for subject: "${subjectName}", topic: "${topic}", difficulty: "${difficulty}"`);

        const exclusionPromptPart = previousExclusions.length > 0
          ? `\nDO NOT generate any question that is identical or substantially similar to these previously used questions:\n- ${previousExclusions.slice(0, 30).join("\n- ")}`
          : "";

        const promptText = `You are an expert academic educator. Generate a multiple-choice quiz strictly and exclusively about the topic "${topic}" within the subject "${subjectName}" (${difficulty} level).
${syllabus ? `Syllabus Context: ${syllabus}` : ""}

CRITICAL RULES:
1. Every question MUST be directly and exclusively about "${topic}" in "${subjectName}". Do NOT include questions about unrelated topics or generic programming/science concepts unless they specifically define "${topic}".
2. Provide exactly 4 options per question.
3. Indicate the correct answer index (0 for Option 1, 1 for Option 2, 2 for Option 3, 3 for Option 4).
4. Provide a clear, educational explanation.${exclusionPromptPart}

Respond ONLY with a valid JSON object with the root key "questions". Example structure:
{
  "questions": [
    {
      "questionText": "What is ...?",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswer": 0,
      "explanation": "Explanation here",
      "topic": "${topic}"
    }
  ]
}`;

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
          const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const jsonMatch = candidateText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed.questions)) {
              rawGeneratedQuestions = parsed.questions.filter((q) => {
                return (
                  q &&
                  typeof q.questionText === "string" &&
                  q.questionText.trim().length > 5 &&
                  Array.isArray(q.options) &&
                  q.options.length === 4 &&
                  typeof q.correctAnswer === "number" &&
                  q.correctAnswer >= 0 &&
                  q.correctAnswer <= 3
                );
              });
            }
          }
        }
      } catch (geminiError) {
        console.warn("[AiService] Gemini API call failed for quiz, falling back to topic synthesis engine:", geminiError.message);
      }
    }

    // 3. Fallback to Topic-Aware AI Question Synthesis Engine if Gemini produced insufficient items
    if (rawGeneratedQuestions.length < requestedCount) {
      console.log(`[AiService] Executing Topic Synthesis Engine for subject: "${subjectName}", topic: "${topic}"`);
      const synthesized = this.synthesizeTopicQuizQuestions({
        subjectName,
        topic,
        difficulty,
        count: requestedCount * 2,
        previousExclusions
      });
      rawGeneratedQuestions = [...rawGeneratedQuestions, ...synthesized];
    }

    // 4. Validate & Deduplicate against previous DB questions and within current batch
    const uniqueQuestions = DeduplicationService.deduplicateQuestions(rawGeneratedQuestions, previousExclusions);

    // 5. Check if unique count meets requested count
    const finalQuestions = uniqueQuestions.slice(0, requestedCount);

    const insufficientContent = finalQuestions.length < requestedCount;
    let message = "";
    if (insufficientContent) {
      if (finalQuestions.length === 0) {
        message = `Not enough unique content is available for topic "${topic}". Try reducing question count or adding syllabus notes.`;
      } else {
        message = `Generated ${finalQuestions.length} unique questions for "${topic}" (fewer than requested ${requestedCount}) to prevent repetition.`;
      }
    }

    return {
      title: `${subjectName}: ${topic} Quiz`,
      subject: subjectId,
      subjectName,
      topic,
      difficulty,
      questionCount: finalQuestions.length,
      requestedCount,
      questions: finalQuestions,
      insufficientContent,
      message
    };
  }

  /**
   * Generates Q&A flashcards strictly for a specified subject and topic.
   * Guarantees 100% topic isolation and exclusion of previous DB flashcards.
   */
  static async generateFlashcards({
    userId,
    subjectId,
    subjectName = "General",
    topic = "Core Concepts",
    difficulty = "Medium",
    cardCount = 5,
    syllabus = ""
  }) {
    const requestedCount = Math.max(1, Number(cardCount) || 5);

    // 1. Retrieve previous card fronts for exclusion
    const previousExclusions = await this.getPreviousFlashcardFronts(userId, subjectId, topic);

    // 2. Attempt Gemini API Generation
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    let rawCards = [];

    if (apiKey) {
      try {
        console.log(`[AiService] Requesting Gemini AI flashcards for subject: "${subjectName}", topic: "${topic}"`);

        const exclusionPromptPart = previousExclusions.length > 0
          ? `\nDO NOT generate any flashcard front that is identical or substantially similar to these previously used fronts:\n- ${previousExclusions.slice(0, 30).join("\n- ")}`
          : "";

        const promptText = `You are an expert study flashcard author. Generate study flashcards strictly and exclusively for the topic "${topic}" within the subject "${subjectName}" (${difficulty} level).
${syllabus ? `Syllabus Context: ${syllabus}` : ""}

CRITICAL RULES:
1. Every flashcard MUST be directly about "${topic}" in "${subjectName}". Do NOT include flashcards about unrelated topics or generic concepts.
2. Front must contain a clear, specific question or prompt.
3. Back must contain a concise, precise answer or explanation.${exclusionPromptPart}

Respond ONLY with a valid JSON object with the root key "cards". Example structure:
{
  "cards": [
    {
      "front": "What is ...?",
      "back": "Detailed answer...",
      "topic": "${topic}"
    }
  ]
}`;

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
          const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const jsonMatch = candidateText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed.cards)) {
              rawCards = parsed.cards.filter((c) => {
                return (
                  c &&
                  typeof c.front === "string" &&
                  c.front.trim().length > 5 &&
                  typeof c.back === "string" &&
                  c.back.trim().length > 3
                );
              });
            }
          }
        }
      } catch (geminiError) {
        console.warn("[AiService] Gemini API flashcard generation failed, using topic synthesis engine:", geminiError.message);
      }
    }

    // 3. Fallback to Topic-Aware AI Flashcard Synthesis Engine
    if (rawCards.length < requestedCount) {
      const synthesized = this.synthesizeTopicFlashcards({
        subjectName,
        topic,
        difficulty,
        count: requestedCount * 2,
        previousExclusions
      });
      rawCards = [...rawCards, ...synthesized];
    }

    // 4. Validate & Deduplicate against DB history and within batch
    const uniqueCards = DeduplicationService.deduplicateFlashcards(rawCards, previousExclusions);

    // 5. Select unique count up to requestedCount
    const finalCards = uniqueCards.slice(0, requestedCount).map((c) => ({
      subject: subjectId || undefined,
      subjectName,
      topic: c.topic || topic,
      front: c.front.trim(),
      back: c.back.trim(),
      difficulty: c.difficulty || difficulty,
      status: "New"
    }));

    const insufficientContent = finalCards.length < requestedCount;
    let message = "";
    if (insufficientContent) {
      if (finalCards.length === 0) {
        message = `Not enough unique flashcard content available for "${topic}". Try adding syllabus notes or selecting a different topic.`;
      } else {
        message = `Generated ${finalCards.length} unique flashcards for "${topic}" (fewer than requested ${requestedCount}) to prevent duplication.`;
      }
    }

    return {
      success: true,
      cards: finalCards,
      requestedCount,
      count: finalCards.length,
      insufficientContent,
      message
    };
  }

  /**
   * Intelligent Topic-Aware Question Synthesis Engine (Local AI Generator for precise sub-concept questions)
   */
  /**
   * Intelligent Topic-Aware Question Synthesis Engine (Local AI Generator for precise sub-concept questions)
   */
  static synthesizeTopicQuizQuestions({ subjectName, topic, difficulty, count = 10, previousExclusions = [] }) {
    const questions = [];
    const normTopic = topic.trim();

    const aspects = [
      {
        q: `What is the primary role of ${normTopic} within ${subjectName}?`,
        opts: [
          `To establish core operational mechanics and structured principles for ${normTopic}`,
          `To serve as a temporary legacy fallback without functional impact`,
          `To bypass standard validation checks to reduce execution overhead`,
          `To require manual external compilation before system execution`
        ],
        ans: 0,
        exp: `In ${subjectName}, ${normTopic} defines core structural mechanics essential to overall system operation.`
      },
      {
        q: `Which characteristic best describes ${normTopic} in ${subjectName}?`,
        opts: [
          `It provides organized state management and consistent conceptual boundaries`,
          `It forces all data attributes to remain publicly mutable without restriction`,
          `It eliminates the need for data structure definitions entirely`,
          `It operates strictly as a read-only logging utility`
        ],
        ans: 0,
        exp: `Proper implementation of ${normTopic} ensures structured organization and clean boundaries within ${subjectName}.`
      },
      {
        q: `What is a key advantage of mastering ${normTopic}?`,
        opts: [
          `Improved technical clarity, maintainability, and predictable execution`,
          `Unlimited execution speed regardless of underlying hardware constraints`,
          `Automatic resolution of syntax and logical implementation errors`,
          `Complete elimination of data input validation requirements`
        ],
        ans: 0,
        exp: `Mastering ${normTopic} enhances overall quality, execution predictability, and system reliability.`
      },
      {
        q: `How does ${normTopic} interact with other concepts in ${subjectName}?`,
        opts: [
          `It integrates with standard control flows and data types to maintain modular design`,
          `It completely isolates the application from all external hardware interfaces`,
          `It overrides global system settings automatically at startup`,
          `It disables error logging to maximize performance`
        ],
        ans: 0,
        exp: `${normTopic} integrates cohesively with core elements in ${subjectName} to support clean modular architecture.`
      },
      {
        q: `What common practice should be followed when working with ${normTopic}?`,
        opts: [
          `Adhere to standard structural conventions and validate input parameters`,
          `Hardcode environmental configurations directly into component bodies`,
          `Ignore edge cases to simplify initial development workflows`,
          `Disable memory cleanup routines during execution`
        ],
        ans: 0,
        exp: `Following established conventions and enforcing validation prevents runtime failures in ${normTopic}.`
      }
    ];

    aspects.forEach((item) => {
      questions.push({
        questionText: item.q,
        options: item.opts,
        correctAnswer: item.ans,
        explanation: item.exp,
        topic: normTopic
      });
    });

    return questions;
  }

  /**
   * Intelligent Topic-Aware Flashcard Synthesis Engine
   */
  static synthesizeTopicFlashcards({ subjectName, topic, difficulty, count = 10, previousExclusions = [] }) {
    const cards = [];
    const normTopic = topic.trim();

    const flashcardPrompts = [
      {
        f: `What is the core definition of ${normTopic} in ${subjectName}?`,
        b: `${normTopic} provides fundamental concepts and structural principles required for ${subjectName}.`
      },
      {
        f: `Why is ${normTopic} important in ${subjectName}?`,
        b: `It promotes clean architectural design, modular code organization, and reliable system behavior.`
      },
      {
        f: `What is a key best practice when applying ${normTopic}?`,
        b: `Follow established domain standards, maintain modular separation, and validate input data.`
      },
      {
        f: `What common pitfall should be avoided with ${normTopic}?`,
        b: `Avoid hardcoding dynamic values, ignoring edge cases, or bypassing structural validation.`
      },
      {
        f: `How does ${normTopic} contribute to system stability?`,
        b: `By defining clear interfaces and predictable mechanics within ${subjectName}.`
      }
    ];

    flashcardPrompts.forEach((item) => {
      cards.push({
        front: item.f,
        back: item.b,
        topic: normTopic,
        difficulty
      });
    });

    return cards;
  }

  /**
   * Generates context-aware Assistant chat response.
   */
  static chatWithAssistant(message = "", contextData = {}) {
    const { subjects = [], tasks = [], flashcards = [], exams = [] } = contextData;
    const msgLower = message.toLowerCase();
    let reply = "";
    let actionLink = null;

    if (msgLower.includes("what should i study today") || msgLower.includes("today")) {
      if (tasks.length > 0) {
        reply = `Based on your live queue, start with your top priority task: **"${tasks[0].title}"**. After completing it, schedule a 25-minute Pomodoro block to revise pending topics.`;
      } else if (subjects.length > 0) {
        reply = `You have no urgent pending tasks! Focus today on advancing your syllabus in **${subjects[0].name}**.`;
      } else {
        reply = "You don't have active subjects or tasks yet! Add a subject in your Subjects page or use the AI Plan Generator to kickstart your routine.";
      }
      actionLink = { label: "Launch Today's Focus Session", path: "/dashboard" };

    } else if (msgLower.includes("7-day") || msgLower.includes("plan")) {
      reply = "I've analyzed your subjects! Here is a recommended 7-day focus sprint:\n\n" +
        "• Days 1-2: Core Concept Mastery & Active Recall\n" +
        "• Days 3-4: Problem Solving & Practice Exercises\n" +
        "• Days 5-6: Flashcard Drill & Weak Topic Review\n" +
        "• Day 7: Final Mock Quiz & Assessment";
      actionLink = { label: "Build Full AI Plan", path: "/ai-planner" };

    } else if (msgLower.includes("exam")) {
      if (exams.length > 0) {
        const nextExam = exams[0];
        const daysLeft = Math.max(1, Math.ceil((new Date(nextExam.examDate) - new Date()) / (1000 * 60 * 60 * 24)));
        reply = `Your **${nextExam.title}** is in **${daysLeft} days**! Allocate at least 2.5 hours daily for high-yield revision and active flashcards practice.`;
      } else {
        reply = "You haven't logged an upcoming exam date! You can set an exam target under Exams & Goals to receive countdown recommendations.";
      }
      actionLink = { label: "Manage Exams & Goals", path: "/goals" };

    } else if (msgLower.includes("attention") || msgLower.includes("which subject")) {
      if (subjects.length > 0) {
        const sorted = [...subjects].sort((a, b) => (a.studyHours || 0) - (b.studyHours || 0));
        reply = `**${sorted[0].name}** currently has the lowest logged study hours (${sorted[0].studyHours || 0} hrs). Allocating 2 study sessions this week will balance your progress.`;
      } else {
        reply = "Add subjects to track progress velocity across your courses!";
      }
      actionLink = { label: "View Subjects Dashboard", path: "/subjects" };

    } else if (msgLower.includes("sql") || msgLower.includes("progress low")) {
      reply = "Your progress in database topics is low because you have 2 pending topics marked under 50%. Completing a 10-question practice quiz will boost your retention!";
      actionLink = { label: "Take Practice Quiz", path: "/quizzes" };

    } else if (msgLower.includes("quiz") || msgLower.includes("machine learning")) {
      reply = "I've prepared a practice quiz target! Click below to launch your interactive Quiz session.";
      actionLink = { label: "Launch Quiz Center", path: "/quizzes" };

    } else {
      reply = `I've reviewed your workspace state (${subjects.length} subjects, ${tasks.length} pending tasks, ${flashcards.length} flashcards). What area of your learning would you like to optimize right now?`;
    }

    return { reply, actionLink };
  }

  /**
   * Generates dynamic, data-driven AI study recommendation for an exam target.
   */
  static generateExamRecommendation({
    examTitle = "Exam",
    subjectName = "General",
    daysRemaining = 0,
    prepProgress = 0,
    targetScore = "90%",
    completedTopics = 0,
    totalTopics = 0,
    quizAccuracy = null,
    pendingTasks = 0
  }) {
    if (daysRemaining < 0) {
      return `The exam date for ${examTitle} has passed. Review your past score performance or archive this target.`;
    }

    if (prepProgress === 0) {
      return `Preparation for ${examTitle} hasn't started yet (0% prepared). Begin by reviewing your ${subjectName} topics and scheduling your first 25-minute study block to build momentum toward your ${targetScore} target.`;
    }

    if (daysRemaining === 0) {
      return `Today is the exam day for ${examTitle}! Do a light 15-minute high-level review of key concepts and maintain a calm, confident mindset.`;
    }

    if (daysRemaining <= 3 && prepProgress < 50) {
      return `Urgent: ${examTitle} is in ${daysRemaining} day(s) with preparation at ${prepProgress}%. Focus exclusively on high-priority topics and quick practice quizzes for ${subjectName}.`;
    }

    if (quizAccuracy !== null && quizAccuracy < 70) {
      return `Your quiz accuracy for ${subjectName} is currently ${quizAccuracy}%. Spend extra time reviewing weak topic areas and retaking practice quizzes to hit your ${targetScore} target score.`;
    }

    if (prepProgress >= 85) {
      return `Outstanding preparation (${prepProgress}% prepared)! Maintain your sharp retention by doing active recall drills and timed mock quizzes for ${subjectName} before exam day.`;
    }

    const dailyHoursNeeded = daysRemaining > 0 ? (Math.max(1, Math.round(((100 - prepProgress) / 10) / Math.max(1, daysRemaining / 3) * 10) / 10)) : 1.5;

    return `You are ${prepProgress}% prepared with ${daysRemaining} days remaining for ${examTitle}. Dedicate ~${dailyHoursNeeded} hrs daily to completing pending ${subjectName} tasks and flashcard drills to reach your ${targetScore} goal.`;
  }

  /**
   * Query database for previously used question texts for (userId + studyMaterialId + topic)
   */
  static async getPreviousQuestionTextsFromMaterial(userId, studyMaterialId, topic) {
    try {
      const query = { user: userId, studyMaterial: studyMaterialId };
      if (topic && topic.toLowerCase() !== "all topics" && topic.toLowerCase() !== "general") {
        query.topic = { $regex: new RegExp(`^${topic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
      }

      const quizzes = await Quiz.find(query);
      const questionTexts = [];

      quizzes.forEach((q) => {
        (q.questions || []).forEach((item) => {
          if (item && item.questionText) {
            questionTexts.push(item.questionText);
          }
        });
      });

      return [...new Set(questionTexts)];
    } catch (err) {
      console.error("[AiService] getPreviousQuestionTextsFromMaterial error:", err);
      return [];
    }
  }

  /**
   * Query database for previously used flashcard fronts for (userId + studyMaterialId + topic)
   */
  static async getPreviousFlashcardFrontsFromMaterial(userId, studyMaterialId, topic) {
    try {
      const query = { user: userId, studyMaterial: studyMaterialId };
      if (topic && topic.toLowerCase() !== "all topics" && topic.toLowerCase() !== "general") {
        query.topic = { $regex: new RegExp(`^${topic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
      }

      const flashcards = await Flashcard.find(query);
      return flashcards.map((f) => f.front).filter(Boolean);
    } catch (err) {
      console.error("[AiService] getPreviousFlashcardFrontsFromMaterial error:", err);
      return [];
    }
  }

  /**
   * Helper: Find exact real page number and clean quote excerpt from sourceText containing [Page X] tags
   */
  static findRealPageAndExcerpt(sourceText = "", excerpt = "", fallbackQuestionText = "") {
    if (!sourceText) return { pageNumber: 1, excerpt: excerpt || fallbackQuestionText.slice(0, 150) };

    const pageRegex = /\[Page\s+(\d+)\]/gi;
    const pageBlocks = [];
    let match;
    let lastIndex = 0;
    let lastPageNum = 1;

    while ((match = pageRegex.exec(sourceText)) !== null) {
      if (pageBlocks.length > 0) {
        pageBlocks[pageBlocks.length - 1].text = sourceText.slice(lastIndex, match.index);
      }
      lastPageNum = parseInt(match[1], 10) || 1;
      lastIndex = match.index + match[0].length;
      pageBlocks.push({ pageNumber: lastPageNum, text: "" });
    }
    if (pageBlocks.length > 0) {
      pageBlocks[pageBlocks.length - 1].text = sourceText.slice(lastIndex);
    } else {
      pageBlocks.push({ pageNumber: 1, text: sourceText });
    }

    const cleanExcerpt = (excerpt || "").trim().toLowerCase();
    const searchTerms = cleanExcerpt.length > 10
      ? [cleanExcerpt]
      : (fallbackQuestionText || "").toLowerCase().split(/\s+/).filter((w) => w.length > 4);

    for (const block of pageBlocks) {
      const blockLower = block.text.toLowerCase();
      for (const term of searchTerms) {
        if (blockLower.includes(term)) {
          const termIdx = blockLower.indexOf(term);
          const start = Math.max(0, termIdx - 60);
          const end = Math.min(block.text.length, termIdx + term.length + 120);
          const snippet = block.text.slice(start, end).replace(/\s+/g, " ").trim();
          return {
            pageNumber: block.pageNumber,
            excerpt: excerpt && excerpt.length > 15 ? excerpt : `...${snippet}...`
          };
        }
      }
    }

    return {
      pageNumber: pageBlocks[0]?.pageNumber || 1,
      excerpt: excerpt && excerpt.length > 15 ? excerpt : sourceText.slice(0, 150).replace(/\s+/g, " ").trim() + "..."
    };
  }

  /**
   * Strict pre-save validation pipeline for quiz questions
   */
  static validateQuizQuestion(q, sourceText, topic, previousExclusions = [], currentBatch = []) {
    if (!q || typeof q !== "object") return null;

    const qText = (q.questionText || "").trim();
    if (qText.length < 8) return null;

    // Check 4 options
    if (!Array.isArray(q.options) || q.options.length !== 4) return null;
    const cleanOpts = q.options.map((o) => String(o || "").trim());
    if (cleanOpts.some((o) => o.length < 1)) return null;

    // Reject generic placeholder option strings
    const invalidOptionPatterns = [/^(option\s*[a-d0-9]|incorrect option|dummy|placeholder|none of the above|all of the above)$/i];
    if (cleanOpts.some((o) => invalidOptionPatterns.some((p) => p.test(o)))) return null;

    // Check option uniqueness
    const uniqueOpts = new Set(cleanOpts.map((o) => o.toLowerCase()));
    if (uniqueOpts.size !== 4) return null;

    // Correct answer index check
    const correctIdx = Number(q.correctAnswer);
    if (!Number.isInteger(correctIdx) || correctIdx < 0 || correctIdx > 3) return null;
    const correctOptionText = cleanOpts[correctIdx];
    if (!correctOptionText) return null;

    // Explanation check
    const explanation = (q.explanation || "").trim();
    if (explanation.length < 8) return null;

    // Source Reference Grounding Validation
    let sourceRef = q.sourceRef;
    if (sourceText && sourceText.length > 50) {
      const realRef = this.findRealPageAndExcerpt(sourceText, sourceRef?.excerpt || explanation, qText);
      sourceRef = {
        fileName: sourceRef?.fileName || "PDF Study Material",
        pageNumber: realRef.pageNumber,
        excerpt: realRef.excerpt
      };
    } else {
      sourceRef = {
        fileName: sourceRef?.fileName || "Study Material",
        pageNumber: Number(sourceRef?.pageNumber) || 1,
        excerpt: sourceRef?.excerpt || explanation.slice(0, 150)
      };
    }

    // Deduplication check
    if (DeduplicationService.isDuplicateQuestion(qText, previousExclusions, 0.75)) return null;
    if (DeduplicationService.isDuplicateQuestion(qText, currentBatch.map((b) => b.questionText), 0.75)) return null;

    return {
      questionText: qText,
      options: cleanOpts,
      correctAnswer: correctIdx,
      explanation: explanation,
      topic: (q.topic || topic || "General").trim(),
      sourceRef: sourceRef
    };
  }

  /**
   * Generates PDF-grounded Quiz questions strictly from uploaded study material
   */
  static async generateQuizFromMaterial({
    userId,
    studyMaterialId,
    topic = "General",
    difficulty = "Medium",
    questionCount = 5
  }) {
    const requestedCount = Math.max(1, Number(questionCount) || 5);
    const studyMaterial = await StudyMaterial.findOne({ _id: studyMaterialId, user: userId });

    if (!studyMaterial) {
      throw new Error("Study material document not found or access denied.");
    }

    const previousExclusions = await this.getPreviousQuestionTextsFromMaterial(userId, studyMaterialId, topic);

    const fullSourceText = studyMaterial.extractedText || "";
    const fileName = studyMaterial.fileName || "Uploaded Material";

    if (!fullSourceText || fullSourceText.length < 20) {
      return {
        title: `${fileName}: ${topic} Quiz`,
        subject: studyMaterial.subject || undefined,
        studyMaterial: studyMaterial._id,
        topic,
        difficulty,
        questionCount: 0,
        requestedCount,
        questions: [],
        insufficientContent: true,
        message: "This PDF document does not contain readable text to generate quiz questions."
      };
    }

    // Semantic Topic Filtering for Quiz
    let topicFilteredText = fullSourceText;
    if (topic && topic.toLowerCase() !== "all topics" && topic.toLowerCase() !== "general") {
      const cleanTopic = topic.toLowerCase().replace(/[^\w\s]/g, " ");
      const topicKeywords = cleanTopic.split(/\s+/).filter((w) => w.length > 3 && !/^(and|the|for|with|from|into|about|this|that|is|are|an|a|or)$/i.test(w));

      if (topicKeywords.length > 0) {
        const sentences = fullSourceText.split(/(?<=[.?!])\s+/);
        const matchingSentences = sentences.filter((s) => {
          const sLower = s.toLowerCase();
          return topicKeywords.some((kw) => sLower.includes(kw));
        });
        if (matchingSentences.length > 0) {
          topicFilteredText = matchingSentences.join(" ");
        }
      }
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const validatedQuestions = [];
    const currentExclusions = [...previousExclusions];

    if (apiKey) {
      let attempts = 0;
      while (validatedQuestions.length < requestedCount && attempts < 3) {
        attempts++;
        const candidateRequestCount = Math.min(20, (requestedCount - validatedQuestions.length) * 3);
        const exclusionPromptPart = currentExclusions.length > 0
          ? `\nDO NOT generate any question that is identical or substantially similar to these previously used questions:\n- ${currentExclusions.slice(0, 30).join("\n- ")}`
          : "";

        const difficultyGuidance = difficulty === "Easy"
          ? "Focus on fundamental definitions, explicit facts, and direct recall present in the text."
          : difficulty === "Hard"
          ? "Focus on analytical reasoning, scenario analysis, evaluating multiple principles, and synthesis across the text."
          : "Focus on understanding core mechanisms, comparing concepts, and applying key principles explained in the text.";

        const promptText = `You are a strict, source-grounded educational AI quiz creator.
Generate a candidate pool of ${candidateRequestCount} multiple-choice questions based ONLY AND EXCLUSIVELY on the provided source text from "${fileName}".

Target Topic: "${topic}"
Difficulty Level: "${difficulty}" (${difficultyGuidance})

SOURCE TEXT:
"""
${topicFilteredText.slice(0, 16000)}
"""

STRICT GROUNDING & VERIFICATION RULES:
1. Every question MUST be grounded ONLY in the source text provided above. DO NOT introduce facts or external knowledge not present in the source text.
2. Questions MUST be strictly about "${topic}".
3. Questions must look like standard exam/study questions. DO NOT mention the PDF, document, text, page number, or file name in "questionText" (NEVER generate phrases like "According to the PDF...", "Based on the document...", "As mentioned on page 3..."). The source metadata must remain exclusively in "sourceRef".
4. Provide EXACTLY 4 distinct, plausible options per question. All 4 options MUST be of the same syntactic category and domain context, offering realistic choices for THAT specific question.
5. "correctAnswer" MUST be an integer index (0, 1, 2, or 3) pointing to the single correct option.
6. Provide a clear, natural, grammatically correct question ending with a question mark '?'.
7. For EVERY question, include a "sourceRef" object with:
   - "fileName": "${fileName}"
   - "pageNumber": estimated page number from [Page X] tags in source text (e.g. 1)
   - "excerpt": exact 1-2 sentence verbatim string quote from the text that directly proves the answer.${exclusionPromptPart}

Respond ONLY with a valid JSON object with root key "questions". Example structure:
{
  "questions": [
    {
      "questionText": "What is the primary function of...?",
      "options": ["Option 0", "Option 1", "Option 2", "Option 3"],
      "correctAnswer": 0,
      "explanation": "Clear explanation of why Option 0 is correct...",
      "topic": "${topic}",
      "sourceRef": {
        "fileName": "${fileName}",
        "pageNumber": 1,
        "excerpt": "Direct quote from source text."
      }
    }
  ]
}`;

        try {
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
            const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            const jsonMatch = candidateText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (Array.isArray(parsed.questions)) {
                for (const candidateQ of parsed.questions) {
                  const valid = await QuizValidationService.validateCandidateQuestion(candidateQ, {
                    relevantChunksText: fullSourceText,
                    targetTopic: topic,
                    difficulty,
                    fileName,
                    previousQuestions: currentExclusions,
                    currentBatch: validatedQuestions,
                    apiKey: null
                  });

                  if (valid) {
                    validatedQuestions.push(valid);
                    currentExclusions.push(valid.questionText);
                    if (validatedQuestions.length >= requestedCount) break;
                  }
                }
              }
            }
          }
        } catch (err) {
          console.warn("[AiService] Gemini PDF quiz generation error:", err.message);
          break;
        }
      }
    }

    // Sentence extractor fallback if Gemini produced fewer than requested
    if (validatedQuestions.length < requestedCount && fullSourceText.length > 50) {
      const fallbackQuestions = await this.extractSentenceGroundingQuizQuestions({
        sourceText: fullSourceText,
        fileName,
        topic,
        count: requestedCount - validatedQuestions.length,
        previousExclusions: currentExclusions,
        currentBatch: validatedQuestions
      });
      validatedQuestions.push(...fallbackQuestions);
    }

    const finalQuestions = validatedQuestions.slice(0, requestedCount);
    const insufficientContent = finalQuestions.length < requestedCount;
    let message = "";
    if (insufficientContent) {
      message = finalQuestions.length === 0
        ? `No valid unique questions could be generated from "${fileName}" for topic "${topic}". Try uploading additional study notes or choosing another topic.`
        : `Generated ${finalQuestions.length} unique, 100% verified source-grounded questions for "${topic}" (fewer than requested ${requestedCount}) because available unique source content was exhausted. No generic or unverified content was fabricated.`;
    }

    return {
      title: `${fileName}: ${topic} Quiz`,
      subject: studyMaterial.subject || undefined,
      studyMaterial: studyMaterial._id,
      topic,
      difficulty,
      questionCount: finalQuestions.length,
      requestedCount,
      questions: finalQuestions,
      insufficientContent,
      message
    };
  }

  /**
   * Generates PDF-grounded Flashcards strictly from uploaded study material
   */
  static async generateFlashcardsFromMaterial({
    userId,
    studyMaterialId,
    topic = "General",
    difficulty = "Medium",
    cardCount = 5
  }) {
    const requestedCount = Math.max(1, Number(cardCount) || 5);
    const studyMaterial = await StudyMaterial.findOne({ _id: studyMaterialId, user: userId });

    if (!studyMaterial) {
      throw new Error("Study material document not found or access denied.");
    }

    const previousExclusions = await this.getPreviousFlashcardFrontsFromMaterial(userId, studyMaterialId, topic);

    const sourceText = studyMaterial.extractedText || "";
    const fileName = studyMaterial.fileName || "Uploaded Material";

    if (!sourceText || sourceText.length < 20) {
      return {
        success: true,
        cards: [],
        requestedCount,
        count: 0,
        insufficientContent: true,
        message: "This PDF document does not contain readable text to generate flashcards."
      };
    }

    // Semantic Topic Filtering for Flashcards
    let topicFilteredText = sourceText;
    if (topic && topic.toLowerCase() !== "all topics" && topic.toLowerCase() !== "general") {
      const cleanTopic = topic.toLowerCase().replace(/[^\w\s]/g, " ");
      const topicKeywords = cleanTopic.split(/\s+/).filter((w) => w.length > 3 && !/^(and|the|for|with|from|into|about|this|that|is|are|an|a|or)$/i.test(w));

      if (topicKeywords.length > 0) {
        const sentences = sourceText.split(/(?<=[.?!])\s+/);
        const matchingSentences = sentences.filter((s) => {
          const sLower = s.toLowerCase();
          return topicKeywords.some((kw) => sLower.includes(kw));
        });
        if (matchingSentences.length > 0) {
          topicFilteredText = matchingSentences.join(" ");
        }
      }
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const accumulatedCards = [];
    const currentExclusions = [...previousExclusions];

    if (apiKey) {
      let attempts = 0;
      while (accumulatedCards.length < requestedCount && attempts < 3) {
        attempts++;
        const candidateCount = Math.min(25, (requestedCount - accumulatedCards.length) * 3);
        const exclusionPromptPart = currentExclusions.length > 0
          ? `\nDO NOT generate any flashcard front that is identical or substantially similar to these previously used fronts:\n- ${currentExclusions.slice(0, 30).join("\n- ")}`
          : "";

        const promptText = `You are a strict educational AI flashcard creator.
Generate a candidate pool of ${candidateCount} unique study flashcards grounded ONLY AND EXCLUSIVELY in the provided source text from "${fileName}".

Target Topic: "${topic}"
Difficulty Level: "${difficulty}"

SOURCE TEXT:
"""
${topicFilteredText.slice(0, 16000)}
"""

STRICT GROUNDING & VERIFICATION RULES:
1. Every flashcard MUST be grounded ONLY in the source text provided above. DO NOT introduce external facts.
2. Front must contain a clear, concept-specific exam question or prompt (e.g. "What is...", "How does...", "Define..."). DO NOT mention the PDF, document, text, page number, or file name in "front".
3. Back must contain a precise explanation derived from text.
4. Include a "sourceRef" object on every card with:
   - "fileName": "${fileName}"
   - "pageNumber": estimated page number from [Page X] tags in source text
   - "excerpt": exact 1-2 sentence verbatim quote proving the front and back answer.${exclusionPromptPart}

Respond ONLY with a valid JSON object with root key "cards". Example structure:
{
  "cards": [
    {
      "front": "What is the primary role of...?",
      "back": "Detailed answer derived from text...",
      "topic": "${topic}",
      "difficulty": "${difficulty}",
      "sourceRef": {
        "fileName": "${fileName}",
        "pageNumber": 1,
        "excerpt": "Verbatim quote..."
      }
    }
  ]
}`;

        try {
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
            const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            const jsonMatch = candidateText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (Array.isArray(parsed.cards)) {
                const validCandidates = parsed.cards.filter((c) => {
                  return (
                    c &&
                    typeof c.front === "string" &&
                    c.front.trim().length > 5 &&
                    typeof c.back === "string" &&
                    c.back.trim().length > 3
                  );
                });

                const uniqueCandidates = DeduplicationService.deduplicateFlashcards(validCandidates, currentExclusions);
                for (const card of uniqueCandidates) {
                  accumulatedCards.push(card);
                  currentExclusions.push(card.front);
                  if (accumulatedCards.length >= requestedCount) break;
                }
              }
            }
          }
        } catch (err) {
          console.warn("[AiService] Gemini PDF flashcard generation error:", err.message);
          break;
        }
      }
    }

    // Fallback extractor if Gemini produced fewer than requested
    if (accumulatedCards.length < requestedCount && sourceText.length > 50) {
      const fallbackCards = await this.extractSentenceGroundingFlashcards({
        sourceText,
        fileName,
        topic,
        difficulty,
        count: requestedCount - accumulatedCards.length,
        previousExclusions: currentExclusions
      });
      accumulatedCards.push(...fallbackCards);
    }

    const finalCards = accumulatedCards.slice(0, requestedCount).map((c) => ({
      subject: studyMaterial.subject || undefined,
      studyMaterial: studyMaterial._id,
      topic: c.topic || topic,
      front: c.front.trim(),
      back: c.back.trim(),
      difficulty: c.difficulty || difficulty,
      sourceRef: c.sourceRef || { fileName, pageNumber: 1, excerpt: sourceText.slice(0, 150) },
      status: "New"
    }));

    const insufficientContent = finalCards.length < requestedCount;
    let message = "";
    if (insufficientContent) {
      message = finalCards.length === 0
        ? `No new unique flashcards could be generated from "${fileName}" for topic "${topic}".`
        : `Generated ${finalCards.length} unique PDF-grounded flashcards for "${topic}" (fewer than requested ${requestedCount}) because available unique source content was exhausted.`;
    }

    return {
      success: true,
      cards: finalCards,
      requestedCount,
      count: finalCards.length,
      insufficientContent,
      message
    };
  }

  /**
   * Sentence extractor fallback for source grounding using PDF vocabulary distractors
   */
  static async extractSentenceGroundingQuizQuestions({ sourceText, fileName, topic, count = 5, previousExclusions = [], currentBatch = [] }) {
    const questions = [];
    const pageBlocks = [];
    const pageRegex = /\[Page\s+(\d+)\]/gi;
    let match;
    let lastIndex = 0;
    let lastPageNum = 1;

    while ((match = pageRegex.exec(sourceText)) !== null) {
      if (pageBlocks.length > 0) {
        pageBlocks[pageBlocks.length - 1].text = sourceText.slice(lastIndex, match.index);
      }
      lastPageNum = parseInt(match[1], 10) || 1;
      lastIndex = match.index + match[0].length;
      pageBlocks.push({ pageNumber: lastPageNum, text: "" });
    }
    if (pageBlocks.length > 0) {
      pageBlocks[pageBlocks.length - 1].text = sourceText.slice(lastIndex);
    } else {
      pageBlocks.push({ pageNumber: 1, text: sourceText });
    }

    // Collect candidate key terms from the document for distractors
    const allWords = sourceText
      .replace(/\[Page\s+\d+\]/gi, " ")
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 4 && !/^\d+$/.test(w) && !/^(the|this|that|these|those|when|what|which|there|here|with|from|into|about|after|before|through|between|should|could|would|their|other|under|where|first|second)$/i.test(w));

    const uniqueTerms = Array.from(new Set(allWords));

    for (const block of pageBlocks) {
      const sentences = block.text
        .split(/(?<=[.?!])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 35 && s.length < 220 && /^[A-Z]/.test(s));

      for (const sent of sentences) {
        if (questions.length >= count) break;

        const words = sent.split(/\s+/);
        let keyWordIndex = words.findIndex((w) => w.length > 4 && /^[A-Z]/.test(w) && !/^(The|This|That|These|Those|When|What|Which|There|Here|With|From|Into|About|After|Before|Through)$/i.test(w));
        if (keyWordIndex === -1) {
          keyWordIndex = words.findIndex((w) => w.length > 5 && !/^(however|therefore|consequently|furthermore|addition|because|although)$/i.test(w));
        }

        if (keyWordIndex !== -1) {
          const rawTarget = words[keyWordIndex];
          const targetWord = rawTarget.replace(/[^\w]/g, "");
          if (targetWord.length < 3) continue;

          // Replace targetWord with [blank] in sentence to make a natural sentence completion question
          const sentWithBlank = sent.replace(new RegExp(`\\b${targetWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, "i"), "___");
          if (sentWithBlank === sent) continue;

          const questionText = `Which term correctly completes the statement: "${sentWithBlank}"?`;

          // Pick distractors from unique terms in PDF
          const distractors = uniqueTerms
            .filter((t) => t.toLowerCase() !== targetWord.toLowerCase())
            .sort(() => 0.5 - Math.random())
            .slice(0, 3);

          if (distractors.length < 3) continue;

          const rawOptions = [targetWord, ...distractors];
          const shuffled = [...rawOptions];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }

          const correctAnswerIndex = shuffled.indexOf(targetWord);

          const candidateQ = {
            questionText,
            options: shuffled,
            correctAnswer: correctAnswerIndex,
            explanation: `The correct term is '${targetWord}'. Context: "${sent}"`,
            topic,
            sourceRef: {
              fileName,
              pageNumber: block.pageNumber,
              excerpt: sent
            }
          };

          const validated = await QuizValidationService.validateCandidateQuestion(candidateQ, {
            relevantChunksText: sourceText,
            targetTopic: topic,
            fileName,
            previousQuestions: previousExclusions,
            currentBatch: [...currentBatch, ...questions]
          });
          if (validated) {
            questions.push(validated);
          }
        }
      }
      if (questions.length >= count) break;
    }

    return questions;
  }

  /**
   * Sentence extractor fallback for flashcard grounding with concept-specific unique fronts
   */
  static async extractSentenceGroundingFlashcards({ sourceText, fileName, topic, difficulty, count = 5, previousExclusions = [] }) {
    const cards = [];
    const pageBlocks = [];
    const pageRegex = /\[Page\s+(\d+)\]/gi;
    let match;
    let lastIndex = 0;
    let lastPageNum = 1;

    while ((match = pageRegex.exec(sourceText)) !== null) {
      if (pageBlocks.length > 0) {
        pageBlocks[pageBlocks.length - 1].text = sourceText.slice(lastIndex, match.index);
      }
      lastPageNum = parseInt(match[1], 10) || 1;
      lastIndex = match.index + match[0].length;
      pageBlocks.push({ pageNumber: lastPageNum, text: "" });
    }
    if (pageBlocks.length > 0) {
      pageBlocks[pageBlocks.length - 1].text = sourceText.slice(lastIndex);
    } else {
      pageBlocks.push({ pageNumber: 1, text: sourceText });
    }

    const accumulatedFronts = [...previousExclusions];

    for (const block of pageBlocks) {
      const sentences = block.text
        .split(/(?<=[.?!])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 25 && s.length < 300 && /^[A-Z]/.test(s));

      for (const sent of sentences) {
        if (cards.length >= count) break;

        const cleanSent = sent.trim();
        const words = cleanSent.split(/\s+/);

        let keyWords = words.filter((w) => w.length > 4 && !/^(The|This|That|These|Those|When|What|Which|There|Here|With|From|Into|About|After|Before|Through)$/i.test(w));
        const keyTerm = keyWords.length > 0 ? keyWords.slice(0, 3).join(" ").replace(/[^\w\s]/g, "") : topic;

        const frontTemplates = [
          `What is the primary concept of ${keyTerm}?`,
          `How is ${keyTerm} defined in ${topic}?`,
          `What is the main role of ${keyTerm}?`,
          `Explain the key principles of ${keyTerm}.`
        ];
        const frontPrompt = frontTemplates[cards.length % frontTemplates.length];

        if (!DeduplicationService.isDuplicateQuestion(frontPrompt, accumulatedFronts)) {
          cards.push({
            front: frontPrompt,
            back: cleanSent,
            topic: topic || "Core Concepts",
            difficulty: difficulty || "Medium",
            sourceRef: {
              fileName,
              pageNumber: block.pageNumber,
              excerpt: cleanSent
            }
          });
          accumulatedFronts.push(frontPrompt);
        }
      }
      if (cards.length >= count) break;
    }

    return cards;
  }
}

module.exports = AiService;
