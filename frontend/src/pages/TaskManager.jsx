import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import API from "../api";
import AppLayout from "../components/AppLayout";
import { useToast } from "../components/Toast";
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Circle,
  Play,
  X,
  ArrowUpDown,
  Sparkles
} from "lucide-react";

const TaskManager = () => {
  const [tasks, setTasks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All"); // All, Pending, In Progress, Completed
  const [priorityFilter, setPriorityFilter] = useState("All"); // All, High, Medium, Low
  const [sortBy, setSortBy] = useState("dueDate"); // dueDate, priority, title

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Form Fields
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [topic, setTopic] = useState("");
  const [dueDate, setDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [priority, setPriority] = useState("Medium");
  const [estimatedTime, setEstimatedTime] = useState("30");
  const [status, setStatus] = useState("Pending");

  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tasksRes, subjectsRes] = await Promise.all([
        API.get("/tasks").catch(() => ({ data: [] })),
        API.get("/subjects").catch(() => ({ data: [] }))
      ]);
      setTasks(tasksRes.data || []);
      setSubjects(subjectsRes.data || []);
    } catch (err) {
      console.error("Failed to load tasks", err);
      addToast("Failed to load tasks", "error");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingTask(null);
    setTitle("");
    setSubjectId("");
    setTopic("");
    setDueDate(new Date().toISOString().split("T")[0]);
    setPriority("Medium");
    setEstimatedTime("30");
    setStatus("Pending");
  };

  const handleOpenEdit = (task) => {
    setEditingTask(task);
    setTitle(task.title || "");
    setSubjectId(task.subject?._id || task.subject || "");
    setTopic(task.topic || "");
    setDueDate(task.dueDate ? task.dueDate.split("T")[0] : new Date().toISOString().split("T")[0]);
    setPriority(task.priority || "Medium");
    setEstimatedTime(String(task.estimatedTime || 30));
    setStatus(task.status || "Pending");
    setShowModal(true);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const payload = {
      title,
      subject: subjectId || undefined,
      topic,
      dueDate,
      priority,
      estimatedTime: Number(estimatedTime) || 30,
      status
    };

    try {
      if (editingTask) {
        const res = await API.put(`/tasks/${editingTask._id}`, payload);
        setTasks(tasks.map((t) => (t._id === editingTask._id ? res.data : t)));
        addToast("Task updated!", "success");
      } else {
        const res = await API.post("/tasks", payload);
        setTasks([res.data, ...tasks]);
        addToast("Task created! 🎯", "success");
      }
      setShowModal(false);
      resetForm();
    } catch (err) {
      addToast("Failed to save task", "error");
    }
  };

  const handleToggleStatus = async (task, newStatus) => {
    try {
      const res = await API.put(`/tasks/${task._id}`, { status: newStatus });
      setTasks(tasks.map((t) => (t._id === task._id ? res.data : t)));
      addToast(
        newStatus === "Completed"
          ? "Task completed! 🎉"
          : `Task moved to ${newStatus}`,
        "success"
      );
    } catch (err) {
      addToast("Failed to update status", "error");
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      await API.delete(`/tasks/${id}`);
      setTasks(tasks.filter((t) => t._id !== id));
      addToast("Task removed", "info");
    } catch (err) {
      addToast("Failed to delete task", "error");
    }
  };

  // Filter & Search Logic
  const filteredTasks = tasks
    .filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.topic && task.topic.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === "All" ? true : task.status === statusFilter;

      const matchesPriority =
        priorityFilter === "All" ? true : task.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    })
    .sort((a, b) => {
      if (sortBy === "dueDate") {
        return new Date(a.dueDate || a.date) - new Date(b.dueDate || b.date);
      }
      if (sortBy === "priority") {
        const pMap = { High: 3, Medium: 2, Low: 1 };
        return (pMap[b.priority] || 2) - (pMap[a.priority] || 2);
      }
      return a.title.localeCompare(b.title);
    });

  return (
    <AppLayout>
      <div className="space-y-8 pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-heading font-extrabold text-2xl md:text-3xl text-[#2F3542]">
              Task Management
            </h2>
            <p className="text-xs md:text-sm text-[#4B5563]">
              Prioritize study tasks, track deadlines, and monitor execution progress
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
            <span>Create Task</span>
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="card-base rounded-3xl p-4 md:p-6 space-y-4 bg-white border border-[#E8E5DE]">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#667085]" />
              <input
                type="text"
                placeholder="Search tasks or topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl pl-10 pr-3 py-2 text-xs md:text-sm text-[#2F3542] placeholder-[#667085] font-semibold focus:outline-none focus:border-[#E4ACB2]"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-3.5 py-2 text-xs md:text-sm text-[#2F3542] font-semibold focus:outline-none focus:border-[#E4ACB2]"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-3.5 py-2 text-xs md:text-sm text-[#2F3542] font-semibold focus:outline-none focus:border-[#E4ACB2]"
              >
                <option value="All">All Priorities</option>
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>
            </div>

            {/* Sorting */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-3.5 py-2 text-xs md:text-sm text-[#2F3542] font-semibold focus:outline-none focus:border-[#E4ACB2]"
              >
                <option value="dueDate">Sort by Due Date</option>
                <option value="priority">Sort by Priority</option>
                <option value="title">Sort by Title</option>
              </select>
            </div>
          </div>
        </div>

        {/* Task Cards List */}
        {filteredTasks.length > 0 ? (
          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <div
                key={task._id}
                className={`p-5 rounded-3xl border transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  task.status === "Completed"
                    ? "bg-[#F0F3E7]/60 border-[#AFC7A1]/40 text-[#4B5563]"
                    : "bg-white border-[#E8E5DE] hover:shadow-md text-[#2F3542]"
                }`}
              >
                <div className="flex items-start md:items-center gap-4 min-w-0">
                  <button
                    onClick={() =>
                      handleToggleStatus(
                        task,
                        task.status === "Completed" ? "Pending" : "Completed"
                      )
                    }
                    className="mt-0.5 md:mt-0 p-1 text-[#667085] hover:text-[#2F3542] transition-transform active:scale-95"
                  >
                    {task.status === "Completed" ? (
                      <CheckCircle2 className="w-6 h-6 text-[#2F3542] fill-[#CCD5AE]" />
                    ) : (
                      <Circle className="w-6 h-6 text-[#667085] hover:text-[#E4ACB2]" />
                    )}
                  </button>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4
                        className={`font-heading font-bold text-base md:text-lg truncate ${
                          task.status === "Completed"
                            ? "line-through text-[#667085]"
                            : "text-[#2F3542]"
                        }`}
                      >
                        {task.title}
                      </h4>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          task.priority === "High"
                            ? "bg-[#F7E8EA] text-[#2F3542] border border-[#D99A9A]/50"
                            : task.priority === "Medium"
                            ? "bg-[#E7D59A]/30 text-[#2F3542] border border-[#E7D59A]"
                            : "bg-[#F0F3E7] text-[#2F3542] border border-[#CCD5AE]"
                        }`}
                      >
                        {task.priority || "Medium"} Priority
                      </span>

                      {task.status && (
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            task.status === "Completed"
                              ? "bg-[#CCD5AE] text-[#2F3542]"
                              : task.status === "In Progress"
                              ? "bg-[#E4ACB2] text-[#2F3542]"
                              : "bg-[#F0F3E7] text-[#2F3542]"
                          }`}
                        >
                          {task.status}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-[#4B5563] flex-wrap font-medium">
                      {task.subject && (
                        <span className="font-bold text-[#2F3542]">
                          {task.subject?.name || "Subject"}
                        </span>
                      )}
                      {task.topic && <span>• Topic: {task.topic}</span>}
                      <span>
                        • Due:{" "}
                        {task.dueDate
                          ? new Date(task.dueDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })
                          : "Today"}
                      </span>
                      <span>• Est: {task.estimatedTime || 30} mins</span>
                    </div>
                  </div>
                </div>

                {/* Status Toggle Buttons & Actions */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  {task.status !== "Completed" && (
                    <button
                      onClick={() =>
                        handleToggleStatus(
                          task,
                          task.status === "In Progress" ? "Pending" : "In Progress"
                        )
                      }
                      className="px-3 py-1.5 rounded-xl bg-[#E4ACB2] text-[#2F3542] text-xs font-bold hover:bg-[#D69AA2] transition-all shadow-sm"
                    >
                      {task.status === "In Progress" ? "Pause" : "Start Task"}
                    </button>
                  )}

                  <button
                    onClick={() => handleOpenEdit(task)}
                    className="p-2 text-[#667085] hover:text-[#2F3542] rounded-xl hover:bg-[#FAF8F3] transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteTask(task._id)}
                    className="p-2 text-[#667085] hover:text-[#D99A9A] rounded-xl hover:bg-[#FAF8F3] transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center space-y-3 bg-[#FAF8F3] rounded-3xl border border-dashed border-[#E8E5DE]">
            <CheckSquare className="w-10 h-10 text-[#667085] mx-auto" />
            <h3 className="font-heading font-bold text-lg text-[#2F3542]">No Tasks Found</h3>
            <p className="text-xs text-[#4B5563] max-w-xs mx-auto font-medium">
              No tasks match your search filters. Click Create Task to add a new assignment.
            </p>
          </div>
        )}

        {/* Create / Edit Task Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in">
            <div className="relative w-full max-w-lg bg-white border border-[#E8E5DE] rounded-3xl p-6 md:p-8 shadow-2xl space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-bold text-lg text-[#2F3542]">
                  {editingTask ? "Edit Task" : "Create New Task"}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 text-[#667085] hover:text-[#2F3542] rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveTask} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[#2F3542] block mb-1">
                    Task Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Complete Binary Trees Problem Set"
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
                      Topic
                    </label>
                    <input
                      type="text"
                      placeholder="Topic name"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-3.5 py-2.5 text-xs md:text-sm text-[#2F3542] placeholder-[#667085] font-semibold focus:outline-none focus:border-[#E4ACB2]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[#2F3542] block mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-3 py-2 text-xs text-[#2F3542] font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#2F3542] block mb-1">
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full bg-[#FAF7F2] border border-[#E8E5DE] rounded-xl px-3 py-2 text-xs text-[#2F3542] font-semibold"
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#2F3542] block mb-1">
                      Est. Time (mins)
                    </label>
                    <input
                      type="number"
                      value={estimatedTime}
                      onChange={(e) => setEstimatedTime(e.target.value)}
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
                    {editingTask ? "Update Task" : "Save Task"}
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

export default TaskManager;
