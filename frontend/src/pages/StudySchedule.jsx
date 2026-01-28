import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import API from "../api";

const StudySchedule = () => {
  const [schedule, setSchedule] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("1");
  const navigate = useNavigate();

  useEffect(() => {
    fetchSubjects();
    fetchSchedule();
  }, []);

  const fetchSubjects = async () => {
    try {
      const res = await API.get("/subjects");
      setSubjects(res.data);
    } catch (err) {
      console.error("Failed to fetch subjects", err);
    }
  };

  const fetchSchedule = async () => {
    try {
      const res = await API.get("/schedule");
      setSchedule(res.data);
    } catch (err) {
      console.error("Failed to fetch schedule", err);
    }
  };

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    if (!selectedSubject || !day || !time) return;

    try {
      await API.post("/schedule", {
        subject: selectedSubject,
        day,
        time,
        duration
      });
      setSelectedSubject("");
      setDay("");
      setTime("");
      setDuration("1");
      fetchSchedule();
    } catch (err) {
      console.error("Failed to add schedule", err);
    }
  };

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold">Study Schedule</h1>
        <button
          onClick={() => navigate("/dashboard")}
          className="bg-white text-blue-600 px-4 py-2 rounded hover:bg-gray-100"
        >
          Back to Dashboard
        </button>
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        {/* Add Schedule Form */}
        <div className="bg-white p-6 rounded-xl shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Add Study Schedule</h2>
          <form onSubmit={handleAddSchedule} className="grid grid-cols-1 md:grid-cols-5 gap-4">
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

            <select
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="border p-2 rounded"
              required
            >
              <option value="">Select Day</option>
              {days.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="border p-2 rounded"
              required
            />

            <input
              type="number"
              min="1"
              max="8"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="Hours"
              className="border p-2 rounded"
            />

            <button
              type="submit"
              className="bg-green-600 text-white rounded hover:bg-green-700"
            >
              Add
            </button>
          </form>
        </div>

        {/* Schedule Grid */}
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-xl font-semibold mb-4">Weekly Schedule</h2>
          {schedule.length > 0 ? (
            <div className="space-y-3">
              {schedule.map(item => (
                <div key={item._id} className="p-4 border rounded-lg bg-blue-50 flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{item.subject?.name || "Subject"}</p>
                    <p className="text-sm text-gray-600">{item.day} at {item.time} • {item.duration} hours</p>
                  </div>
                  <button
                    onClick={() => API.delete(`/schedule/${item._id}`).then(fetchSchedule)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No schedule created yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudySchedule;