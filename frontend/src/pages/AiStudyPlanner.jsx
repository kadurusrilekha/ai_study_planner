import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import API from "../api";
import AppLayout from "../components/AppLayout";
import { useToast } from "../components/Toast";
import {
  Brain,
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  Edit2,
  Trash2,
  Save,
  RotateCcw,
  ArrowRight,
  Zap,
  BookOpen,
  Award,
  Layers
} from "lucide-react";

const AiStudyPlanner = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form Inputs
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [topicsInput, setTopicsInput] = useState("");
  const [examDate, setExamDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split("T")[0];
  });
  const [dailyHours, setDailyHours] = useState("3");
  const [currentProgress, setCurrentProgress] = useState("0");
  const [difficulty, setDifficulty] = useState("Intermediate");
  const [priority, setPriority] = useState("High");
  const [preferredTime, setPreferredTime] = useState("Evening");

  // Generated Plan State for Review -> Edit -> Save Workflow
  const [generatedPlan, setGeneratedPlan] = useState(null);

  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const res = await API.get("/subjects").catch(() => ({ data: [] }));
      const userSubjects = res.data || [];
      setSubjects(userSubjects);
      if (userSubjects.length > 0) {
        setSelectedSubjects(userSubjects.map((s) => s.name));
        const allTopics = userSubjects.flatMap((s) => (s.topics || []).map((t) => t.name)).filter(Boolean);
        if (allTopics.length > 0) {
          setTopicsInput(allTopics.join(", "));
        }
      } else {
        setSelectedSubjects([]);
        setTopicsInput("");
      }
    } catch (err) {
      console.error("Failed to fetch subjects", err);
    }
  };

  const handleGeneratePlan = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await API.post("/ai/generate-plan", {
        subjectNames: selectedSubjects,
        topics: topicsInput,
        examDate,
        dailyHours: Number(dailyHours) || 3,
        difficulty,
        priority,
        preferredTime
      });

      if (res.data && res.data.success && Array.isArray(res.data.plan)) {
        setGeneratedPlan(res.data.plan);
        addToast("AI Study Plan generated! Review & edit below.", "success");
      } else {
        addToast(res.data?.error || "Failed to generate study plan.", "error");
      }
    } catch (err) {
      console.error("AI Plan Generation error details:", err.response?.data || err.message);
      const serverMsg = err.response?.data?.error;
      addToast(serverMsg || "Unable to generate your study plan right now. Please check your study details and try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEditItem = (index, field, value) => {
    if (!generatedPlan) return;
    const updated = [...generatedPlan];
    updated[index] = { ...updated[index], [field]: value };
    setGeneratedPlan(updated);
  };

  const handleDeleteItem = (index) => {
    if (!generatedPlan) return;
    setGeneratedPlan(generatedPlan.filter((_, i) => i !== index));
    addToast("Session item removed from review", "info");
  };

  const handleSavePlanToSchedule = async () => {
    if (!generatedPlan || generatedPlan.length === 0) return;
    setSaving(true);

    try {
      // Map generated sessions to Backend Schedule format with Subject ObjectId reference
      const sessionsToSave = generatedPlan.map((item) => {
        const matchedSub = subjects.find(
          (s) => s.name.toLowerCase() === (item.subjectName || "").toLowerCase()
        );
        return {
          subject: matchedSub ? matchedSub._id : undefined,
          topic: item.topic,
          day: item.day,
          date: item.date,
          time: item.startTime,
          startTime: item.startTime,
          endTime: item.endTime,
          duration: Number(item.duration) || 1.5,
          priority: item.priority || "High",
          type: item.type || "Study",
          notes: item.notes || "AI Generated Study Session"
        };
      });

      const res = await API.post("/schedule/batch", { sessions: sessionsToSave });

      if (res.data && res.data.success) {
        addToast(`Saved ${res.data.count} sessions to your Study Schedule! 🎉`, "success");
        navigate("/study-schedule");
      }
    } catch (err) {
      console.error("Error saving AI plan:", err);
      addToast("Failed to save plan to schedule", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8 pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#E4ACB2] text-[#2F3542] flex items-center justify-center shadow-sm font-bold">
              <Brain className="w-6 h-6 text-[#2F3542]" />
            </div>
            <div>
              <h2 className="font-heading font-extrabold text-2xl md:text-3xl text-[#2F3542]">
                Build My Study Plan with AI
              </h2>
              <p className="text-xs md:text-sm text-[#4B5563]">
                Personalized study schedules powered by exam targets and learning pace
              </p>
            </div>
          </div>
        </div>

        {/* Generator Input Form */}
        <div className="card-base rounded-3xl p-6 md:p-8 space-y-6 bg-[#F7E8EA] border border-[#E4ACB2]/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-[#E4ACB2] text-[#2F3542]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-[#2F3542]">
                Step 1: Input Your Study Parameters
              </h3>
              <p className="text-xs text-[#4B5563]">Specify exam date, daily available time, and difficulty</p>
            </div>
          </div>

          <form onSubmit={handleGeneratePlan} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#2F3542] block mb-1">
                  Subjects to Include (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Data Structures, SQL, Machine Learning"
                  value={selectedSubjects.join(", ")}
                  onChange={(e) =>
                    setSelectedSubjects(
                      e.target.value.split(",").map((s) => s.trim())
                    )
                  }
                  className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-4 py-2.5 text-xs md:text-sm text-[#2F3542] placeholder-[#667085] font-semibold focus:outline-none focus:border-[#E4ACB2]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#2F3542] block mb-1">
                  Key Topics / Syllabus Breakdown
                </label>
                <input
                  type="text"
                  placeholder="e.g. Binary Trees, Joins, Neural Networks"
                  value={topicsInput}
                  onChange={(e) => setTopicsInput(e.target.value)}
                  className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-4 py-2.5 text-xs md:text-sm text-[#2F3542] placeholder-[#667085] font-semibold focus:outline-none focus:border-[#E4ACB2]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#2F3542] block mb-1">
                  Upcoming Exam Date
                </label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-3.5 py-2.5 text-xs md:text-sm text-[#2F3542] font-semibold focus:outline-none focus:border-[#E4ACB2]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#2F3542] block mb-1">
                  Available Study Hours / Day
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={dailyHours}
                  onChange={(e) => setDailyHours(e.target.value)}
                  className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-3.5 py-2.5 text-xs md:text-sm text-[#2F3542] font-semibold focus:outline-none focus:border-[#E4ACB2]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#2F3542] block mb-1">
                  Target Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-3.5 py-2.5 text-xs md:text-sm text-[#2F3542] font-semibold focus:outline-none focus:border-[#E4ACB2]"
                >
                  <option value="Beginner">Beginner (Foundations)</option>
                  <option value="Intermediate">Intermediate (Balanced)</option>
                  <option value="Advanced">Advanced (Intensive)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#2F3542] block mb-1">
                  Preferred Time Slot
                </label>
                <select
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-3.5 py-2.5 text-xs md:text-sm text-[#2F3542] font-semibold focus:outline-none focus:border-[#E4ACB2]"
                >
                  <option value="Morning">Morning (8 AM - 12 PM)</option>
                  <option value="Afternoon">Afternoon (1 PM - 5 PM)</option>
                  <option value="Evening">Evening (6 PM - 10 PM)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-[#E4ACB2] hover:bg-[#D69AA2] text-[#2F3542] font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Sparkles className="w-5 h-5 animate-spin" /> Generating Personalized AI Plan...
                </>
              ) : (
                <>
                  <Brain className="w-5 h-5" /> Generate My AI Study Plan
                </>
              )}
            </button>
          </form>
        </div>

        {/* Step 2: Review -> Edit -> Save Workflow Table */}
        {generatedPlan && (
          <div className="card-base rounded-3xl p-6 md:p-8 space-y-6 bg-white border border-[#E8E5DE] animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E5DE]">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-[#F0F3E7] text-[#2F3542]">
                  <CheckCircle2 className="w-5 h-5 text-[#2F3542]" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg text-[#2F3542]">
                    Step 2: Review & Edit AI Generated Plan ({generatedPlan.length} sessions)
                  </h3>
                  <p className="text-xs text-[#4B5563]">
                    Review generated schedule items below, edit any topic or time, then click Save.
                  </p>
                </div>
              </div>

              <button
                onClick={handleSavePlanToSchedule}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#CCD5AE] hover:bg-[#B9C89A] text-[#2F3542] font-bold text-xs md:text-sm shadow-sm transition-all shrink-0"
              >
                <Save className="w-4.5 h-4.5 text-[#2F3542]" />
                <span>{saving ? "Saving to Schedule..." : "Save Plan to My Schedule"}</span>
              </button>
            </div>

            {/* Generated Sessions Review Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-medium">
                <thead>
                  <tr className="border-b border-[#E8E5DE] text-[#4B5563] uppercase tracking-wider font-bold">
                    <th className="pb-3 px-2">Date / Day</th>
                    <th className="pb-3 px-2">Subject</th>
                    <th className="pb-3 px-2">Topic</th>
                    <th className="pb-3 px-2">Activity Type</th>
                    <th className="pb-3 px-2">Time Slot</th>
                    <th className="pb-3 px-2">Priority</th>
                    <th className="pb-3 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E5DE]">
                  {generatedPlan.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#FAF8F3] transition-colors">
                      <td className="py-3 px-2 font-bold text-[#2F3542]">
                        {item.date} <span className="text-[#4B5563] font-medium">({item.day})</span>
                      </td>

                      <td className="py-3 px-2 font-semibold text-[#2F3542]">
                        <input
                          type="text"
                          value={item.subjectName}
                          onChange={(e) => handleEditItem(idx, "subjectName", e.target.value)}
                          className="bg-transparent border-b border-transparent hover:border-[#E4ACB2] focus:outline-none focus:border-[#E4ACB2] font-bold text-[#2F3542]"
                        />
                      </td>

                      <td className="py-3 px-2 font-semibold text-[#2F3542]">
                        <input
                          type="text"
                          value={item.topic}
                          onChange={(e) => handleEditItem(idx, "topic", e.target.value)}
                          className="bg-transparent border-b border-transparent hover:border-[#E4ACB2] focus:outline-none focus:border-[#E4ACB2] text-[#2F3542]"
                        />
                      </td>

                      <td className="py-3 px-2">
                        <select
                          value={item.type}
                          onChange={(e) => handleEditItem(idx, "type", e.target.value)}
                          className="bg-[#F0F3E7] text-[#2F3542] border border-[#CCD5AE] rounded-lg px-2 py-1 font-bold text-[11px]"
                        >
                          <option value="Study">Study</option>
                          <option value="Revision">Revision</option>
                          <option value="Practice">Practice</option>
                          <option value="Quiz">Quiz</option>
                          <option value="Flashcard">Flashcards</option>
                        </select>
                      </td>

                      <td className="py-3 px-2 text-[#4B5563] font-bold">
                        {item.startTime} - {item.endTime}
                      </td>

                      <td className="py-3 px-2 font-bold text-[#2F3542]">
                        {item.priority}
                      </td>

                      <td className="py-3 px-2 text-right">
                        <button
                          onClick={() => handleDeleteItem(idx)}
                          className="p-1.5 text-[#667085] hover:text-[#D99A9A] rounded-lg"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AiStudyPlanner;
