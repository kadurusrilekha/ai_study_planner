import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import API from "../api";
import AppLayout from "../components/AppLayout";
import { useToast } from "../components/Toast";
import ViewSourceModal from "../components/ViewSourceModal";
import PdfUploadModal from "../components/PdfUploadModal";
import {
  HelpCircle,
  Sparkles,
  Award,
  Trophy,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  X,
  Play,
  Brain,
  Check,
  BookOpen,
  ChevronRight,
  TrendingUp,
  Target,
  FileText,
  UploadCloud
} from "lucide-react";

const QuizCenter = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [studyMaterials, setStudyMaterials] = useState([]);
  const [stats, setStats] = useState({
    totalAttempts: 0,
    averageScore: 0,
    bestScore: 0,
    weakTopics: [],
    recentAttempts: []
  });
  const [loading, setLoading] = useState(true);

  // Quiz Modal State
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showPdfUploadModal, setShowPdfUploadModal] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Source Mode ("PDF" vs "SUBJECT")
  const [sourceMode, setSourceMode] = useState("PDF");
  const [selectedMaterialId, setSelectedMaterialId] = useState("");

  // Source Grounding View Modal
  const [activeSourceRef, setActiveSourceRef] = useState(null);
  const [showViewSourceModal, setShowViewSourceModal] = useState(false);

  // Form Config
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedSubjectName, setSelectedSubjectName] = useState("");
  const [topicInput, setTopicInput] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [questionCount, setQuestionCount] = useState(5);

  // Active Quiz State (Distraction-Free Mode)
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [quizTimer, setQuizTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Results Screen State
  const [quizResult, setQuizResult] = useState(null);

  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  // Timer interval for active quiz
  useEffect(() => {
    let interval;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setQuizTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [quizzesRes, subjectsRes, materialsRes, statsRes] = await Promise.all([
        API.get("/quizzes").catch(() => ({ data: [] })),
        API.get("/subjects").catch(() => ({ data: [] })),
        API.get("/study-materials").catch(() => ({ data: { materials: [] } })),
        API.get("/quizzes/stats").catch(() => ({
          data: { totalAttempts: 0, averageScore: 0, bestScore: 0, weakTopics: [], recentAttempts: [] }
        }))
      ]);

      const subList = subjectsRes.data || [];
      const matList = materialsRes.data?.materials || [];

      setQuizzes(quizzesRes.data || []);
      setSubjects(subList);
      setStudyMaterials(matList);
      setStats(statsRes.data || {});

      if (matList.length > 0) {
        setSelectedMaterialId(matList[0]._id);
        if (matList[0].detectedTopics && matList[0].detectedTopics.length > 0) {
          setTopicInput(matList[0].detectedTopics[0].name);
        }
      } else if (subList.length > 0) {
        setSourceMode("SUBJECT");
        const firstSub = subList[0];
        setSelectedSubjectId(firstSub._id);
        setSelectedSubjectName(firstSub.name);
        if (firstSub.topics && firstSub.topics.length > 0) {
          setTopicInput(firstSub.topics[0].name);
        }
      }
    } catch (err) {
      console.error("Failed to load quiz data", err);
      addToast("Failed to load quiz data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectChange = (subjectId) => {
    setSelectedSubjectId(subjectId);
    const found = subjects.find((s) => s._id === subjectId);
    if (found) {
      setSelectedSubjectName(found.name);
      if (found.topics && found.topics.length > 0) {
        setTopicInput(found.topics[0].name);
      } else {
        setTopicInput("");
      }
    } else {
      setSelectedSubjectName("");
      setTopicInput("");
    }
  };

  const handleGenerateAiQuiz = async (e) => {
    e.preventDefault();
    if (!topicInput.trim()) {
      addToast("Please select or enter a topic", "error");
      return;
    }

    if (sourceMode === "PDF" && !selectedMaterialId) {
      addToast("Please select an uploaded PDF study material or switch source mode.", "error");
      return;
    }

    setGenerating(true);

    try {
      const payload = {
        topic: topicInput,
        difficulty,
        questionCount: Number(questionCount) || 5
      };

      if (sourceMode === "PDF" && selectedMaterialId) {
        payload.studyMaterialId = selectedMaterialId;
      } else {
        payload.subjectId = selectedSubjectId || undefined;
        payload.subjectName = selectedSubjectName;
      }

      const res = await API.post("/quizzes/generate", payload);

      if (res.data && res.data.success && res.data.quiz) {
        setQuizzes([res.data.quiz, ...quizzes]);
        setShowConfigModal(false);
        if (res.data.insufficientContent && res.data.message) {
          addToast(res.data.message, "info");
        } else {
          addToast("AI Quiz generated! Launching test mode...", "success");
        }
        startQuizSession(res.data.quiz);
      } else {
        addToast(res.data?.message || "Could not generate unique questions for this topic.", "error");
      }
    } catch (err) {
      addToast("Failed to generate quiz", "error");
    } finally {
      setGenerating(false);
    }
  };

  const startQuizSession = (quiz) => {
    setActiveQuiz(quiz);
    setCurrentQuestionIdx(0);
    setUserAnswers({});
    setQuizTimer(0);
    setIsTimerRunning(true);
    setQuizResult(null);
  };

  const handleSelectOption = (optionIndex) => {
    setUserAnswers({
      ...userAnswers,
      [currentQuestionIdx]: optionIndex
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIdx < (activeQuiz.questions.length - 1)) {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIdx > 0) {
      setCurrentQuestionIdx(currentQuestionIdx - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;
    setIsTimerRunning(false);
    setSubmitting(true);

    try {
      const res = await API.post(`/quizzes/${activeQuiz._id}/submit`, {
        userAnswers,
        timeTakenSecs: quizTimer
      });

      if (res.data && res.data.success) {
        setQuizResult(res.data);
        fetchData(); // Refresh stats
        addToast(`Quiz submitted! You scored ${res.data.percentage}%`, "success");
      }
    } catch (err) {
      addToast("Failed to submit quiz", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Adaptive difficulty recommendation based on stats
  const getRecommendedDifficulty = () => {
    if (stats.averageScore >= 80) return "Hard";
    if (stats.averageScore >= 60) return "Medium";
    return "Easy";
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <Brain className="w-10 h-10 text-[#E4ACB2] animate-spin" />
          <p className="font-heading font-bold text-sm text-[#2F3542]">Loading Quiz Center...</p>
        </div>
      </AppLayout>
    );
  }

  // -------------------------------------------------------------
  // DISTRACTION-FREE ACTIVE QUIZ MODE RENDER
  // -------------------------------------------------------------
  if (activeQuiz && !quizResult) {
    const currentQ = activeQuiz.questions[currentQuestionIdx];
    const progressPct = Math.round(((currentQuestionIdx + 1) / activeQuiz.questions.length) * 100);

    return (
      <div className="min-h-screen bg-[#FAF8F3] text-[#2F3542] flex flex-col p-4 md:p-8 select-none">
        {/* Top Quiz Header */}
        <div className="max-w-4xl w-full mx-auto flex items-center justify-between py-4 border-b border-[#E8E5DE]">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#E4ACB2] text-[#2F3542]">
              {activeQuiz.difficulty} Mode
            </span>
            <span className="text-xs text-[#4B5563] font-bold truncate">
              {activeQuiz.title}
            </span>
          </div>

          {/* Timer & Exit */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E8E5DE] text-xs font-bold text-[#2F3542]">
              <Clock className="w-4 h-4 text-[#E4ACB2]" />
              <span>{formatTimer(quizTimer)}</span>
            </div>

            <button
              onClick={() => {
                if (window.confirm("Exit active quiz? Progress will be lost.")) {
                  setActiveQuiz(null);
                  setIsTimerRunning(false);
                }
              }}
              className="p-2 text-[#667085] hover:text-[#2F3542] rounded-xl hover:bg-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="max-w-4xl w-full mx-auto my-4">
          <div className="flex justify-between items-center text-xs text-[#4B5563] mb-1.5 font-bold">
            <span>Question {currentQuestionIdx + 1} of {activeQuiz.questions.length}</span>
            <span>{progressPct}% Completed</span>
          </div>
          <div className="w-full h-2.5 bg-[#E8E5DE] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#E4ACB2] rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Question & Options Area */}
        <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col justify-center my-6 space-y-6">
          <div className="card-base p-6 md:p-8 rounded-3xl bg-white border border-[#E8E5DE] shadow-sm space-y-3">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <span className="text-xs font-extrabold text-[#4B5563] uppercase tracking-widest">
                Topic: {currentQ?.topic || activeQuiz.topic || "Core Concept"}
              </span>
              {currentQ?.sourceRef && (
                <button
                  onClick={() => {
                    setActiveSourceRef(currentQ.sourceRef);
                    setShowViewSourceModal(true);
                  }}
                  className="px-3 py-1 rounded-xl bg-[#F7E8EA] hover:bg-[#E4ACB2] text-[#2F3542] text-xs font-bold transition-all flex items-center gap-1 border border-[#E4ACB2]/40"
                >
                  <BookOpen className="w-3.5 h-3.5 text-[#2F3542]" />
                  <span>📖 View Source</span>
                </button>
              )}
            </div>
            <h3 className="font-heading font-extrabold text-xl md:text-2xl text-[#2F3542] leading-snug">
              {currentQ?.questionText}
            </h3>
          </div>

          {/* 4 Answer Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentQ?.options.map((opt, optIdx) => {
              const isSelected = userAnswers[currentQuestionIdx] === optIdx;
              return (
                <button
                  key={optIdx}
                  onClick={() => handleSelectOption(optIdx)}
                  className={`p-5 rounded-2xl border text-left transition-all duration-200 flex items-start gap-3.5 group ${
                    isSelected
                      ? "bg-[#F7E8EA] border-[#E4ACB2] text-[#2F3542] shadow-sm font-bold"
                      : "bg-white border-[#E8E5DE] text-[#2F3542] hover:border-[#E4ACB2]/50"
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? "bg-[#E4ACB2] text-[#2F3542]"
                        : "bg-[#FAF8F3] text-[#4B5563] group-hover:bg-[#E4ACB2] group-hover:text-[#2F3542]"
                    }`}
                  >
                    {String.fromCharCode(65 + optIdx)}
                  </span>
                  <span className="text-xs md:text-sm font-semibold leading-relaxed pt-0.5 text-[#2F3542]">
                    {opt}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Navigation Controls */}
        <div className="max-w-4xl w-full mx-auto flex items-center justify-between pt-4 border-t border-[#E8E5DE]">
          <button
            onClick={handlePrevQuestion}
            disabled={currentQuestionIdx === 0}
            className="px-5 py-2.5 rounded-xl border border-[#E8E5DE] text-[#4B5563] hover:text-[#2F3542] disabled:opacity-30 text-xs font-bold"
          >
            Previous
          </button>

          {currentQuestionIdx < activeQuiz.questions.length - 1 ? (
            <button
              onClick={handleNextQuestion}
              className="px-6 py-2.5 rounded-xl bg-[#E4ACB2] hover:bg-[#D69AA2] text-[#2F3542] text-xs font-bold shadow-sm"
            >
              Next Question
            </button>
          ) : (
            <button
              onClick={handleSubmitQuiz}
              disabled={submitting}
              className="px-7 py-3 rounded-xl bg-[#CCD5AE] hover:bg-[#B9C89A] text-[#2F3542] font-bold text-xs shadow-sm"
            >
              {submitting ? "Submitting..." : "Submit Final Quiz"}
            </button>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VISUAL QUIZ RESULTS SCREEN RENDER
  // -------------------------------------------------------------
  if (quizResult) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto space-y-8 pb-8 animate-in fade-in">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">
                Quiz Session Completed 🎉
              </span>
              <h2 className="font-heading font-extrabold text-3xl text-[#2F3542]">
                Performance Scorecard
              </h2>
            </div>

            <button
              onClick={() => setQuizResult(null)}
              className="px-4 py-2 rounded-xl bg-[#E4ACB2] text-[#2F3542] text-xs font-bold hover:bg-[#D69AA2]"
            >
              Back to Quiz Center
            </button>
          </div>

          {/* Metric Ring & Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card-base rounded-3xl p-6 flex flex-col items-center justify-center text-center space-y-2 bg-white border border-[#E8E5DE]">
              <span className="text-xs font-semibold text-[#4B5563] uppercase tracking-wider">Overall Accuracy</span>
              <div className="font-heading font-black text-5xl text-[#2F3542]">
                {quizResult.percentage}%
              </div>
              <span className="text-xs text-[#4B5563]">
                {quizResult.correctCount} of {quizResult.totalQuestions} Questions Correct
              </span>
            </div>

            <div className="card-base rounded-3xl p-6 flex flex-col justify-center space-y-3 bg-white border border-[#E8E5DE]">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#4B5563]">Correct Answers:</span>
                <span className="font-bold text-[#2F3542]">{quizResult.correctCount}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#4B5563]">Incorrect Answers:</span>
                <span className="font-bold text-[#D99A9A]">{quizResult.totalQuestions - quizResult.correctCount}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#4B5563]">Time Taken:</span>
                <span className="font-bold text-[#2F3542]">{formatTimer(quizResult.attempt?.timeTakenSecs || 60)}</span>
              </div>
            </div>

            {/* AI Feedback Box */}
            <div className="card-base rounded-3xl p-6 bg-[#F7E8EA] border border-[#E4ACB2]/30 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-[#2F3542]">
                <Brain className="w-4 h-4 text-[#E4ACB2]" /> AI Performance Analysis
              </div>
              <p className="text-xs text-[#4B5563] leading-relaxed font-medium">
                {quizResult.aiFeedback}
              </p>
            </div>
          </div>

          {/* Topic Performance Breakdown */}
          <div className="card-base rounded-3xl p-6 md:p-8 space-y-5 bg-white border border-[#E8E5DE]">
            <h3 className="font-heading font-bold text-lg text-[#2F3542]">
              Topic Mastery Breakdown
            </h3>

            <div className="space-y-3">
              {(quizResult.topicScores || []).map((ts, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-[#FAF8F3] border border-[#E8E5DE] space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-[#2F3542]">{ts.topic}</span>
                    <span className="text-[#2F3542] font-bold">{ts.percentage}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#E8E5DE] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#E4ACB2] rounded-full"
                      style={{ width: `${ts.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Next Steps */}
          <div className="card-base rounded-3xl p-6 md:p-8 space-y-4 bg-white border border-[#E8E5DE]">
            <h3 className="font-heading font-bold text-lg text-[#2F3542]">
              Recommended Next Steps
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => navigate("/flashcards")}
                className="p-4 rounded-2xl bg-[#F7E8EA] text-[#2F3542] font-bold text-xs text-left hover:bg-[#E4ACB2] transition-all space-y-1 border border-[#E4ACB2]/30"
              >
                <span className="text-[#2F3542]">Practice Flashcards</span>
                <span className="block font-normal text-[11px] text-[#4B5563]">Reinforce weak terms</span>
              </button>

              <button
                onClick={() => navigate("/study-schedule")}
                className="p-4 rounded-2xl bg-[#F0F3E7] text-[#2F3542] font-bold text-xs text-left hover:bg-[#CCD5AE] transition-all space-y-1 border border-[#CCD5AE]/30"
              >
                <span className="text-[#2F3542]">Schedule Revision</span>
                <span className="block font-normal text-[11px] text-[#4B5563]">Set 25m focus block</span>
              </button>

              <button
                onClick={() => setQuizResult(null)}
                className="p-4 rounded-2xl bg-[#F7E8EA] text-[#2F3542] font-bold text-xs text-left hover:bg-[#E4ACB2] transition-all space-y-1 border border-[#E4ACB2]/30"
              >
                <span className="text-[#2F3542]">Take Another Quiz</span>
                <span className="block font-normal text-[11px] text-[#4B5563]">Re-test accuracy</span>
              </button>

              <button
                onClick={() => navigate("/subjects")}
                className="p-4 rounded-2xl bg-[#FAF8F3] text-[#2F3542] font-bold text-xs text-left hover:bg-[#E8E5DE] transition-all space-y-1 border border-[#E8E5DE]"
              >
                <span className="text-[#2F3542]">Subject Dashboard</span>
                <span className="block font-normal text-[11px] text-[#4B5563]">Review full syllabus</span>
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // -------------------------------------------------------------
  // MAIN QUIZ CENTER HUB RENDER
  // -------------------------------------------------------------
  return (
    <AppLayout>
      <div className="space-y-8 pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-heading font-extrabold text-2xl md:text-3xl text-[#2F3542]">
              Quiz Center
            </h2>
            <p className="text-xs md:text-sm text-[#4B5563]">
              Interactive test engine with adaptive difficulty & AI feedback
            </p>
          </div>

          <button
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#E4ACB2] hover:bg-[#D69AA2] text-[#2F3542] font-bold text-xs md:text-sm shadow-sm transition-all shrink-0"
          >
            <Brain className="w-4.5 h-4.5 text-[#2F3542]" />
            <span>Generate Quiz with AI</span>
          </button>
        </div>

        {/* Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
          <div className="card-base rounded-3xl p-6 bg-white border border-[#E8E5DE] flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-[#F7E8EA] text-[#2F3542]">
              <Trophy className="w-6 h-6 text-[#2F3542]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#4B5563] uppercase tracking-wider">Quizzes Completed</p>
              <h3 className="font-heading font-bold text-2xl text-[#2F3542]">
                {stats.totalAttempts || 0}
              </h3>
            </div>
          </div>

          <div className="card-base rounded-3xl p-6 bg-white border border-[#E8E5DE] flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-[#F0F3E7] text-[#CCD5AE]">
              <Award className="w-6 h-6 text-[#2F3542]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#4B5563] uppercase tracking-wider">Average Score</p>
              <h3 className="font-heading font-bold text-2xl text-[#2F3542]">
                {stats.totalAttempts > 0 ? `${stats.averageScore}%` : "No Data"}
              </h3>
            </div>
          </div>

          <div className="card-base rounded-3xl p-6 bg-white border border-[#E8E5DE] flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-[#F0F3E7] text-[#AFC7A1]">
              <TrendingUp className="w-6 h-6 text-[#2F3542]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#4B5563] uppercase tracking-wider">Best Score</p>
              <h3 className="font-heading font-bold text-2xl text-[#2F3542]">
                {stats.totalAttempts > 0 ? `${stats.bestScore}%` : "No Data"}
              </h3>
            </div>
          </div>

          <div className="card-base rounded-3xl p-6 bg-white border border-[#E8E5DE] flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-[#F7E8EA] text-[#E4ACB2]">
              <Target className="w-6 h-6 text-[#2F3542]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#4B5563] uppercase tracking-wider">Adaptive Target</p>
              <h3 className="font-heading font-bold text-2xl text-[#2F3542]">
                {getRecommendedDifficulty()}
              </h3>
            </div>
          </div>
        </div>

        {/* PDF Study Material Upload Banner */}
        <div className="p-6 rounded-3xl bg-[#FAF8F3] border border-[#E8E5DE] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#F7E8EA] text-[#2F3542]">
              <FileText className="w-6 h-6 text-[#2F3542]" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base md:text-lg text-[#2F3542]">
                Turn your notes into practice quizzes ✨
              </h3>
              <p className="text-xs text-[#4B5563]">
                Upload PDF slides or textbooks for 100% source-grounded questions with 📖 View Source references
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowPdfUploadModal(true)}
            className="px-5 py-2.5 rounded-2xl bg-[#CCD5AE] hover:bg-[#B9C89A] text-[#2F3542] font-bold text-xs shadow-sm shrink-0 flex items-center gap-1.5"
          >
            <UploadCloud className="w-4 h-4 text-[#2F3542]" />
            <span>Upload PDF Notes</span>
          </button>
        </div>

        {/* Quizzes List & Recent Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Available Quizzes */}
          <div className="lg:col-span-2 card-base rounded-3xl p-6 md:p-8 bg-white border border-[#E8E5DE] space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-[#F7E8EA] text-[#E4ACB2]">
                  <HelpCircle className="w-5 h-5 text-[#2F3542]" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg text-[#2F3542]">
                    Available Practice Quizzes ({quizzes.length})
                  </h3>
                  <p className="text-xs text-[#4B5563]">Test your recall on active subjects & PDFs</p>
                </div>
              </div>
            </div>

            {quizzes.length > 0 ? (
              <div className="space-y-3">
                {quizzes.map((quiz) => (
                  <div
                    key={quiz._id}
                    className="p-5 rounded-2xl bg-white border border-[#E8E5DE] flex items-center justify-between gap-4 hover:shadow-md transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-[#2F3542] text-base">
                          {quiz.title}
                        </h4>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F7E8EA] text-[#2F3542] border border-[#E4ACB2]/40">
                          {quiz.difficulty}
                        </span>
                        {quiz.studyMaterial && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E4ACB2] text-[#2F3542]">
                            📄 PDF Grounded
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#4B5563]">
                        {quiz.questions?.length || 5} Questions • Topic: {quiz.topic || "General"}
                      </p>
                    </div>

                    <button
                      onClick={() => startQuizSession(quiz)}
                      className="px-4 py-2 rounded-xl bg-[#E4ACB2] hover:bg-[#D69AA2] text-[#2F3542] font-bold text-xs flex items-center gap-1.5 shadow-sm shrink-0"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start Quiz</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center space-y-3 bg-[#FAF8F3] rounded-2xl border border-dashed border-[#E8E5DE]">
                <HelpCircle className="w-8 h-8 text-[#667085] mx-auto" />
                <h4 className="font-heading font-semibold text-sm text-[#2F3542]">No Quizzes Generated Yet</h4>
                <p className="text-xs text-[#4B5563] max-w-xs mx-auto">
                  Click Generate Quiz with AI above to build your first multiple-choice quiz.
                </p>
              </div>
            )}
          </div>

          {/* Weak Topics & Adaptive Recommendations */}
          <div className="card-base rounded-3xl p-6 md:p-8 bg-white border border-[#E8E5DE] space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-[#F0F3E7] text-[#CCD5AE]">
                <Brain className="w-5 h-5 text-[#2F3542]" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-[#2F3542]">
                  Adaptive Learning Focus
                </h3>
                <p className="text-xs text-[#4B5563]">Identified weak topics</p>
              </div>
            </div>

            <div className="space-y-3">
              {(stats.weakTopics || []).length > 0 ? (
                (stats.weakTopics || []).map((wt, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-[#F7E8EA] border border-[#E4ACB2]/40 text-xs text-[#2F3542] flex justify-between items-center font-medium">
                    <span className="font-semibold">{wt.topic}</span>
                    <span className="font-bold text-[#2F3542]">{wt.avgPct}% avg</span>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-2xl bg-[#F0F3E7] border border-[#CCD5AE]/40 text-xs text-[#2F3542] font-medium">
                  Great job! No weak topics detected below 70% threshold.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Generate Quiz Modal */}
        {showConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
            <div className="relative w-full max-w-lg bg-white border border-[#E8E5DE] rounded-3xl p-6 md:p-8 shadow-2xl space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-bold text-lg text-[#2F3542] flex items-center gap-2">
                  <Brain className="w-5 h-5 text-[#E4ACB2]" />
                  Generate Quiz with AI
                </h3>
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="p-1.5 text-[#667085] hover:text-[#2F3542] rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Source Mode Selector Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#FAF8F3] rounded-2xl border border-[#E8E5DE]">
                <button
                  type="button"
                  onClick={() => setSourceMode("PDF")}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    sourceMode === "PDF"
                      ? "bg-white text-[#2F3542] shadow-sm border border-[#E8E5DE]"
                      : "text-[#4B5563] hover:text-[#2F3542]"
                  }`}
                >
                  📄 Uploaded PDF Document
                </button>
                <button
                  type="button"
                  onClick={() => setSourceMode("SUBJECT")}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    sourceMode === "SUBJECT"
                      ? "bg-white text-[#2F3542] shadow-sm border border-[#E8E5DE]"
                      : "text-[#4B5563] hover:text-[#2F3542]"
                  }`}
                >
                  📚 Subject Core Syllabus
                </button>
              </div>

              <form onSubmit={handleGenerateAiQuiz} className="space-y-4">
                {sourceMode === "PDF" ? (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-[#2F3542] block">
                        Select PDF Study Material
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPdfUploadModal(true)}
                        className="text-[11px] font-bold text-[#E4ACB2] hover:underline"
                      >
                        + Upload New PDF
                      </button>
                    </div>

                    {studyMaterials.length > 0 ? (
                      <select
                        value={selectedMaterialId}
                        onChange={(e) => {
                          const matId = e.target.value;
                          setSelectedMaterialId(matId);
                          const mat = studyMaterials.find((m) => m._id === matId);
                          if (mat && mat.detectedTopics && mat.detectedTopics.length > 0) {
                            setTopicInput(mat.detectedTopics[0].name);
                          }
                        }}
                        className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-4 py-2.5 text-xs md:text-sm text-[#2F3542] focus:outline-none focus:border-[#E4ACB2]"
                        required
                      >
                        {studyMaterials.map((m) => (
                          <option key={m._id} value={m._id}>
                            {m.fileName} ({m.pageCount} pages • {m.detectedTopics?.length || 0} topics)
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-4 rounded-xl bg-[#F7E8EA]/50 border border-[#E4ACB2]/40 text-center space-y-2">
                        <p className="text-xs text-[#2F3542] font-semibold">No uploaded PDF study materials found.</p>
                        <button
                          type="button"
                          onClick={() => setShowPdfUploadModal(true)}
                          className="px-4 py-1.5 rounded-xl bg-[#E4ACB2] text-[#2F3542] font-bold text-xs hover:bg-[#D69AA2]"
                        >
                          Upload PDF Document Now
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-semibold text-[#2F3542] block mb-1">
                      Select Subject
                    </label>
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => handleSubjectChange(e.target.value)}
                      className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-4 py-2.5 text-xs md:text-sm text-[#2F3542] focus:outline-none focus:border-[#E4ACB2]"
                      required
                    >
                      <option value="">Select Subject</option>
                      {subjects.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-[#2F3542] block mb-1">
                    Select Topic
                  </label>
                  {(() => {
                    let topicsList = [];
                    if (sourceMode === "PDF" && selectedMaterialId) {
                      const selectedMat = studyMaterials.find((m) => m._id === selectedMaterialId);
                      if (selectedMat && selectedMat.detectedTopics) {
                        topicsList = selectedMat.detectedTopics.map((t) => t.name);
                      }
                    } else {
                      const currentSub = subjects.find((s) => s._id === selectedSubjectId);
                      if (currentSub && Array.isArray(currentSub.topics)) {
                        topicsList = currentSub.topics.map((t) => t.name);
                      }
                    }

                    if (topicsList.length > 0) {
                      return (
                        <div className="space-y-2">
                          <select
                            value={topicInput}
                            onChange={(e) => setTopicInput(e.target.value)}
                            className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-4 py-2.5 text-xs md:text-sm text-[#2F3542] focus:outline-none focus:border-[#E4ACB2]"
                            required
                          >
                            <option value="All Topics">All Topics</option>
                            {topicsList.map((tName, idx) => (
                              <option key={idx} value={tName}>
                                {tName}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            placeholder="Or type a custom topic..."
                            value={topicInput}
                            onChange={(e) => setTopicInput(e.target.value)}
                            className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-4 py-2 text-xs text-[#2F3542] placeholder-[#667085] focus:outline-none focus:border-[#E4ACB2]"
                          />
                        </div>
                      );
                    }

                    return (
                      <input
                        type="text"
                        placeholder="e.g. Object Oriented Programming, Memory Management"
                        value={topicInput}
                        onChange={(e) => setTopicInput(e.target.value)}
                        className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-4 py-2.5 text-xs md:text-sm text-[#2F3542] placeholder-[#667085] focus:outline-none focus:border-[#E4ACB2]"
                        required
                      />
                    );
                  })()}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[#2F3542] block mb-1">
                      Difficulty Level
                    </label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-3.5 py-2.5 text-xs md:text-sm text-[#2F3542] focus:outline-none focus:border-[#E4ACB2]"
                    >
                      <option value="Easy">Easy (Recall & Definitions)</option>
                      <option value="Medium">Medium (Understanding & Application)</option>
                      <option value="Hard">Hard (Deep Reasoning & Analysis)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#2F3542] block mb-1">
                      Number of Questions
                    </label>
                    <select
                      value={questionCount}
                      onChange={(e) => setQuestionCount(e.target.value)}
                      className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-3.5 py-2.5 text-xs md:text-sm text-[#2F3542] focus:outline-none focus:border-[#E4ACB2]"
                    >
                      <option value={5}>5 Questions</option>
                      <option value={10}>10 Questions</option>
                      <option value={20}>20 Questions</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    className="px-4 py-2 text-xs font-medium text-[#4B5563] hover:text-[#2F3542]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={generating}
                    className="px-6 py-2.5 text-xs font-bold bg-[#CCD5AE] text-[#2F3542] rounded-xl hover:bg-[#B9C89A] shadow-sm transition-all"
                  >
                    {generating ? "Generating..." : "Generate & Start Quiz"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Source Reference Modal */}
        <ViewSourceModal
          isOpen={showViewSourceModal}
          onClose={() => setShowViewSourceModal(false)}
          sourceRef={activeSourceRef}
        />

        {/* Upload PDF Study Material Modal */}
        <PdfUploadModal
          isOpen={showPdfUploadModal}
          onClose={() => setShowPdfUploadModal(false)}
          subjects={subjects}
          onUploadSuccess={(newMat) => {
            fetchData();
            if (newMat) {
              setSelectedMaterialId(newMat._id);
              setSourceMode("PDF");
              setShowConfigModal(true);
            }
          }}
        />
      </div>
    </AppLayout>
  );
};

export default QuizCenter;
