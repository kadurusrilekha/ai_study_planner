import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import API from "../api";
import AppLayout from "../components/AppLayout";
import { useToast } from "../components/Toast";
import {
  Target,
  Plus,
  Calendar,
  Clock,
  Award,
  Trash2,
  Edit2,
  Sparkles,
  CheckCircle2,
  X,
  Brain,
  ArrowRight
} from "lucide-react";

const ExamsGoalsPage = () => {
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [examDate, setExamDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split("T")[0];
  });
  const [targetScore, setTargetScore] = useState("90%");
  const [priority, setPriority] = useState("High");
  const [notes, setNotes] = useState("");

  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [examsRes, subjectsRes] = await Promise.all([
        API.get("/exams").catch(() => ({ data: [] })),
        API.get("/subjects").catch(() => ({ data: [] }))
      ]);

      setExams(examsRes.data || []);
      setSubjects(subjectsRes.data || []);
    } catch (err) {
      console.error("Failed to load exams", err);
      addToast("Failed to load exams & goals", "error");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingExam(null);
    setTitle("");
    setSubjectId("");
    const d = new Date();
    d.setDate(d.getDate() + 14);
    setExamDate(d.toISOString().split("T")[0]);
    setTargetScore("90%");
    setPriority("High");
    setNotes("");
  };

  const handleOpenEdit = (exam) => {
    setEditingExam(exam);
    setTitle(exam.title || "");
    setSubjectId(exam.subject?._id || exam.subject || "");
    setExamDate(exam.examDate ? exam.examDate.split("T")[0] : new Date().toISOString().split("T")[0]);
    setTargetScore(exam.targetScore || "90%");
    setPriority(exam.priority || "High");
    setNotes(exam.notes || "");
    setShowModal(true);
  };

  const handleSaveExam = async (e) => {
    e.preventDefault();
    if (!title.trim() || !examDate) return;

    const payload = {
      title,
      subject: subjectId || undefined,
      examDate,
      targetScore,
      priority,
      notes
    };

    try {
      if (editingExam) {
        const res = await API.put(`/exams/${editingExam._id}`, payload);
        setExams(exams.map((ex) => (ex._id === editingExam._id ? res.data : ex)));
        addToast("Exam goal updated! 🎯", "success");
      } else {
        const res = await API.post("/exams", payload);
        setExams([...exams, res.data]);
        addToast("Exam target set! 🎯", "success");
      }
      setShowModal(false);
      resetForm();
    } catch (err) {
      addToast("Failed to save exam goal", "error");
    }
  };

  const handleDeleteExam = async (id) => {
    try {
      await API.delete(`/exams/${id}`);
      setExams(exams.filter((e) => e._id !== id));
      addToast("Exam target removed", "info");
    } catch (err) {
      addToast("Failed to delete exam", "error");
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8 pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-heading font-extrabold text-2xl md:text-3xl text-[#2F3542]">
              Exams & Target Goals
            </h2>
            <p className="text-xs md:text-sm text-[#4B5563]">
              Track certification deadlines, real exam preparation %, and dynamic AI readiness recommendations
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#E4ACB2] hover:bg-[#D69AA2] text-[#2F3542] font-bold text-xs md:text-sm shadow-sm transition-all shrink-0"
          >
            <Plus className="w-4.5 h-4.5" />
            <span>Add Exam / Goal</span>
          </button>
        </div>

        {/* Exams Grid Display */}
        {exams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {exams.map((exam) => {
              const prepPct = exam.preparationProgress !== undefined ? exam.preparationProgress : 0;
              const daysLabel = exam.daysRemainingLabel || (exam.daysRemaining !== undefined ? `${exam.daysRemaining} Days Remaining` : "Upcoming");
              const statusText = exam.status || "Not Started";

              const statusColors = {
                "Not Started": "bg-[#FAF8F3] text-[#4B5563] border-[#E8E5DE]",
                "In Progress": "bg-[#F7E8EA] text-[#2F3542] border-[#E4ACB2]/40",
                "Well Prepared": "bg-[#F0F3E7] text-[#2F3542] border-[#CCD5AE]",
                "Completed": "bg-[#CCD5AE] text-[#2F3542] border-[#B9C89A]",
                "Exam Date Passed": "bg-[#FADBD8] text-[#922B21] border-[#F5B7B1]"
              };

              return (
                <div
                  key={exam._id}
                  className="card-base rounded-3xl p-6 md:p-7 space-y-5 flex flex-col justify-between relative overflow-hidden bg-white border border-[#E8E5DE]"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#F7E8EA] text-[#2F3542] border border-[#E4ACB2]/30">
                          {daysLabel}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusColors[statusText] || statusColors["Not Started"]}`}>
                          {statusText}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(exam)}
                          className="text-[#98A0A8] hover:text-[#2F3542] p-1 rounded-lg transition-colors"
                          title="Edit Exam Target"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteExam(exam._id)}
                          className="text-[#98A0A8] hover:text-[#D99A9A] p-1 rounded-lg transition-colors"
                          title="Remove Exam Target"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-heading font-extrabold text-xl text-[#2F3542]">
                      {exam.title}
                    </h3>

                    <div className="flex items-center gap-3 text-xs text-[#4B5563] font-semibold">
                      <span>Subject: <strong className="text-[#2F3542]">{exam.subject?.name || "General"}</strong></span>
                      <span>• Target Score: <strong className="text-[#2F3542] font-bold">{exam.targetScore || "Target Not Set"}</strong></span>
                    </div>

                    {/* Preparation % Bar */}
                    <div className="space-y-1.5 pt-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-[#4B5563]">Preparation Progress</span>
                        <span className="text-[#2F3542] font-bold">{prepPct}% Prepared</span>
                      </div>
                      <div className="w-full h-3 bg-[#F0F3E7] border border-[#E8E5DE] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#E4ACB2] rounded-full transition-all duration-700"
                          style={{ width: `${prepPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Dynamic AI Preparation Recommendation */}
                    <div className="p-3.5 rounded-2xl bg-[#F7E8EA] border border-[#E4ACB2]/30 text-xs text-[#2F3542] flex items-start gap-2.5">
                      <Brain className="w-4 h-4 text-[#D69AA2] shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        <span className="font-bold">AI Recommendation:</span> {exam.aiRecommendation || "Begin by completing your first study session and reviewing subject topics."}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center space-y-3 bg-[#FAF8F3] rounded-3xl border border-dashed border-[#E8E5DE]">
            <Target className="w-10 h-10 text-[#667085] mx-auto" />
            <h3 className="font-heading font-bold text-lg text-[#2F3542]">No Exam Targets Set</h3>
            <p className="text-xs text-[#4B5563] max-w-xs mx-auto font-medium">
              Add upcoming exams or certification goals to unlock real-time countdown timers and AI readiness recommendations.
            </p>
          </div>
        )}

        {/* Modal: Add/Edit Exam */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-md bg-white border border-[#E8E5DE] rounded-3xl p-6 md:p-8 shadow-2xl space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-bold text-lg text-[#2F3542]">
                  {editingExam ? "Edit Exam Target" : "Add Exam or Goal"}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 text-[#667085] hover:text-[#2F3542] rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveExam} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[#2F3542] block mb-1">
                    Exam / Goal Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Python Certification, AWS Solutions Architect"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-4 py-2.5 text-xs md:text-sm text-[#2F3542] placeholder-[#667085] font-semibold focus:outline-none focus:border-[#E4ACB2]"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[#2F3542] block mb-1">
                      Subject
                    </label>
                    <select
                      value={subjectId}
                      onChange={(e) => setSubjectId(e.target.value)}
                      className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-3.5 py-2.5 text-xs md:text-sm text-[#2F3542] font-semibold focus:outline-none focus:border-[#E4ACB2]"
                    >
                      <option value="">Select Subject</option>
                      {subjects.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#2F3542] block mb-1">
                      Exam Date
                    </label>
                    <input
                      type="date"
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                      className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-3 py-2.5 text-xs font-semibold text-[#2F3542] focus:outline-none focus:border-[#E4ACB2]"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-xs font-bold text-[#4B5563] hover:text-[#2F3542]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs font-bold bg-[#E4ACB2] text-[#2F3542] rounded-xl hover:bg-[#D69AA2] shadow-sm transition-all"
                  >
                    {editingExam ? "Update Goal" : "Save Goal"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default ExamsGoalsPage;
