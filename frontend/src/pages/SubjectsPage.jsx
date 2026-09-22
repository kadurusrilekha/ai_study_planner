import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import API from "../api";
import AppLayout from "../components/AppLayout";
import { useToast } from "../components/Toast";
import {
  BookOpen,
  Plus,
  TrendingUp,
  Clock,
  Award,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  ChevronRight,
  Layers,
  Calendar,
  Brain,
  HelpCircle,
  Flame,
  Check,
  Edit2
} from "lucide-react";

const SubjectsPage = () => {
  const [subjects, setSubjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals & Active Subject Dashboard
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeSubject, setActiveSubject] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // overview, topics, sessions, tasks, quizzes, flashcards, ai

  // Form states
  const [name, setName] = useState("");
  const [syllabus, setSyllabus] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [newTopicName, setNewTopicName] = useState("");
  const [newTopicProgress, setNewTopicProgress] = useState(0);

  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subjectsRes, tasksRes, schedulesRes] = await Promise.all([
        API.get("/subjects").catch(() => ({ data: [] })),
        API.get("/tasks").catch(() => ({ data: [] })),
        API.get("/schedule").catch(() => ({ data: [] }))
      ]);
      
      setSubjects(subjectsRes.data || []);
      setTasks(tasksRes.data || []);
      setSchedules(schedulesRes.data || []);
    } catch (err) {
      console.error("Failed to load subjects data", err);
      addToast("Failed to load subjects data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const defaultTopics = [
        { name: "Fundamentals & Syntax", progress: 100, completed: true },
        { name: "Core Concepts", progress: 60, completed: false },
        { name: "Advanced Patterns", progress: 25, completed: false }
      ];

      const res = await API.post("/subjects", {
        name,
        syllabus,
        priority,
        topics: []
      });

      setSubjects([res.data, ...subjects]);
      setName("");
      setSyllabus("");
      setShowAddModal(false);
      addToast("New subject added! 📚", "success");
    } catch (err) {
      addToast("Failed to add subject", "error");
    }
  };

  const handleAddTopic = async (e) => {
    e.preventDefault();
    if (!activeSubject || !newTopicName.trim()) return;

    const updatedTopics = [
      ...(activeSubject.topics || []),
      {
        name: newTopicName,
        progress: Number(newTopicProgress) || 0,
        completed: Number(newTopicProgress) >= 100
      }
    ];

    try {
      const res = await API.put(`/subjects/${activeSubject._id}`, {
        topics: updatedTopics
      });
      setActiveSubject(res.data);
      setSubjects(subjects.map((s) => (s._id === res.data._id ? res.data : s)));
      setNewTopicName("");
      setNewTopicProgress(0);
      addToast("Topic added to subject syllabus!", "success");
    } catch (err) {
      addToast("Failed to update topic", "error");
    }
  };

  const handleUpdateTopicProgress = async (topicIndex, newProgress) => {
    if (!activeSubject) return;

    const updatedTopics = [...activeSubject.topics];
    const isCompleted = newProgress >= 100;
    updatedTopics[topicIndex] = {
      ...updatedTopics[topicIndex],
      progress: Math.min(100, Math.max(0, newProgress)),
      completed: isCompleted
    };

    try {
      const res = await API.put(`/subjects/${activeSubject._id}`, {
        topics: updatedTopics
      });
      setActiveSubject(res.data);
      setSubjects(subjects.map((s) => (s._id === res.data._id ? res.data : s)));
      addToast(isCompleted ? "Topic mastered! 🎉" : "Progress saved", "success");
    } catch (err) {
      addToast("Failed to update progress", "error");
    }
  };

  const calculateOverallProgress = (sub) => {
    if (!sub.topics || sub.topics.length === 0) return 0;
    const total = sub.topics.reduce((acc, curr) => acc + (curr.progress || 0), 0);
    return Math.round(total / sub.topics.length);
  };

  const getRemainingTasksForSubject = (subId) => {
    return tasks.filter((t) => t.subject === subId || t.subject?._id === subId).length;
  };

  return (
    <AppLayout>
      <div className="space-y-8 pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-heading font-extrabold text-2xl md:text-3xl text-[#2F3542]">
              Subjects & Course Dashboards
            </h2>
            <p className="text-xs md:text-sm text-[#4B5563]">
              Interactive course cards, topic mastery breakdowns, and learning analytics
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#CCD5AE] hover:bg-[#B9C89A] text-[#2F3542] font-bold text-xs md:text-sm shadow-sm transition-all shrink-0"
          >
            <Plus className="w-4.5 h-4.5 text-[#2F3542]" />
            <span>Add New Subject</span>
          </button>
        </div>

        {/* Subjects Grid Cards */}
        {subjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjects.map((sub, idx) => {
              const progressPct = sub.masteryProgress !== undefined ? sub.masteryProgress : calculateOverallProgress(sub);
              const remainingTasksCount = sub.tasksPending !== undefined ? sub.tasksPending : getRemainingTasksForSubject(sub._id);
              const studyHoursText = sub.studyHours ? `${sub.studyHours} hrs` : "0 hrs";
              const quizAccuracyText = sub.quizAccuracy !== null && sub.quizAccuracy !== undefined ? `${sub.quizAccuracy}%` : "No quiz data";
              const nextSessionText = sub.nextSession || "No upcoming session";

              const cardAccents = ["#E4ACB2", "#CCD5AE", "#E4ACB2", "#CCD5AE"];
              const headerTintBgs = ["bg-[#F7E8EA]", "bg-[#F0F3E7]", "bg-[#F7E8EA]", "bg-[#F0F3E7]"];
              const cardAccent = cardAccents[idx % cardAccents.length];
              const headerBg = headerTintBgs[idx % headerTintBgs.length];

              return (
                <div
                  key={sub._id}
                  onClick={() => {
                    setActiveSubject(sub);
                    setActiveTab("overview");
                  }}
                  className="group card-base rounded-3xl space-y-4 cursor-pointer hover:shadow-lg hover:border-[#E4ACB2]/50 transition-all transform hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between bg-white border border-[#E8E5DE]"
                >
                  {/* Top Accent & Header Block */}
                  <div className={`p-6 pb-4 ${headerBg} border-b border-[#E8E5DE] relative`}>
                    <div
                      className="absolute top-0 left-0 right-0 h-1.5"
                      style={{ backgroundColor: cardAccent }}
                    />

                    <div className="flex justify-between items-start pt-1">
                      <div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white text-[#2F3542] border border-[#E8E5DE]">
                          {sub.priority || "Medium"} Priority
                        </span>
                        <h3 className="font-heading font-extrabold text-xl text-[#2F3542] mt-2 group-hover:text-[#D69AA2] transition-colors">
                          {sub.name}
                        </h3>
                      </div>

                      <div
                        className="w-10 h-10 rounded-2xl bg-white text-[#2F3542] flex items-center justify-center group-hover:scale-110 transition-all shadow-sm border"
                        style={{ borderColor: cardAccent }}
                      >
                        <ChevronRight className="w-5 h-5 text-[#2F3542]" />
                      </div>
                    </div>
                  </div>

                  {/* Body Content & Progress */}
                  <div className="p-6 pt-2 space-y-4">
                    {/* Progress bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-[#4B5563]">Mastery Progress</span>
                        <span className="text-[#2F3542] font-bold">{progressPct}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-[#FAF8F3] rounded-full overflow-hidden border border-[#E8E5DE]">
                        <div
                          className="h-full bg-[#E4ACB2] rounded-full transition-all duration-700"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Metrics Cards 2x2 Grid */}
                    <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                      <div className="p-3 rounded-2xl bg-[#FAF8F3] border border-[#E8E5DE]">
                        <span className="text-[#4B5563] text-[10px] font-bold block">Study Hours</span>
                        <span className="font-bold text-[#2F3542] flex items-center gap-1 mt-0.5">
                          <Clock className="w-3.5 h-3.5 text-[#E4ACB2]" /> {studyHoursText}
                        </span>
                      </div>

                      <div className="p-3 rounded-2xl bg-[#FAF8F3] border border-[#E8E5DE]">
                        <span className="text-[#4B5563] text-[10px] font-bold block">Quiz Accuracy</span>
                        <span className="font-bold text-[#2F3542] flex items-center gap-1 mt-0.5">
                          <Award className="w-3.5 h-3.5 text-[#CCD5AE]" /> {quizAccuracyText}
                        </span>
                      </div>

                      <div className="p-3 rounded-2xl bg-[#FAF8F3] border border-[#E8E5DE]">
                        <span className="text-[#4B5563] text-[10px] font-bold block">Tasks Pending</span>
                        <span className="font-bold text-[#2F3542] flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#E4ACB2]" /> {remainingTasksCount} tasks
                        </span>
                      </div>

                      <div className="p-3 rounded-2xl bg-[#FAF8F3] border border-[#E8E5DE]">
                        <span className="text-[#4B5563] text-[10px] font-bold block">Next Session</span>
                        <span className="font-bold text-[#2F3542] truncate block mt-0.5" title={nextSessionText}>
                          {nextSessionText}
                        </span>
                      </div>
                    </div>
                  </div>
              </div>
            );
          })}
          </div>
        ) : (
          <div className="py-16 text-center space-y-4 bg-[#FAF8F3] rounded-3xl border border-dashed border-[#E8E5DE]">
            <BookOpen className="w-10 h-10 text-[#667085] mx-auto" />
            <h3 className="font-heading font-bold text-lg text-[#2F3542]">No Subjects Created</h3>
            <p className="text-xs text-[#4B5563] max-w-sm mx-auto font-medium">
              Add your first subject to start tracking topic mastery, study hours, and AI recommendations.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-5 py-2.5 rounded-2xl bg-[#E4ACB2] hover:bg-[#D69AA2] text-[#2F3542] font-bold text-xs shadow-sm"
            >
              + Create First Subject
            </button>
          </div>
        )}

        {/* Modal 1: Add Subject Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in">
            <div className="relative w-full max-w-md bg-white border border-[#E8E5DE] rounded-3xl p-6 md:p-8 shadow-2xl space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-bold text-lg text-[#2F3542]">
                  Add New Subject
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 text-[#667085] hover:text-[#2F3542] rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSubject} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[#2F3542] block mb-1">
                    Subject Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Python Programming, Machine Learning"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-4 py-2.5 text-xs md:text-sm text-[#2F3542] placeholder-[#667085] font-semibold focus:outline-none focus:border-[#E4ACB2]"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#2F3542] block mb-1">
                    Syllabus / Notes
                  </label>
                  <textarea
                    placeholder="Brief outline of chapters or topics..."
                    value={syllabus}
                    onChange={(e) => setSyllabus(e.target.value)}
                    className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-4 py-2.5 text-xs md:text-sm text-[#2F3542] placeholder-[#667085] font-semibold focus:outline-none focus:border-[#E4ACB2]"
                    rows="3"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#2F3542] block mb-1">
                    Priority Level
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-4 py-2.5 text-xs md:text-sm text-[#2F3542] font-semibold focus:outline-none focus:border-[#E4ACB2]"
                  >
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs font-bold text-[#4B5563]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs font-bold bg-[#CCD5AE] text-[#2F3542] hover:bg-[#B9C89A] rounded-xl shadow-sm"
                  >
                    Save Subject
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 2: Comprehensive Subject Dashboard Drawer */}
        {activeSubject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-slate-950/60 backdrop-blur-md animate-in fade-in">
            <div className="relative w-full max-w-4xl max-h-[90vh] bg-white border border-[#E8E5DE] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
              {/* Drawer Top Header */}
              <div className="p-6 border-b border-[#E8E5DE] flex items-center justify-between bg-[#F7E8EA]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#E4ACB2] text-[#2F3542] flex items-center justify-center shadow-sm font-bold">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#4B5563]">
                      Subject Dashboard
                    </span>
                    <h3 className="font-heading font-extrabold text-2xl text-[#2F3542]">
                      {activeSubject.name}
                    </h3>
                  </div>
                </div>

                <button
                  onClick={() => setActiveSubject(null)}
                  className="p-2 text-[#667085] hover:text-[#2F3542] rounded-xl hover:bg-[#FAF8F3] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sub-navigation Tabs */}
              <div className="flex items-center gap-2 px-6 pt-3 overflow-x-auto border-b border-[#E8E5DE] select-none">
                {[
                  { id: "overview", label: "Overview" },
                  { id: "topics", label: "Topic Progress" },
                  { id: "sessions", label: "Study Sessions" },
                  { id: "tasks", label: "Tasks" },
                  { id: "quizzes", label: "Quiz Accuracy" },
                  { id: "flashcards", label: "Flashcards" },
                  { id: "ai", label: "AI Recommendations" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all whitespace-nowrap border-b-2 ${
                      activeTab === tab.id
                        ? "border-[#E4ACB2] text-[#2F3542] bg-[#F7E8EA]"
                        : "border-transparent text-[#667085] hover:text-[#2F3542]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Contents */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {/* TAB 1: OVERVIEW */}
                {activeTab === "overview" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div className="p-4 rounded-2xl bg-[#FAF8F3] border border-[#E8E5DE]">
                        <span className="text-xs text-[#4B5563] font-bold block">Overall Mastery</span>
                        <span className="font-heading font-bold text-2xl text-[#2F3542]">
                          {activeSubject.masteryProgress !== undefined ? activeSubject.masteryProgress : calculateOverallProgress(activeSubject)}%
                        </span>
                      </div>
                      <div className="p-4 rounded-2xl bg-[#FAF8F3] border border-[#E8E5DE]">
                        <span className="text-xs text-[#4B5563] font-bold block">Total Study Hours</span>
                        <span className="font-heading font-bold text-2xl text-[#2F3542]">
                          {activeSubject.studyHours ? `${activeSubject.studyHours} hrs` : "0 hrs"}
                        </span>
                      </div>
                      <div className="p-4 rounded-2xl bg-[#FAF8F3] border border-[#E8E5DE]">
                        <span className="text-xs text-[#4B5563] font-bold block">Quiz Performance</span>
                        <span className="font-heading font-bold text-2xl text-[#2F3542]">
                          {activeSubject.quizAccuracy !== null && activeSubject.quizAccuracy !== undefined ? `${activeSubject.quizAccuracy}%` : "No quiz data"}
                        </span>
                      </div>
                      <div className="p-4 rounded-2xl bg-[#FAF8F3] border border-[#E8E5DE]">
                        <span className="text-xs text-[#4B5563] font-bold block">Priority Level</span>
                        <span className="font-heading font-bold text-2xl text-[#2F3542]">
                          {activeSubject.priority || "Medium"}
                        </span>
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-[#F7E8EA] border border-[#E4ACB2]/30">
                      <h4 className="font-heading font-bold text-sm text-[#2F3542] mb-1">
                        Syllabus Overview
                      </h4>
                      <p className="text-xs text-[#4B5563] leading-relaxed font-medium">
                        {activeSubject.syllabus || "No additional syllabus notes added yet."}
                      </p>
                    </div>
                  </div>
                )}

                {/* TAB 2: TOPIC-LEVEL PROGRESS */}
                {activeTab === "topics" && (
                  <div className="space-y-6">
                    <form onSubmit={handleAddTopic} className="flex gap-3">
                      <input
                        type="text"
                        placeholder="Add new topic (e.g. Decorators, Multithreading)"
                        value={newTopicName}
                        onChange={(e) => setNewTopicName(e.target.value)}
                        className="flex-1 bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-4 py-2 text-xs md:text-sm text-[#2F3542] placeholder-[#667085] font-semibold focus:outline-none focus:border-[#E4ACB2]"
                        required
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Initial %"
                        value={newTopicProgress}
                        onChange={(e) => setNewTopicProgress(e.target.value)}
                        className="w-24 bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-3 py-2 text-xs md:text-sm text-[#2F3542] placeholder-[#667085] font-semibold focus:outline-none focus:border-[#E4ACB2]"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-[#E4ACB2] hover:bg-[#D69AA2] text-[#2F3542] font-bold text-xs shadow-sm"
                      >
                        + Add Topic
                      </button>
                    </form>

                    <div className="space-y-3">
                      {(activeSubject.topics || []).map((t, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl bg-[#FAF8F3] border border-[#E8E5DE] space-y-2"
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              {t.progress >= 100 ? (
                                <CheckCircle2 className="w-4.5 h-4.5 text-[#2F3542] shrink-0" />
                              ) : (
                                <span className="w-2 h-2 rounded-full bg-[#E4ACB2] shrink-0" />
                              )}
                              <span className={`font-bold text-sm ${t.progress >= 100 ? "line-through text-[#667085]" : "text-[#2F3542]"}`}>
                                {t.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[#2F3542]">
                                {t.progress}%
                              </span>
                              <div className="flex gap-1">
                                {[25, 50, 75, 100].map((step) => (
                                  <button
                                    key={step}
                                    onClick={() => handleUpdateTopicProgress(idx, step)}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                                      t.progress === step
                                        ? "bg-[#E4ACB2] text-[#2F3542]"
                                        : "bg-[#E8E5DE] text-[#4B5563] hover:bg-[#E4ACB2] hover:text-[#2F3542]"
                                    }`}
                                  >
                                    {step}%
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="w-full h-2 bg-[#E8E5DE] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#E4ACB2] rounded-full transition-all duration-500"
                              style={{ width: `${t.progress}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 3: STUDY SESSIONS */}
                {activeTab === "sessions" && (
                  <div className="space-y-4">
                    <p className="text-xs text-[#4B5563] font-medium">Recorded and scheduled study sessions for this subject:</p>
                    {schedules.filter((s) => s.subject === activeSubject._id || s.subject?._id === activeSubject._id).length > 0 ? (
                      <div className="space-y-2">
                        {schedules
                          .filter((s) => s.subject === activeSubject._id || s.subject?._id === activeSubject._id)
                          .map((s) => (
                            <div key={s._id} className="p-3.5 rounded-xl bg-[#FAF8F3] border border-[#E8E5DE] flex justify-between items-center text-xs font-semibold">
                              <div>
                                <span className="font-bold text-[#2F3542]">{s.day} at {s.time}</span>
                                <span className="text-[#4B5563] block">{s.topic || "General Focus"} • {s.duration || 1} hrs</span>
                              </div>
                              <span className="px-2.5 py-1 rounded-full bg-[#F0F3E7] text-[#2F3542] font-bold text-[10px] border border-[#CCD5AE]">
                                {s.type || "Study"}
                              </span>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#667085] italic font-medium">No scheduled sessions for this subject yet.</p>
                    )}
                  </div>
                )}

                {/* TAB 4: TASKS */}
                {activeTab === "tasks" && (
                  <div className="space-y-3">
                    {tasks.filter((t) => t.subject === activeSubject._id || t.subject?._id === activeSubject._id).length > 0 ? (
                      tasks
                        .filter((t) => t.subject === activeSubject._id || t.subject?._id === activeSubject._id)
                        .map((t) => (
                          <div key={t._id} className="p-3.5 rounded-xl bg-[#FAF8F3] border border-[#E8E5DE] flex justify-between items-center text-xs font-semibold">
                            <span className="font-bold text-[#2F3542]">{t.title}</span>
                            <span className="px-2 py-0.5 rounded-full bg-[#E7D59A] text-[#2F3542] text-[10px] font-bold">
                              {t.status || "Pending"}
                            </span>
                          </div>
                        ))
                    ) : (
                      <p className="text-xs text-[#667085] italic font-medium">No tasks mapped to this subject.</p>
                    )}
                  </div>
                )}

                {/* TAB 5 & 6: QUIZZES & FLASHCARDS */}
                {(activeTab === "quizzes" || activeTab === "flashcards") && (
                  <div className="py-12 text-center space-y-3 bg-[#FAF8F3] rounded-2xl border border-dashed border-[#E8E5DE]">
                    <Sparkles className="w-8 h-8 text-[#E4ACB2] mx-auto" />
                    <h4 className="font-heading font-bold text-sm text-[#2F3542] capitalize">
                      {activeTab} Analytics Module
                    </h4>
                    <p className="text-xs text-[#4B5563] max-w-xs mx-auto font-medium">
                      AI-generated quizzes and flashcards for {activeSubject.name} will sync in the upcoming learning pack release!
                    </p>
                  </div>
                )}

                {/* TAB 7: AI RECOMMENDATIONS */}
                {activeTab === "ai" && (
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-[#F7E8EA] border border-[#E4ACB2]/30 text-xs text-[#2F3542] space-y-2 font-medium">
                      <div className="flex items-center gap-2 font-bold text-[#2F3542]">
                        <Brain className="w-4 h-4 text-[#E4ACB2]" /> AI Recommendation Engine
                      </div>
                      <p className="text-[#4B5563]">
                        Based on your topic progress in <strong className="text-[#2F3542]">{activeSubject.name}</strong>, spend your next 25-minute focus session reviewing weaker topics to ensure high long-term memory retention.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default SubjectsPage;
