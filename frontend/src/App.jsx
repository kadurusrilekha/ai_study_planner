import { BrowserRouter, Routes, Route } from "react-router";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import StudySchedule from "./pages/StudySchedule";
import ProgressTracker from "./pages/ProgressTracker";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/study-schedule" element={<StudySchedule />} />
        <Route path="/progress" element={<ProgressTracker />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;