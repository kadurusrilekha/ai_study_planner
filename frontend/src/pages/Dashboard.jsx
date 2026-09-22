import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import API from "../api";
import AppLayout from "../components/AppLayout";
import GamificationModal from "../components/GamificationModal";
import { useToast } from "../components/Toast";
import {
  Sparkles,
  Clock,
  CheckCircle2,
  Circle,
  Plus,
  ArrowRight,
  BookOpen,
  Calendar,
  Award,
  Trophy,
  TrendingUp,
  Brain,
  Zap,
  Target,
  ChevronRight,
  Play,
  RotateCcw,
  AlertCircle
} from "lucide-react";

const Dashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [progress, setProgress] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Forms & Modals
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [subjectSyllabus, setSubjectSyllabus] = useState("");
  const [activeFocusTask, setActiveFocusTask] = useState(null);
  const [focusModalOpen, setFocusModalOpen] = useState(false);
  const [gamification, setGamification] = useState({ xp: 0, level: 1, achievements: [] });
  const [showGamificationModal, setShowGamificationModal] = useState(false);

  const { addToast } = useToast();
  const navigate = useNavigate();
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || {};
    } catch (e) {
      return {};
    }
  })();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      const [tasksRes, subjectsRes, progressRes, scheduleRes, examsRes, gamificationRes] = await Promise.all([
        API.get("/tasks").catch(() => ({ data: [] })),
        API.get("/subjects").catch(() => ({ data: [] })),
        API.get("/progress").catch(() => ({ data: [] })),
        API.get("/schedule").catch(() => ({ data: [] })),
        API.get("/exams").catch(() => ({ data: [] })),
        API.get("/gamification").catch(() => ({ data: {} }))
      ]);

      setTasks(tasksRes.data || []);
      setSubjects(subjectsRes.data || []);
      setProgress(progressRes.data || []);
      setSchedules(scheduleRes.data || []);
      setExams(examsRes.data || []);
      setGamification(gamificationRes.data || {});
    } catch (err) {
      console.error("Dashboard load error:", err);
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/");
      } else {
        setError(`Failed to load data: ${err.response?.data?.error || err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    try {
      const res = await API.post("/tasks", { title: taskTitle });
      setTasks([res.data, ...tasks]);
      setTaskTitle("");
      setShowTaskForm(false);
      addToast("Task created successfully! 🎯", "success");
    } catch (err) {
      addToast("Failed to create task", "error");
    }
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!subjectName.trim()) return;

    try {
      const res = await API.post("/subjects", { name: subjectName, syllabus: subjectSyllabus });
      setSubjects([res.data, ...subjects]);
      setSubjectName("");
      setSubjectSyllabus("");
      setShowSubjectForm(false);
      addToast("Subject added successfully! 📚", "success");
    } catch (err) {
      addToast("Failed to add subject", "error");
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await API.delete(`/tasks/${taskId}`);
      setTasks(tasks.filter((t) => t._id !== taskId));
      await API.post("/gamification/award-xp", { actionType: "task_completed", activityId: taskId }).catch(() => {});
      const freshGamification = await API.get("/gamification").catch(() => ({ data: {} }));
      setGamification(freshGamification.data || {});
      addToast("Task marked complete!", "success");
    } catch (err) {
      addToast("Failed to delete task", "error");
    }
  };

  // Smart calculation of Today's Focus Item from real user data
  const getTodayFocusItem = () => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const todayDayName = now.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();

    const getSafeIsoDate = (dateVal) => {
      if (!dateVal) return "";
      try {
        const d = new Date(dateVal);
        return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
      } catch (e) {
        return "";
      }
    };

    // 1. Check Schedules for today's incomplete session
    const todaySchedules = schedules.filter((s) => {
      if (s.completed) return false;
      const dateStr = getSafeIsoDate(s.date);
      const dayMatch = s.day ? s.day.toLowerCase() === todayDayName : false;
      return dateStr === todayStr || dayMatch;
    });

    if (todaySchedules.length > 0) {
      const sch = todaySchedules[0];
      const subjName = sch.subject?.name || "Subject";
      return {
        _id: sch._id,
        isSchedule: true,
        title: `${subjName}: ${sch.topic || "Study Session"}`,
        topic: sch.topic,
        subjectName: subjName,
        type: sch.type || "Study"
      };
    }

    // 2. Check Tasks for today's incomplete task
    const todayTasks = tasks.filter((t) => {
      if (t.status === "Completed") return false;
      const taskDateStr = getSafeIsoDate(t.dueDate) || getSafeIsoDate(t.date);
      return taskDateStr === todayStr;
    });

    if (todayTasks.length > 0) {
      const t = todayTasks[0];
      return {
        _id: t._id,
        isTask: true,
        title: t.title,
        topic: t.topic || t.title,
        subjectName: t.subject?.name || "General"
      };
    }

    // 3. Check any pending task in queue
    const pending = tasks.filter((t) => t.status !== "Completed");
    if (pending.length > 0) {
      const t = pending[0];
      return {
        _id: t._id,
        isTask: true,
        title: t.title,
        topic: t.topic || t.title,
        subjectName: t.subject?.name || "General"
      };
    }

    // 4. Check uncompleted topic from subjects
    for (const subj of subjects) {
      const uncompletedTopic = (subj.topics || []).find((tp) => !tp.completed);
      if (uncompletedTopic) {
        return {
          isSubjectTopic: true,
          title: `${subj.name}: ${uncompletedTopic.name}`,
          topic: uncompletedTopic.name,
          subjectName: subj.name
        };
      }
    }

    return null;
  };

  const todayFocusItem = getTodayFocusItem();

  const handleStartFocus = (item) => {
    const focusTarget = item || todayFocusItem;
    if (!focusTarget) return;
    setActiveFocusTask(focusTarget);
    setFocusModalOpen(true);
  };

  const handleCompleteFocusTask = async (task) => {
    try {
      const activityId = task?._id || `focus-${Date.now()}`;
      if (task && task.isSchedule && task._id) {
        await API.put(`/schedule/${task._id}`, { completed: true });
        setSchedules(schedules.map((s) => (s._id === task._id ? { ...s, completed: true } : s)));
        await API.post("/gamification/award-xp", { actionType: "session_completed", activityId }).catch(() => {});
        addToast("Today's Focus session completed! 🎉", "success");
      } else if (task && task._id) {
        await API.put(`/tasks/${task._id}`, { status: "Completed" });
        setTasks(tasks.map((t) => (t._id === task._id ? { ...t, status: "Completed" } : t)));
        await API.post("/gamification/award-xp", { actionType: "task_completed", activityId }).catch(() => {});
        addToast("Focus task marked completed! 🎉", "success");
      } else {
        await API.post("/gamification/award-xp", { actionType: "session_completed", activityId }).catch(() => {});
        addToast("Focus session complete!", "success");
      }
      const freshGamification = await API.get("/gamification").catch(() => ({ data: {} }));
      setGamification(freshGamification.data || {});
    } catch (err) {
      console.error("Error completing focus task:", err);
      addToast("Session finished!", "info");
    } finally {
      setFocusModalOpen(false);
    }
  };

  // Calculations for Dynamic UI & Smart Recommendation Engine
  const completedTopics = progress.filter((p) => p.completed).length;
  const totalTopics = progress.length;
  const completionPercentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
  const pendingTasks = tasks.filter((t) => t.status !== "Completed");

  // Time based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  // Dynamic Smart Recommendations based on real DB data
  const getSmartRecommendations = () => {
    const recs = [];

    // Check upcoming exams
    if (exams.length > 0) {
      const nearestExam = exams[0];
      recs.push({
        icon: Target,
        color: "text-rose-500",
        title: "Upcoming Exam Target",
        text: `Your ${nearestExam.title || "Subject"} exam is approaching! Schedule a revision block.`
      });
    }

    // Check pending tasks
    if (pendingTasks.length > 0) {
      recs.push({
        icon: AlertCircle,
        title: "Action Item",
        text: `You have ${pendingTasks.length} pending task(s). Clear high-priority items to maintain momentum.`
      });
    }

    // Check low completion topics
    const uncompletedTopics = progress.filter((p) => !p.completed);
    if (uncompletedTopics.length > 0) {
      const topicName = uncompletedTopics[0].topic;
      recs.push({
        icon: Brain,
        title: "Topic Focus",
        text: `Revise "${topicName}" today to boost topic retention.`
      });
    } else if (subjects.length > 0) {
      recs.push({
        icon: Sparkles,
        title: "Subject Velocity",
        text: `Consistent daily focus in ${subjects[0].name} is driving your study consistency.`
      });
    }

    return recs;
  };

  const smartRecs = getSmartRecommendations();

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="h-44 rounded-3xl skeleton" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-64 rounded-2xl skeleton" />
            <div className="h-64 rounded-2xl skeleton" />
            <div className="h-64 rounded-2xl skeleton" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      activeTask={activeFocusTask}
      isFocusModalOpen={focusModalOpen}
      onCloseFocusModal={() => setFocusModalOpen(false)}
      onCompleteTask={handleCompleteFocusTask}
    >
      <div className="space-y-8 pb-8">
        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
            <button
              onClick={fetchDashboardData}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-[#F7E8EA] text-[#2F3542] p-8 md:p-10 shadow-sm border border-[#E8E5DE]">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#E4ACB2]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-[#CCD5AE]/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2">
                <span
                  onClick={() => setShowGamificationModal(true)}
                  className="px-3 py-1 rounded-full text-xs font-bold bg-[#F0F3E7] hover:bg-[#E4ACB2]/30 transition-all cursor-pointer text-[#2F3542] border border-[#CCD5AE]/40 flex items-center gap-1.5 transform hover:scale-105 active:scale-95"
                  title="View Level & Achievements"
                >
                  <Trophy className="w-3.5 h-3.5 text-[#2F3542]" />
                  Level {gamification.level || 1} Scholar • {gamification.xp || 0} XP
                </span>
                <span className="text-xs text-[#2F3542] font-bold">
                  • {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>

              <h2 className="font-heading text-3xl md:text-4xl font-black tracking-tight text-[#2F3542]">
                {getGreeting()}, <span className="text-[#2F3542] underline decoration-[#E4ACB2] decoration-4">{user.name || "Student"}</span> 👋
              </h2>

              <p className="text-[#4B5563] text-sm md:text-base leading-relaxed font-semibold">
                Ready to make today count? Focus on deep structured learning to earn XP and level up.
              </p>
            </div>

            {/* Prominent Start Today's Focus Button or Empty State */}
            <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-3 shrink-0">
              {todayFocusItem ? (
                <button
                  onClick={() => handleStartFocus(todayFocusItem)}
                  className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-[#E4ACB2] hover:bg-[#D69AA2] text-[#2F3542] font-bold text-sm shadow-sm transition-all transform hover:scale-[1.03] active:scale-[0.98] flex items-center justify-center gap-2.5 group"
                >
                  <Sparkles className="w-5 h-5 text-[#2F3542] group-hover:rotate-12 transition-transform" />
                  <span>Start Today's Focus ({todayFocusItem.topic || todayFocusItem.title})</span>
                  <ArrowRight className="w-4 h-4 text-[#2F3542] group-hover:translate-x-1 transition-transform" />
                </button>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="text-xs font-bold text-[#4B5563] bg-white/70 px-4 py-2.5 rounded-2xl border border-[#E8E5DE] flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#E4ACB2]" />
                    <span>No study sessions scheduled for today.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate("/ai-planner")}
                      className="px-4 py-2.5 rounded-2xl bg-[#E4ACB2] hover:bg-[#D69AA2] text-[#2F3542] font-bold text-xs transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <Brain className="w-4 h-4" /> Build My Study Plan
                    </button>
                    <button
                      onClick={() => navigate("/study-schedule")}
                      className="px-4 py-2.5 rounded-2xl bg-[#F0F3E7] hover:bg-[#CCD5AE] text-[#2F3542] font-bold text-xs transition-all border border-[#CCD5AE] flex items-center gap-1.5"
                    >
                      <Calendar className="w-4 h-4" /> View Schedule
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 text-xs font-bold text-[#4B5563]">
                <span>Completed Topics: <strong className="text-[#2F3542]">{completedTopics}</strong></span>
                <span>•</span>
                <span>Goal: <strong className="text-[#2F3542]">{completionPercentage}%</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Smart Recommendations Layer */}
        <div className="card-base rounded-3xl p-6 md:p-7 space-y-4 bg-[#F0F3E7] border border-[#CCD5AE]/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-[#CCD5AE] text-[#2F3542]">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-[#2F3542] flex items-center gap-2">
                  Smart Recommendations
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E4ACB2]/30 text-[#2F3542] border border-[#E4ACB2]/40 uppercase tracking-widest">
                    Data-Driven
                  </span>
                </h3>
                <p className="text-xs text-[#4B5563] font-medium">Personalized study advice based on your real progress</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {smartRecs.map((rec, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-white border border-[#E8E5DE] space-y-2 shadow-sm"
              >
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#D69AA2]">
                  {rec.title}
                </span>
                <p className="text-xs text-[#2F3542] font-semibold leading-relaxed">
                  {rec.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Grid Section 1: Today's Focus & Daily Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Focus Card */}
          <div className="lg:col-span-2 card-base rounded-3xl p-6 md:p-7 space-y-5 bg-white border border-[#E8E5DE]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-[#F7E8EA] text-[#E4ACB2]">
                  <Target className="w-5 h-5 text-[#2F3542]" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg text-[#2F3542]">
                    Today's Focus ({tasks.length})
                  </h3>
                  <p className="text-xs text-[#4B5563] font-medium">Prioritized study tasks for today</p>
                </div>
              </div>

              <button
                onClick={() => setShowTaskForm(!showTaskForm)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#E4ACB2] hover:bg-[#D69AA2] text-[#2F3542] text-xs font-bold transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Task</span>
              </button>
            </div>

            {/* Task Form expander */}
            {showTaskForm && (
              <form onSubmit={handleAddTask} className="p-4 rounded-2xl bg-[#FAF8F3] border border-[#E8E5DE] space-y-3 animate-in fade-in">
                <input
                  type="text"
                  placeholder="Enter task title (e.g. Master Binary Search Trees)"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full bg-white border border-[#E8E5DE] rounded-xl px-4 py-2.5 text-sm font-semibold text-[#2F3542] focus:outline-none focus:border-[#E4ACB2] placeholder-[#667085]"
                  required
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTaskForm(false)}
                    className="px-3 py-1.5 text-xs text-[#4B5563] font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold bg-[#E4ACB2] text-[#2F3542] rounded-xl hover:bg-[#D69AA2] transition-colors"
                  >
                    Save Task
                  </button>
                </div>
              </form>
            )}

            {/* Task list */}
            {tasks.length > 0 ? (
              <div className="space-y-3">
                {tasks.map((task, idx) => (
                  <div
                    key={task._id}
                    className="group p-4 rounded-2xl bg-[#FAF8F3] border border-[#E8E5DE] flex items-center justify-between gap-4 hover:shadow-md hover:border-[#E4ACB2]/40 transition-all"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-[#F7E8EA] text-[#2F3542] flex items-center justify-center font-bold text-xs shrink-0">
                        #{idx + 1}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-[#2F3542] text-sm truncate">
                          {task.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-[#4B5563] mt-0.5 font-medium">
                          <span className="px-2 py-0.5 rounded-full bg-[#F0F3E7] text-[10px] font-bold text-[#2F3542] border border-[#CCD5AE]">
                            {task.priority || "High"} Priority
                          </span>
                          <span>• 25m Focus Block</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleStartFocus(task)}
                        className="px-3 py-1.5 rounded-xl bg-[#E4ACB2] text-[#2F3542] font-bold text-xs hover:bg-[#D69AA2] transition-all flex items-center gap-1 shadow-sm"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span className="hidden sm:inline">Start</span>
                      </button>

                      <button
                        onClick={() => handleDeleteTask(task._id)}
                        className="p-1.5 text-[#4B5563] hover:text-[#AFC7A1] rounded-lg hover:bg-white transition-colors"
                        title="Mark Complete"
                      >
                        <CheckCircle2 className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center space-y-3 bg-[#FAF8F3] rounded-2xl border border-dashed border-[#E8E5DE]">
                <CheckCircle2 className="w-6 h-6 text-[#AFC7A1] mx-auto" />
                <h4 className="font-heading font-bold text-sm text-[#2F3542]">All Tasks Completed!</h4>
                <p className="text-xs text-[#4B5563] max-w-xs mx-auto font-medium">
                  No focus tasks scheduled. Add a new task to maintain your momentum.
                </p>
              </div>
            )}
          </div>

          {/* Daily Progress Visualization Card */}
          <div className="card-base rounded-3xl p-6 md:p-7 bg-white border border-[#E8E5DE] flex flex-col justify-between space-y-6">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-[#F0F3E7] text-[#CCD5AE]">
                <TrendingUp className="w-5 h-5 text-[#2F3542]" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-[#2F3542]">
                  Daily Progress
                </h3>
                <p className="text-xs text-[#4B5563] font-medium">Topics & goal breakdown</p>
              </div>
            </div>

            {/* Circular SVG Ring */}
            <div className="flex flex-col items-center justify-center my-2">
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="text-[#E8E5DE] stroke-current"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="text-[#E4ACB2] stroke-current transition-all duration-1000 ease-out"
                    strokeWidth="8"
                    strokeDasharray={251}
                    strokeDashoffset={251 - (251 * completionPercentage) / 100}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-heading font-black text-3xl text-[#2F3542]">
                    {completionPercentage}%
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563] mt-0.5">
                    Completed
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#E8E5DE] text-center">
              <div className="p-3 rounded-2xl bg-[#FAF8F3]">
                <span className="text-xs text-[#4B5563] font-bold block">Completed</span>
                <span className="font-heading font-bold text-lg text-[#2F3542]">
                  {completedTopics}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[#FAF8F3]">
                <span className="text-xs text-[#4B5563] font-bold block">Total Topics</span>
                <span className="font-heading font-bold text-lg text-[#2F3542]">
                  {totalTopics}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gamification & Badges Modal */}
      <GamificationModal
        isOpen={showGamificationModal}
        onClose={() => setShowGamificationModal(false)}
        stats={gamification}
      />
    </AppLayout>
  );
};

export default Dashboard;