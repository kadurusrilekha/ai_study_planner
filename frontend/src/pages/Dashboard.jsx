import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router";
import API from "../api";

const Dashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [subjectSyllabus, setSubjectSyllabus] = useState("");
  const user = JSON.parse(localStorage.getItem("user")) || {};
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      
      console.log("Token:", localStorage.getItem("token"));
      
      const [tasksRes, subjectsRes, progressRes] = await Promise.all([
        API.get("/tasks"),
        API.get("/subjects"),
        API.get("/progress")
      ]);
      
      setTasks(tasksRes.data);
      setSubjects(subjectsRes.data);
      setProgress(progressRes.data);
    } catch (err) {
      console.error("Full error:", err);
      console.error("Error response:", err.response);
      
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
      await API.post("/tasks", { title: taskTitle });
      setTaskTitle("");
      setShowTaskForm(false);
      fetchData();
    } catch (err) {
      setError("Failed to add task");
    }
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!subjectName.trim()) return;

    try {
      await API.post("/subjects", { name: subjectName, syllabus: subjectSyllabus });
      setSubjectName("");
      setSubjectSyllabus("");
      setShowSubjectForm(false);
      fetchData();
    } catch (err) {
      setError("Failed to add subject");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-xl text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold">AI Study Planner</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm">Welcome, {user.name || "User"}</span>
          <button
            onClick={handleLogout}
            className="bg-red-600 px-4 py-2 rounded hover:bg-red-700 text-sm"
          >
            Logout
          </button>
        </div>
      </div>

      {error && <div className="bg-red-100 text-red-700 p-4 m-4 rounded">{error}</div>}

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Subjects Card */}
        <div className="bg-white p-5 rounded-xl shadow">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-lg">Subjects ({subjects.length})</h3>
            <button
              onClick={() => setShowSubjectForm(!showSubjectForm)}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
            >
              + Add
            </button>
          </div>

          {showSubjectForm && (
            <form onSubmit={handleAddSubject} className="mb-4 p-3 bg-gray-100 rounded">
              <input
                type="text"
                placeholder="Subject name"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                className="w-full border p-2 rounded mb-2"
                required
              />
              <textarea
                placeholder="Syllabus (optional)"
                value={subjectSyllabus}
                onChange={(e) => setSubjectSyllabus(e.target.value)}
                className="w-full border p-2 rounded mb-2"
                rows="2"
              />
              <button
                type="submit"
                className="w-full bg-green-600 text-white py-1 rounded hover:bg-green-700 text-sm"
              >
                Save Subject
              </button>
            </form>
          )}

          {subjects.length > 0 ? (
            <ul className="mt-3 text-sm text-gray-600 space-y-2">
              {subjects.map(subject => (
                <li key={subject._id} className="py-2 border-b">
                  <strong>{subject.name}</strong>
                  {subject.syllabus && <p className="text-xs text-gray-500 mt-1">{subject.syllabus}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 mt-3">No subjects yet</p>
          )}
        </div>

        {/* Study Schedule Card */}
        <Link to="/study-schedule" className="bg-white p-5 rounded-xl shadow hover:shadow-lg transition cursor-pointer">
          <h3 className="font-semibold text-lg mb-3">Study Schedule</h3>
          <p className="text-gray-600">
            Plan your weekly study sessions
          </p>
        </Link>

        {/* Progress Card */}
        <Link to="/progress" className="bg-white p-5 rounded-xl shadow hover:shadow-lg transition cursor-pointer">
          <h3 className="font-semibold text-lg mb-3">Progress ({progress.length})</h3>
          {progress.length > 0 ? (
            <ul className="mt-3 text-sm text-gray-600 space-y-2">
              {progress.slice(0, 3).map(item => (
                <li key={item._id} className="py-2 border-b">
                  <strong>{item.topic}</strong>
                  <span className={`ml-2 ${item.completed ? "text-green-600" : "text-orange-600"}`}>
                    {item.completed ? "✓" : "○"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 mt-3">No progress tracked yet</p>
          )}
        </Link>

        {/* Today's Tasks Card */}
        <div className="bg-white p-5 rounded-xl shadow">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-lg">Today's Focus ({tasks.length})</h3>
            <button
              onClick={() => setShowTaskForm(!showTaskForm)}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
            >
              + Add
            </button>
          </div>

          {showTaskForm && (
            <form onSubmit={handleAddTask} className="mb-4 p-3 bg-gray-100 rounded">
              <input
                type="text"
                placeholder="Task title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="w-full border p-2 rounded mb-2"
                required
              />
              <button
                type="submit"
                className="w-full bg-green-600 text-white py-1 rounded hover:bg-green-700 text-sm"
              >
                Add Task
              </button>
            </form>
          )}

          {tasks.length > 0 ? (
            <ul className="list-disc list-inside text-gray-600 mt-2 space-y-1">
              {tasks.map(task => (
                <li key={task._id} className="text-sm">{task.title}</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 mt-3">No tasks for today</p>
          )}
        </div>

        {/* <div className="bg-white p-5 rounded-xl shadow">
          <h3 className="font-semibold text-lg">AI Suggestions</h3>
          <p className="text-gray-600 mt-2">
            Personalized smart tips based on your progress
          </p>
        </div> */}

      </div>
    </div>
  );
};

export default Dashboard;