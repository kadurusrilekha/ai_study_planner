import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import API from "../api";
import AppLayout from "../components/AppLayout";
import { useToast } from "../components/Toast";
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  Sparkles,
  ArrowLeft,
  X,
  Filter,
  Check,
  RotateCcw,
  BookOpen
} from "lucide-react";

const StudySchedule = () => {
  const [schedule, setSchedule] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // View state: 'daily' | 'weekly' | 'calendar' | 'timeline'
  const [activeView, setActiveView] = useState("weekly");

  // Session Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingSession, setEditingSession] = useState(null);

  // Form Fields
  const [subjectId, setSubjectId] = useState("");
  const [topic, setTopic] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [day, setDay] = useState("Monday");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:30");
  const [duration, setDuration] = useState("1.5");
  const [priority, setPriority] = useState("Medium");
  const [type, setType] = useState("Study");
  const [notes, setNotes] = useState("");

  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [scheduleRes, subjectsRes] = await Promise.all([
        API.get("/schedule").catch(() => ({ data: [] })),
        API.get("/subjects").catch(() => ({ data: [] }))
      ]);
      setSchedule(scheduleRes.data || []);
      setSubjects(subjectsRes.data || []);
    } catch (err) {
      console.error("Failed to load schedule", err);
      addToast("Failed to load schedule sessions", "error");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingSession(null);
    setSubjectId("");
    setTopic("");
    setDate(new Date().toISOString().split("T")[0]);
    setDay("Monday");
    setStartTime("09:00");
    setEndTime("10:30");
    setDuration("1.5");
    setPriority("Medium");
    setType("Study");
    setNotes("");
  };

  const handleOpenEditModal = (session) => {
    setEditingSession(session);
    setSubjectId(session.subject?._id || session.subject || "");
    setTopic(session.topic || "");
    setDate(session.date ? session.date.split("T")[0] : new Date().toISOString().split("T")[0]);
    setDay(session.day || "Monday");
    setStartTime(session.startTime || session.time || "09:00");
    setEndTime(session.endTime || "10:30");
    setDuration(String(session.duration || 1.5));
    setPriority(session.priority || "Medium");
    setType(session.type || "Study");
    setNotes(session.notes || "");
    setShowModal(true);
  };

  const handleSaveSession = async (e) => {
    e.preventDefault();
    if (!subjectId) {
      addToast("Please select a subject", "error");
      return;
    }

    const payload = {
      subject: subjectId,
      topic,
      date,
      day,
      time: startTime,
      startTime,
      endTime,
      duration: Number(duration) || 1.5,
      priority,
      type,
      notes
    };

    try {
      if (editingSession) {
        const res = await API.put(`/schedule/${editingSession._id}`, payload);
        setSchedule(schedule.map((s) => (s._id === editingSession._id ? res.data : s)));
        addToast("Study session updated!", "success");
      } else {
        const res = await API.post("/schedule", payload);
        setSchedule([res.data, ...schedule]);
        addToast("Study session scheduled! 🗓️", "success");
      }
      setShowModal(false);
      resetForm();
    } catch (err) {
      addToast("Failed to save session", "error");
    }
  };

  const handleToggleComplete = async (session) => {
    try {
      const res = await API.put(`/schedule/${session._id}`, {
        completed: !session.completed
      });
      setSchedule(schedule.map((s) => (s._id === session._id ? res.data : s)));
      addToast(!session.completed ? "Session marked complete! 🎉" : "Session reopened", "success");
    } catch (err) {
      addToast("Failed to update status", "error");
    }
  };

  const handleDeleteSession = async (id) => {
    try {
      await API.delete(`/schedule/${id}`);
      setSchedule(schedule.filter((s) => s._id !== id));
      addToast("Session removed", "info");
    } catch (err) {
      addToast("Failed to delete session", "error");
    }
  };

  // Conflict Detection Engine
  const detectConflicts = () => {
    const conflicts = [];
    for (let i = 0; i < schedule.length; i++) {
      for (let j = i + 1; j < schedule.length; j++) {
        const s1 = schedule[i];
        const s2 = schedule[j];

        // Compare same day or date
        const sameDay = (s1.date && s2.date && s1.date.split("T")[0] === s2.date.split("T")[0]) || (s1.day && s2.day && s1.day === s2.day);

        if (sameDay && s1.startTime && s2.startTime) {
          // Simple time comparison helper (e.g. "09:00" -> 540 mins)
          const toMins = (tStr) => {
            if (!tStr) return 0;
            const [h, m] = tStr.split(":").map(Number);
            return (h || 0) * 60 + (m || 0);
          };

          const s1Start = toMins(s1.startTime);
          const s1End = s1.endTime ? toMins(s1.endTime) : s1Start + (s1.duration || 1) * 60;
          const s2Start = toMins(s2.startTime);
          const s2End = s2.endTime ? toMins(s2.endTime) : s2Start + (s2.duration || 1) * 60;

          if (Math.max(s1Start, s2Start) < Math.min(s1End, s2End)) {
            conflicts.push({ s1, s2 });
          }
        }
      }
    }
    return conflicts;
  };

  const conflicts = detectConflicts();

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const sessionTypes = ["Study", "Revision", "Practice", "Quiz", "Flashcard"];

  return (
    <AppLayout>
      <div className="space-y-8 pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-heading font-extrabold text-2xl md:text-3xl text-[#2F3542]">
              Multi-View Study Planner
            </h2>
            <p className="text-xs md:text-sm text-[#4B5563]">
              Schedule sessions, prevent time overlaps, and optimize active revision
            </p>
          </div>

          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#E4ACB2] hover:bg-[#D69AA2] text-[#2F3542] font-bold text-xs md:text-sm shadow-sm transition-all shrink-0"
          >
            <Plus className="w-4.5 h-4.5 text-[#2F3542]" />
            <span>Schedule Session</span>
          </button>
        </div>

        {/* Conflict Warning Banner */}
        {conflicts.length > 0 && (
          <div className="p-4 rounded-2xl bg-[#F7E8EA] border border-[#D99A9A]/30 text-[#2F3542] flex items-start justify-between gap-3 animate-in fade-in">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#D99A9A] shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#D99A9A]">
                  Scheduling Conflicts Detected ({conflicts.length})
                </h4>
                <p className="text-xs mt-0.5 font-medium">
                  Overlapping time slots found! Check {conflicts[0].s1.day || "the day"} between{" "}
                  <strong>{conflicts[0].s1.subject?.name || "Session A"}</strong> and{" "}
                  <strong>{conflicts[0].s2.subject?.name || "Session B"}</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* View Switcher Tabs */}
        <div className="flex items-center justify-between gap-4 bg-white p-2 rounded-2xl border border-[#E8E5DE] overflow-x-auto select-none">
          <div className="flex items-center gap-1">
            {[
              { id: "daily", label: "Daily View" },
              { id: "weekly", label: "Weekly Grid" },
              { id: "calendar", label: "Calendar View" },
              { id: "timeline", label: "Timeline Flow" }
            ].map((view) => (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeView === view.id
                    ? "bg-[#E4ACB2] text-[#2F3542] shadow-sm"
                    : "text-[#4B5563] hover:bg-[#FAF8F3]"
                }`}
              >
                {view.label}
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-[#4B5563] px-3">
            <span>Total Sessions: <strong className="text-[#2F3542]">{schedule.length}</strong></span>
          </div>
        </div>

        {/* VIEW 1: WEEKLY GRID */}
        {activeView === "weekly" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
            {daysOfWeek.map((d) => {
              const daySessions = schedule.filter((s) => s.day === d);
              return (
                <div
                  key={d}
                  className="card-base rounded-2xl p-4 space-y-3 flex flex-col justify-between min-h-[220px] bg-white border border-[#E8E5DE]"
                >
                  <div className="flex justify-between items-center pb-2 border-b border-[#E8E5DE]">
                    <span className="font-heading font-bold text-xs text-[#2F3542] uppercase tracking-wider">
                      {d}
                    </span>
                    <span className="text-[10px] font-bold text-[#4B5563]">
                      {daySessions.length}
                    </span>
                  </div>

                  <div className="space-y-2 flex-1">
                    {daySessions.map((session) => (
                      <div
                        key={session._id}
                        className={`p-3 rounded-xl border text-xs space-y-1.5 transition-all ${
                          session.completed
                            ? "bg-[#F0F3E7] border-[#AFC7A1] text-[#2F3542]"
                            : "bg-[#F7E8EA]/50 border-[#E8E5DE] text-[#2F3542]"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-bold truncate text-[#2F3542]">
                            {session.subject?.name || "Study Session"}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#E4ACB2] text-[#2F3542]">
                            {session.type || "Study"}
                          </span>
                        </div>

                        {session.topic && (
                          <p className="text-[11px] text-[#4B5563] truncate font-medium">
                            {session.topic}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-[#4B5563] pt-1">
                          <span className="flex items-center gap-1 font-bold text-[#2F3542]">
                            <Clock className="w-3 h-3 text-[#E4ACB2]" />
                            {session.startTime || session.time || "09:00"}
                          </span>

                          <div className="flex items-center gap-1 text-[#4B5563]">
                            <button
                              onClick={() => handleToggleComplete(session)}
                              className="hover:text-[#2F3542] p-0.5"
                              title="Toggle Complete"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(session)}
                              className="hover:text-[#2F3542] p-0.5"
                              title="Edit Session"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSession(session._id)}
                              className="hover:text-[#D99A9A] p-0.5"
                              title="Delete Session"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      resetForm();
                      setDay(d);
                      setShowModal(true);
                    }}
                    className="w-full py-1.5 rounded-xl border border-dashed border-[#E8E5DE] text-[11px] font-bold text-[#4B5563] hover:text-[#2F3542] hover:border-[#E4ACB2] transition-colors"
                  >
                    + Add Session
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* VIEW 2: DAILY VIEW */}
        {activeView === "daily" && (
          <div className="card-base rounded-3xl p-6 space-y-6 bg-white border border-[#E8E5DE]">
            <h3 className="font-heading font-bold text-lg text-[#2F3542]">
              Today's Detailed Study Schedule
            </h3>
            <div className="space-y-3">
              {schedule.length > 0 ? (
                schedule.map((session) => (
                  <div
                    key={session._id}
                    className="p-4 rounded-2xl bg-[#FAF8F3] border border-[#E8E5DE] flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-[#F7E8EA] text-[#2F3542]">
                        <Clock className="w-5 h-5 text-[#2F3542]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-[#2F3542] text-base">
                            {session.subject?.name || "General Study"}
                          </h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E4ACB2] text-[#2F3542]">
                            {session.type || "Study"}
                          </span>
                        </div>
                        <p className="text-xs text-[#4B5563] font-medium mt-0.5">
                          {session.day} • {session.startTime || session.time} - {session.endTime || "10:30"} ({session.duration || 1.5} hrs)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleComplete(session)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                          session.completed
                            ? "bg-[#CCD5AE] text-[#2F3542]"
                            : "bg-[#E4ACB2] text-[#2F3542]"
                        }`}
                      >
                        {session.completed ? "Completed ✓" : "Mark Done"}
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(session)}
                        className="p-2 text-[#4B5563] hover:text-[#2F3542] rounded-xl"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSession(session._id)}
                        className="p-2 text-[#4B5563] hover:text-[#D99A9A] rounded-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#4B5563]">No sessions available.</p>
              )}
            </div>
          </div>
        )}

        {/* VIEW 3 & 4: CALENDAR & TIMELINE */}
        {(activeView === "calendar" || activeView === "timeline") && (
          <div className="card-base rounded-3xl p-8 text-center space-y-4 bg-white border border-[#E8E5DE]">
            <CalendarIcon className="w-10 h-10 text-[#E4ACB2] mx-auto" />
            <h3 className="font-heading font-bold text-lg text-[#2F3542] capitalize">
              {activeView} Planner View
            </h3>
            <div className="space-y-3 max-w-lg mx-auto">
              {schedule.map((session) => (
                <div
                  key={session._id}
                  className="p-3.5 rounded-2xl bg-[#FAF8F3] border border-[#E8E5DE] text-left flex justify-between items-center text-xs"
                >
                  <div>
                    <span className="font-bold text-[#2F3542]">
                      {session.day} • {session.startTime || session.time}
                    </span>
                    <p className="text-[#4B5563] font-medium">{session.subject?.name || "Subject"} - {session.type || "Study"}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#E4ACB2] text-[#2F3542] font-bold text-[10px]">
                    {session.priority || "Medium"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create / Edit Session Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in">
            <div className="relative w-full max-w-lg bg-white border border-[#E8E5DE] rounded-3xl p-6 md:p-8 shadow-2xl space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-bold text-lg text-[#2F3542]">
                  {editingSession ? "Edit Study Session" : "Schedule New Session"}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 text-[#667085] hover:text-[#2F3542] rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveSession} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[#2F3542] block mb-1">
                      Subject
                    </label>
                    <select
                      value={subjectId}
                      onChange={(e) => setSubjectId(e.target.value)}
                      className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-3.5 py-2 text-xs md:text-sm text-[#2F3542] font-semibold focus:outline-none focus:border-[#E4ACB2]"
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
                      Session Type
                    </label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-3.5 py-2 text-xs md:text-sm text-[#2F3542] font-semibold focus:outline-none focus:border-[#E4ACB2]"
                    >
                      {sessionTypes.map((t) => (
                        <option key={t} value={t}>
                          {t} Session
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#2F3542] block mb-1">
                    Topic / Sub-topic
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Master SQL Joins"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-3.5 py-2 text-xs md:text-sm text-[#2F3542] placeholder-[#667085] font-semibold focus:outline-none focus:border-[#E4ACB2]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[#2F3542] block mb-1">
                      Day of Week
                    </label>
                    <select
                      value={day}
                      onChange={(e) => setDay(e.target.value)}
                      className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-3.5 py-2 text-xs md:text-sm text-[#2F3542] font-semibold focus:outline-none focus:border-[#E4ACB2]"
                    >
                      {daysOfWeek.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#2F3542] block mb-1">
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-3.5 py-2 text-xs md:text-sm text-[#2F3542] font-semibold focus:outline-none focus:border-[#E4ACB2]"
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[#2F3542] block mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-3 py-2 text-xs text-[#2F3542] font-semibold"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#2F3542] block mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-3 py-2 text-xs text-[#2F3542] font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#2F3542] block mb-1">
                      Duration (hrs)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="8"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-3 py-2 text-xs text-[#2F3542] font-semibold"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-xs font-bold text-[#4B5563]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs font-bold bg-[#CCD5AE] hover:bg-[#B9C89A] text-[#2F3542] rounded-xl shadow-sm"
                  >
                    {editingSession ? "Update Session" : "Save Session"}
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

export default StudySchedule;