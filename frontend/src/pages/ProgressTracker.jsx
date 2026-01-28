import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import API from "../api";

const ProgressTracker = () => {
  const [progress, setProgress] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [topic, setTopic] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [progressRes, subjectsRes] = await Promise.all([
        API.get("/progress"),
        API.get("/subjects")
      ]);
      setProgress(progressRes.data);
      setSubjects(subjectsRes.data);
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
  };

  const handleAddProgress = async (e) => {
    e.preventDefault();
    if (!selectedSubject || !topic) return;

    try {
      await API.post("/progress", {
        subject: selectedSubject,
        topic,
        completed: false
      });
      setSelectedSubject("");
      setTopic("");
      fetchData();
    } catch (err) {
      console.error("Failed to add progress", err);
    }
  };

  const handleToggleComplete = async (id, currentStatus) => {
    try {
      await API.put(`/progress/${id}`, { completed: !currentStatus });
      fetchData();
    } catch (err) {
      console.error("Failed to update progress", err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await API.delete(`/progress/${id}`);
      fetchData();
    } catch (err) {
      console.error("Failed to delete progress", err);
    }
  };

  const completedCount = progress.filter(p => p.completed).length;
  const completionPercentage = progress.length > 0 ? Math.round((completedCount / progress.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold">Progress Tracker</h1>
        <button
          onClick={() => navigate("/dashboard")}
          className="bg-white text-blue-600 px-4 py-2 rounded hover:bg-gray-100"
        >
          Back to Dashboard
        </button>
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-6 rounded-xl shadow">
            <p className="text-gray-600">Total Topics</p>
            <p className="text-3xl font-bold text-blue-600">{progress.length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow">
            <p className="text-gray-600">Completed</p>
            <p className="text-3xl font-bold text-green-600">{completedCount}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow">
            <p className="text-gray-600">Completion</p>
            <p className="text-3xl font-bold text-indigo-600">{completionPercentage}%</p>
          </div>
        </div>

        {/* Progress Bar */}
        {progress.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow mb-6">
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-green-600 h-4 rounded-full transition-all"
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
            <p className="text-center mt-2 text-sm text-gray-600">{completionPercentage}% Complete</p>
          </div>
        )}

        {/* Add Progress Form */}
        <div className="bg-white p-6 rounded-xl shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Track New Topic</h2>
          <form onSubmit={handleAddProgress} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="border p-2 rounded"
              required
            >
              <option value="">Select Subject</option>
              {subjects.map(s => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Topic name"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="border p-2 rounded"
              required
            />

            <button
              type="submit"
              className="bg-green-600 text-white rounded hover:bg-green-700"
            >
              Add Topic
            </button>
          </form>
        </div>

        {/* Progress List */}
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-xl font-semibold mb-4">Your Topics</h2>
          {progress.length > 0 ? (
            <div className="space-y-3">
              {progress.map(item => (
                <div
                  key={item._id}
                  className={`p-4 border rounded-lg flex justify-between items-center ${
                    item.completed ? "bg-green-50 border-green-300" : "bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => handleToggleComplete(item._id, item.completed)}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <div>
                      <p className={`font-semibold ${item.completed ? "line-through text-gray-500" : ""}`}>
                        {item.topic}
                      </p>
                      <p className="text-sm text-gray-600">{item.subject?.name || "Subject"}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(item._id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No topics tracked yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressTracker;