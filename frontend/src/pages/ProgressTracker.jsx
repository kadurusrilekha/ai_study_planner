import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import API from "../api";
import AppLayout from "../components/AppLayout";
import { useToast } from "../components/Toast";
import {
  CheckSquare,
  Plus,
  Trash2,
  BookOpen,
  CheckCircle2,
  Circle,
  TrendingUp,
  Award,
  ArrowLeft,
  Sparkles
} from "lucide-react";

const ProgressTracker = () => {
  const [progress, setProgress] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(true);

  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [progressRes, subjectsRes] = await Promise.all([
        API.get("/progress").catch(() => ({ data: [] })),
        API.get("/subjects").catch(() => ({ data: [] }))
      ]);
      setProgress(progressRes.data || []);
      setSubjects(subjectsRes.data || []);
    } catch (err) {
      console.error("Failed to load progress data", err);
      addToast("Failed to load topic progress data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddProgress = async (e) => {
    e.preventDefault();
    if (!selectedSubject || !topic.trim()) {
      addToast("Please select a subject and enter topic name", "error");
      return;
    }

    try {
      const res = await API.post("/progress", {
        subject: selectedSubject,
        topic,
        completed: false
      });
      setProgress([res.data, ...progress]);
      setSelectedSubject("");
      setTopic("");
      addToast("Topic added to tracking matrix! 🎯", "success");
    } catch (err) {
      addToast("Failed to add topic", "error");
    }
  };

  const handleToggleComplete = async (id, currentStatus) => {
    try {
      const res = await API.put(`/progress/${id}`, { completed: !currentStatus });
      setProgress(progress.map((p) => (p._id === id ? res.data : p)));
      addToast(!currentStatus ? "Topic completed! Great work 🎉" : "Topic status updated", "success");
    } catch (err) {
      addToast("Failed to update status", "error");
    }
  };

  const handleDelete = async (id) => {
    try {
      await API.delete(`/progress/${id}`);
      setProgress(progress.filter((p) => p._id !== id));
      addToast("Topic removed from tracking", "info");
    } catch (err) {
      addToast("Failed to delete topic", "error");
    }
  };

  const completedCount = progress.filter((p) => p.completed).length;
  const completionPercentage = progress.length > 0 ? Math.round((completedCount / progress.length) * 100) : 0;

  return (
    <AppLayout>
      <div className="space-y-8 pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2.5 rounded-2xl bg-white border border-[#E8E5DE] text-[#2F3542] hover:bg-[#FAF8F3] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="font-heading font-extrabold text-2xl md:text-3xl text-[#2F3542]">
                Syllabus & Progress Matrix
              </h2>
              <p className="text-xs md:text-sm text-[#4B5563]">
                Track topic-by-topic mastery across your active subjects
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="card-base rounded-3xl p-6 flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-[#F7E8EA] text-[#E4ACB2]">
              <BookOpen className="w-6 h-6 text-[#2F3542]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#4B5563] uppercase tracking-wider">Total Topics</p>
              <h3 className="font-heading font-bold text-2xl text-[#2F3542]">
                {progress.length}
              </h3>
            </div>
          </div>

          <div className="card-base rounded-3xl p-6 flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-[#F0F3E7] text-[#CCD5AE]">
              <CheckCircle2 className="w-6 h-6 text-[#2F3542]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#4B5563] uppercase tracking-wider">Mastered Topics</p>
              <h3 className="font-heading font-bold text-2xl text-[#2F3542]">
                {completedCount}
              </h3>
            </div>
          </div>

          <div className="card-base rounded-3xl p-6 flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-[#F7E8EA] text-[#E4ACB2]">
              <TrendingUp className="w-6 h-6 text-[#2F3542]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#4B5563] uppercase tracking-wider">Completion Rate</p>
              <h3 className="font-heading font-bold text-2xl text-[#2F3542]">
                {completionPercentage}%
              </h3>
            </div>
          </div>
        </div>

        {/* Overall Progress Bar */}
        {progress.length > 0 && (
          <div className="card-base rounded-3xl p-6 space-y-3">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-[#4B5563]">Overall Syllabus Completion</span>
              <span className="text-[#2F3542] font-bold">{completionPercentage}%</span>
            </div>
            <div className="w-full h-3 bg-[#FAF8F3] border border-[#E8E5DE] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#E4ACB2] rounded-full transition-all duration-700"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Add Progress Form Card */}
        <div className="card-base rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-[#F7E8EA] text-[#E4ACB2]">
              <Plus className="w-5 h-5 text-[#2F3542]" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-[#2F3542]">
                Track New Topic
              </h3>
              <p className="text-xs text-[#4B5563]">Select subject and enter topic name</p>
            </div>
          </div>

          <form onSubmit={handleAddProgress} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#2F3542] block mb-1">
                Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
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

            <div>
              <label className="text-xs font-semibold text-[#2F3542] block mb-1">
                Topic Name
              </label>
              <input
                type="text"
                placeholder="Topic title (e.g. Dynamic Programming)"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-4 py-2.5 text-xs md:text-sm text-[#2F3542] placeholder-[#667085] focus:outline-none focus:border-[#E4ACB2]"
                required
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#E4ACB2] hover:bg-[#D69AA2] text-[#2F3542] font-bold text-xs md:text-sm shadow-sm transition-all"
              >
                Add Topic
              </button>
            </div>
          </form>
        </div>

        {/* Topics List Card */}
        <div className="card-base rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-[#F7E8EA] text-[#E4ACB2]">
                <CheckSquare className="w-5 h-5 text-[#2F3542]" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-[#2F3542]">
                  Topic Matrix ({progress.length})
                </h3>
                <p className="text-xs text-[#4B5563]">Check off topics as you master them</p>
              </div>
            </div>
          </div>

          {progress.length > 0 ? (
            <div className="space-y-3">
              {progress.map((item) => (
                <div
                  key={item._id}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                    item.completed
                      ? "bg-[#F0F3E7] border-[#CCD5AE] text-[#2F3542]"
                      : "bg-white border-[#E8E5DE]"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <button
                      onClick={() => handleToggleComplete(item._id, item.completed)}
                      className="p-1 text-[#667085] hover:text-[#2F3542] transition-colors"
                    >
                      {item.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-[#2F3542] fill-[#CCD5AE]" />
                      ) : (
                        <Circle className="w-5 h-5 text-[#667085]" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <h4
                        className={`font-semibold text-sm truncate ${
                          item.completed
                            ? "line-through text-[#667085]"
                            : "text-[#2F3542]"
                        }`}
                      >
                        {item.topic}
                      </h4>
                      <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[#FAF8F3] text-[#4B5563] inline-block mt-0.5 border border-[#E8E5DE]">
                        {item.subject?.name || "General Subject"}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(item._id)}
                    className="text-[#667085] hover:text-[#D99A9A] p-1.5 rounded-lg transition-colors"
                    title="Delete Topic"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center space-y-3 bg-[#FAF8F3] rounded-2xl border border-dashed border-[#E8E5DE]">
              <CheckSquare className="w-8 h-8 text-[#667085] mx-auto" />
              <h4 className="font-heading font-semibold text-sm text-[#2F3542]">No topics tracked yet</h4>
              <p className="text-xs text-[#4B5563] max-w-xs mx-auto">
                Add syllabus topics above to monitor your subject completion progress.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default ProgressTracker;