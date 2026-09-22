import { BrowserRouter, Routes, Route } from "react-router";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./components/Toast";
import ErrorBoundary from "./components/ErrorBoundary";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import SubjectsPage from "./pages/SubjectsPage";
import StudySchedule from "./pages/StudySchedule";
import TaskManager from "./pages/TaskManager";
import AiStudyPlanner from "./pages/AiStudyPlanner";
import ProgressTracker from "./pages/ProgressTracker";
import QuizCenter from "./pages/QuizCenter";
import FlashcardStudio from "./pages/FlashcardStudio";
import AiAssistantPage from "./pages/AiAssistantPage";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import ExamsGoalsPage from "./pages/ExamsGoalsPage";

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/subjects" element={<SubjectsPage />} />
              <Route path="/study-schedule" element={<StudySchedule />} />
              <Route path="/tasks" element={<TaskManager />} />
              <Route path="/ai-planner" element={<AiStudyPlanner />} />
              <Route path="/progress" element={<ProgressTracker />} />
              <Route path="/quizzes" element={<QuizCenter />} />
              <Route path="/flashcards" element={<FlashcardStudio />} />
              <Route path="/ai-assistant" element={<AiAssistantPage />} />
              <Route path="/analytics" element={<AnalyticsDashboard />} />
              <Route path="/goals" element={<ExamsGoalsPage />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;