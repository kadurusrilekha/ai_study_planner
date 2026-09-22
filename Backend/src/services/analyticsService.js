const Schedule = require("../models/Schedule");
const Subject = require("../models/Subject");
const Task = require("../models/Task");
const Quiz = require("../models/Quiz");
const QuizAttempt = require("../models/QuizAttempt");
const Flashcard = require("../models/Flashcard");
const Exam = require("../models/Exam");
const Gamification = require("../models/Gamification");

// Helper to safely check subject reference match
function isSameSubject(subjectRef, subjectId) {
  if (!subjectRef || !subjectId) return false;
  const refStr = typeof subjectRef === "object" ? (subjectRef._id ? subjectRef._id.toString() : subjectRef.toString()) : subjectRef.toString();
  const idStr = typeof subjectId === "object" ? subjectId.toString() : subjectId.toString();
  return refStr === idStr;
}

// Format human-readable next session text from schedule list
function formatNextSession(subjectSchedules) {
  if (!subjectSchedules || subjectSchedules.length === 0) return "No upcoming session";

  const upcoming = subjectSchedules
    .filter((s) => !s.completed)
    .map((s) => {
      let sessionDate = s.date ? new Date(s.date) : new Date();
      if (s.time || s.startTime) {
        const timeStr = s.time || s.startTime;
        const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (match) {
          let hrs = parseInt(match[1], 10);
          const mins = parseInt(match[2], 10);
          const ampm = match[3];
          if (ampm) {
            if (ampm.toUpperCase() === "PM" && hrs < 12) hrs += 12;
            if (ampm.toUpperCase() === "AM" && hrs === 12) hrs = 0;
          }
          sessionDate.setHours(hrs, mins, 0, 0);
        }
      }
      return { schedule: s, dateObj: sessionDate };
    })
    .filter((item) => !isNaN(item.dateObj.getTime()) && item.dateObj >= new Date(Date.now() - 60 * 60 * 1000))
    .sort((a, b) => a.dateObj - b.dateObj);

  if (upcoming.length === 0) return "No upcoming session";

  const next = upcoming[0];
  const d = next.dateObj;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const targetDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const timeFormatted = next.schedule.time || next.schedule.startTime || d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (targetDay.getTime() === today.getTime()) {
    return `Today at ${timeFormatted}`;
  } else if (targetDay.getTime() === tomorrow.getTime()) {
    return `Tomorrow at ${timeFormatted}`;
  } else {
    const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
    const monthDay = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${dayName}, ${monthDay} at ${timeFormatted}`;
  }
}

// Calculate days remaining details cleanly
function getDaysRemainingDetails(examDate) {
  if (!examDate) return { daysRemaining: 0, label: "No date set", isPassed: false };

  const target = new Date(examDate);
  const now = new Date();

  const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffMs = targetMidnight.getTime() - todayMidnight.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { daysRemaining: diffDays, label: "Exam date passed", isPassed: true };
  } else if (diffDays === 0) {
    return { daysRemaining: 0, label: "Today", isPassed: false };
  } else if (diffDays === 1) {
    return { daysRemaining: 1, label: "1 Day Remaining", isPassed: false };
  } else {
    return { daysRemaining: diffDays, label: `${diffDays} Days Remaining`, isPassed: false };
  }
}

class AnalyticsService {
  /**
   * Compute subject analytics for a list of subjects belonging to a user
   */
  static async calculateSubjectAnalytics(userId, subjects) {
    const [tasks, schedules, quizzes, quizAttempts] = await Promise.all([
      Task.find({ user: userId }),
      Schedule.find({ user: userId }),
      Quiz.find({ user: userId }),
      QuizAttempt.find({ user: userId })
    ]);

    return subjects.map((sub) => {
      const subObj = sub.toObject ? sub.toObject() : { ...sub };

      // 1. Mastery Progress
      let masteryProgress = 0;
      if (subObj.topics && subObj.topics.length > 0) {
        const sumProgress = subObj.topics.reduce((acc, t) => acc + (Number(t.progress) || 0), 0);
        masteryProgress = Math.min(100, Math.max(0, Math.round(sumProgress / subObj.topics.length)));
      }

      // 2. Study Hours (sum of completed sessions)
      const subSchedules = schedules.filter((s) => isSameSubject(s.subject, subObj._id));
      const completedSchedules = subSchedules.filter((s) => s.completed === true);
      const studyHoursRaw = completedSchedules.reduce((acc, s) => acc + (Number(s.duration) || 1), 0);
      const studyHours = Math.round(studyHoursRaw * 10) / 10;

      // 3. Quiz Accuracy
      const subQuizzes = quizzes.filter((q) => isSameSubject(q.subject, subObj._id));
      const subQuizIds = subQuizzes.map((q) => q._id.toString());
      const subAttempts = quizAttempts.filter((a) => a.quiz && subQuizIds.includes(a.quiz.toString()));

      let quizAccuracy = null;
      let quizAttemptsCount = subAttempts.length;
      if (subAttempts.length > 0) {
        const totalCorrect = subAttempts.reduce((acc, a) => acc + (Number(a.score) || 0), 0);
        const totalQuestions = subAttempts.reduce((acc, a) => acc + (Number(a.totalQuestions) || 0), 0);
        if (totalQuestions > 0) {
          quizAccuracy = Math.min(100, Math.max(0, Math.round((totalCorrect / totalQuestions) * 100)));
        }
      }

      // 4. Tasks Pending
      const subTasks = tasks.filter((t) => isSameSubject(t.subject, subObj._id));
      const tasksPending = subTasks.filter((t) => t.status !== "Completed").length;

      // 5. Next Session
      const nextSession = formatNextSession(subSchedules);

      return {
        ...subObj,
        masteryProgress,
        studyHours,
        quizAccuracy,
        quizAttempts: quizAttemptsCount,
        tasksPending,
        nextSession
      };
    });
  }

  /**
   * Compute exam analytics for a list of exams belonging to a user
   */
  static async calculateExamAnalytics(userId, exams) {
    const AiService = require("./aiService");

    const [subjects, tasks, schedules, quizzes, quizAttempts, flashcards] = await Promise.all([
      Subject.find({ user: userId }),
      Task.find({ user: userId }),
      Schedule.find({ user: userId }),
      Quiz.find({ user: userId }),
      QuizAttempt.find({ user: userId }),
      Flashcard.find({ user: userId })
    ]);

    return exams.map((exam) => {
      const examObj = exam.toObject ? exam.toObject() : { ...exam };
      const dateDetails = getDaysRemainingDetails(examObj.examDate);

      // Subject resolution
      const matchedSubject = subjects.find((s) => isSameSubject(examObj.subject, s._id));
      const subjectId = matchedSubject ? matchedSubject._id : (examObj.subject?._id || examObj.subject);

      let preparationProgress = 0;
      let completedTopics = 0;
      let totalTopics = 0;
      let studyHours = 0;
      let quizAccuracy = null;
      let pendingTasks = 0;

      if (subjectId) {
        // 1. Topic Progress (Weight: 50%)
        let topicProgressPct = 0;
        if (matchedSubject && matchedSubject.topics && matchedSubject.topics.length > 0) {
          totalTopics = matchedSubject.topics.length;
          completedTopics = matchedSubject.topics.filter((t) => t.completed || t.progress >= 100).length;
          const sumProgress = matchedSubject.topics.reduce((acc, t) => acc + (Number(t.progress) || 0), 0);
          topicProgressPct = Math.min(100, Math.max(0, sumProgress / totalTopics));
        }

        // 2. Study Hours (Weight: 20%)
        const subSchedules = schedules.filter((s) => isSameSubject(s.subject, subjectId));
        const completedSchedules = subSchedules.filter((s) => s.completed === true);
        studyHours = Math.round(completedSchedules.reduce((acc, s) => acc + (Number(s.duration) || 1), 0) * 10) / 10;
        const targetHours = 10;
        const studyProgressPct = Math.min(100, (studyHours / targetHours) * 100);

        // 3. Task Completion (Weight: 15%)
        const subTasks = tasks.filter((t) => isSameSubject(t.subject, subjectId));
        pendingTasks = subTasks.filter((t) => t.status !== "Completed").length;
        const completedTaskCount = subTasks.filter((t) => t.status === "Completed").length;
        const taskProgressPct = subTasks.length > 0 ? (completedTaskCount / subTasks.length) * 100 : 0;

        // 4. Quiz Accuracy (Weight: 15%)
        const subQuizzes = quizzes.filter((q) => isSameSubject(q.subject, subjectId));
        const subQuizIds = subQuizzes.map((q) => q._id.toString());
        const subAttempts = quizAttempts.filter((a) => a.quiz && subQuizIds.includes(a.quiz.toString()));
        if (subAttempts.length > 0) {
          const totalCorrect = subAttempts.reduce((acc, a) => acc + (Number(a.score) || 0), 0);
          const totalQuestions = subAttempts.reduce((acc, a) => acc + (Number(a.totalQuestions) || 0), 0);
          if (totalQuestions > 0) {
            quizAccuracy = Math.min(100, Math.max(0, Math.round((totalCorrect / totalQuestions) * 100)));
          }
        }

        // Weighted Calculation
        if (totalTopics > 0) {
          let weighted = (topicProgressPct * 0.50) + (taskProgressPct * 0.20) + (studyProgressPct * 0.15) + ((quizAccuracy || 0) * 0.15);
          preparationProgress = Math.min(100, Math.max(0, Math.round(weighted)));
        } else if (subTasks.length > 0 || subSchedules.length > 0 || subAttempts.length > 0) {
          let weighted = (taskProgressPct * 0.40) + (studyProgressPct * 0.30) + ((quizAccuracy || 0) * 0.30);
          preparationProgress = Math.min(100, Math.max(0, Math.round(weighted)));
        } else {
          preparationProgress = 0;
        }
      }

      // Exam status determination
      let status = "Not Started";
      if (dateDetails.isPassed) {
        status = "Exam Date Passed";
      } else if (preparationProgress >= 100) {
        status = "Completed";
      } else if (preparationProgress >= 80) {
        status = "Well Prepared";
      } else if (preparationProgress > 0) {
        status = "In Progress";
      } else {
        status = "Not Started";
      }

      // Dynamic AI Recommendation
      const subjectName = matchedSubject ? matchedSubject.name : (examObj.subject?.name || "General");
      const aiRecommendation = AiService.generateExamRecommendation({
        examTitle: examObj.title,
        subjectName,
        daysRemaining: dateDetails.daysRemaining,
        prepProgress: preparationProgress,
        targetScore: examObj.targetScore || "90%",
        completedTopics,
        totalTopics,
        quizAccuracy,
        pendingTasks
      });

      return {
        ...examObj,
        subject: matchedSubject || examObj.subject,
        daysRemaining: dateDetails.daysRemaining,
        daysRemainingLabel: dateDetails.label,
        isPassed: dateDetails.isPassed,
        preparationProgress,
        status,
        studyHours,
        completedTopics,
        totalTopics,
        quizAccuracy,
        pendingTasks,
        aiRecommendation
      };
    });
  }

  /**
   * Compute comprehensive overview analytics from actual database records
   */
  static async calculateOverviewAnalytics(userId) {
    const [schedules, subjects, tasks, attempts, flashcards] = await Promise.all([
      Schedule.find({ user: userId }).populate("subject"),
      Subject.find({ user: userId }),
      Task.find({ user: userId }),
      QuizAttempt.find({ user: userId }).sort({ createdAt: 1 }),
      Flashcard.find({ user: userId })
    ]);

    const Quiz = require("../models/Quiz");
    const quizzes = await Quiz.find({ user: userId });

    // 1. Real Study Hours Aggregation
    const completedSchedules = schedules.filter((s) => s.completed === true);
    
    // Total hours completed in lifetime
    const totalCompletedHours = completedSchedules.reduce((acc, curr) => acc + (Number(curr.duration) || 1), 0);

    // Calculate weekly study hours from completed schedules within last 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const weeklySchedules = completedSchedules.filter((s) => {
      const sDate = s.date ? new Date(s.date) : new Date(s.createdAt);
      return sDate >= sevenDaysAgo;
    });
    const weeklyStudyHours = Math.round(weeklySchedules.reduce((acc, curr) => acc + (Number(curr.duration) || 1), 0) * 10) / 10;

    const monthlySchedules = completedSchedules.filter((s) => {
      const sDate = s.date ? new Date(s.date) : new Date(s.createdAt);
      return sDate >= thirtyDaysAgo;
    });
    const monthlyStudyHours = Math.round(monthlySchedules.reduce((acc, curr) => acc + (Number(curr.duration) || 1), 0) * 10) / 10;

    const dailyAverage = weeklyStudyHours > 0 ? (weeklyStudyHours / 7).toFixed(1) : "0.0";

    // Planned weekly study hours computed from all scheduled (or uncompleted) sessions for current week
    const plannedWeeklySchedules = schedules.filter((s) => {
      const sDate = s.date ? new Date(s.date) : new Date(s.createdAt);
      return sDate >= sevenDaysAgo;
    });
    const plannedWeeklyHours = Math.round(plannedWeeklySchedules.reduce((acc, curr) => acc + (Number(curr.duration) || 1), 0) * 10) / 10;

    // 2. Subject Performance Matrix
    const subjectMetrics = subjects.map((sub) => {
      const subSchedules = schedules.filter((s) => isSameSubject(s.subject, sub._id));
      const hours = subSchedules.filter((s) => s.completed).reduce((acc, curr) => acc + (Number(curr.duration) || 1), 0);

      let progressPct = 0;
      if (sub.topics && sub.topics.length > 0) {
        const sum = sub.topics.reduce((a, b) => a + (b.progress || 0), 0);
        progressPct = Math.round(sum / sub.topics.length);
      }

      const subQuizzes = quizzes.filter((q) => isSameSubject(q.subject, sub._id));
      const subQuizIds = subQuizzes.map((q) => q._id.toString());
      const subAttempts = attempts.filter((a) => a.quiz && subQuizIds.includes(a.quiz.toString()));
      let quizAccuracy = 0;
      if (subAttempts.length > 0) {
        const totalCorrect = subAttempts.reduce((acc, a) => acc + (Number(a.score) || 0), 0);
        const totalQuestions = subAttempts.reduce((acc, a) => acc + (Number(a.totalQuestions) || 0), 0);
        if (totalQuestions > 0) {
          quizAccuracy = Math.round((totalCorrect / totalQuestions) * 100);
        }
      }

      return {
        subjectId: sub._id,
        name: sub.name,
        hours: Math.round(hours * 10) / 10,
        progressPct,
        quizAccuracy
      };
    });

    // 3. Quiz Performance Trends
    const quizTrends = attempts.map((a) => ({
      date: a.createdAt ? a.createdAt.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      score: a.percentage || 0,
      quizTitle: a.quizTitle || "Practice Quiz"
    }));

    // 4. Flashcard Performance Statistics (Strict zero state when no flashcards)
    const totalFlashcards = flashcards.length;
    const masteredCount = flashcards.filter((f) => f.status === "Mastered").length;
    const difficultCount = flashcards.filter((f) => f.status === "Difficult").length;
    const retentionRate = totalFlashcards > 0 ? Math.round((masteredCount / totalFlashcards) * 100) : 0;

    // 5. Task Completion Rate
    const completedTasksCount = tasks.filter((t) => t.status === "Completed").length;
    const taskCompletionRate = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0;

    // 6. Real 120-Day Activity Heatmap Data Generation
    // Aggregates actual completed study sessions, task completions, and quiz attempts by YYYY-MM-DD
    const activityCountByDate = {};

    completedSchedules.forEach((s) => {
      const dStr = s.date ? new Date(s.date).toISOString().split("T")[0] : (s.createdAt ? new Date(s.createdAt).toISOString().split("T")[0] : "");
      if (dStr) activityCountByDate[dStr] = (activityCountByDate[dStr] || 0) + 1;
    });

    tasks.filter((t) => t.status === "Completed").forEach((t) => {
      const dStr = t.date ? new Date(t.date).toISOString().split("T")[0] : (t.dueDate ? new Date(t.dueDate).toISOString().split("T")[0] : "");
      if (dStr) activityCountByDate[dStr] = (activityCountByDate[dStr] || 0) + 1;
    });

    attempts.forEach((a) => {
      const dStr = a.createdAt ? new Date(a.createdAt).toISOString().split("T")[0] : "";
      if (dStr) activityCountByDate[dStr] = (activityCountByDate[dStr] || 0) + 1;
    });

    const heatmap = [];
    const today = new Date();
    for (let i = 119; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split("T")[0];
      const count = activityCountByDate[dateStr] || 0;
      let intensity = 0;
      if (count > 0) {
        if (count >= 5) intensity = 3;
        else if (count >= 3) intensity = 2;
        else intensity = 1;
      }
      heatmap.push({ date: dateStr, count, intensity });
    }

    return {
      studyHours: {
        daily: dailyAverage,
        weekly: weeklyStudyHours,
        monthly: monthlyStudyHours,
        totalCompleted: totalCompletedHours,
        plannedWeekly: plannedWeeklyHours
      },
      subjectMetrics,
      quizTrends,
      flashcardStats: {
        totalFlashcards,
        masteredCount,
        difficultCount,
        retentionRate
      },
      taskStats: {
        total: tasks.length,
        completed: completedTasksCount,
        completionRate: taskCompletionRate
      },
      heatmap
    };
  }
}

module.exports = AnalyticsService;
