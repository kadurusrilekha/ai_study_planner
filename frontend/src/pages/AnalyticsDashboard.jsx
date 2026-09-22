import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import API from "../api";
import AppLayout from "../components/AppLayout";
import { useToast } from "../components/Toast";
import {
  BarChart3,
  Clock,
  TrendingUp,
  Award,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Flame,
  ArrowUpRight,
  Target,
  AlertCircle
} from "lucide-react";

const AnalyticsDashboard = () => {
  const [data, setData] = useState({
    studyHours: { daily: "0.0", weekly: 0, monthly: 0, plannedWeekly: 0 },
    subjectMetrics: [],
    quizTrends: [],
    flashcardStats: { totalFlashcards: 0, masteredCount: 0, difficultCount: 0, retentionRate: 0 },
    taskStats: { total: 0, completed: 0, completionRate: 0 },
    heatmap: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/analytics");
      setData(res.data || {});
    } catch (err) {
      console.error("Analytics load error:", err);
      setError("Unable to load analytics data from server.");
      addToast("Failed to load analytics data", "error");
    } finally {
      setLoading(false);
    }
  };

  const { studyHours, subjectMetrics, quizTrends, flashcardStats, taskStats, heatmap } = data;

  const actualWeekly = Number(studyHours?.weekly) || 0;
  const plannedWeekly = Number(studyHours?.plannedWeekly) || 0;
  const plannedVsActualPct = plannedWeekly > 0 ? Math.min(100, Math.round((actualWeekly / plannedWeekly) * 100)) : (actualWeekly > 0 ? 100 : 0);

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="h-10 w-64 rounded-xl skeleton" />
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
            <div className="h-28 rounded-3xl skeleton" />
            <div className="h-28 rounded-3xl skeleton" />
            <div className="h-28 rounded-3xl skeleton" />
            <div className="h-28 rounded-3xl skeleton" />
          </div>
          <div className="h-44 rounded-3xl skeleton" />
          <div className="h-56 rounded-3xl skeleton" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8 pb-8">
        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
            <button
              onClick={fetchAnalyticsData}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-heading font-extrabold text-2xl md:text-3xl text-[#2F3542]">
              Analytics & Performance Insights
            </h2>
            <p className="text-xs md:text-sm text-[#4B5563]">
              Data-driven breakdown of study hours, quiz trends, and daily activity heatmaps
            </p>
          </div>
        </div>

        {/* Study Hours Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
          <div className="card-base rounded-3xl p-6 bg-white border border-[#E8E5DE] space-y-1">
            <span className="text-xs font-semibold text-[#4B5563] uppercase tracking-wider block">Daily Avg Hours</span>
            <h3 className="font-heading font-extrabold text-2xl text-[#2F3542]">
              {studyHours?.daily || "0.0"} hrs/day
            </h3>
          </div>

          <div className="card-base rounded-3xl p-6 bg-white border border-[#E8E5DE] space-y-1">
            <span className="text-xs font-semibold text-[#4B5563] uppercase tracking-wider block">Weekly Study Hours</span>
            <h3 className="font-heading font-extrabold text-2xl text-[#2F3542]">
              {studyHours?.weekly || 0} hrs
            </h3>
          </div>

          <div className="card-base rounded-3xl p-6 bg-white border border-[#E8E5DE] space-y-1">
            <span className="text-xs font-semibold text-[#4B5563] uppercase tracking-wider block">Monthly Total</span>
            <h3 className="font-heading font-extrabold text-2xl text-[#2F3542]">
              {studyHours?.monthly || 0} hrs
            </h3>
          </div>

          <div className="card-base rounded-3xl p-6 bg-white border border-[#E8E5DE] space-y-1">
            <span className="text-xs font-semibold text-[#4B5563] uppercase tracking-wider block">Task Completion Rate</span>
            <h3 className="font-heading font-extrabold text-2xl text-[#2F3542]">
              {taskStats?.completionRate || 0}%
            </h3>
          </div>
        </div>

        {/* Planned vs Actual Hours Comparison Card */}
        <div className="card-base rounded-3xl p-6 md:p-8 bg-white border border-[#E8E5DE] space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-[#F7E8EA] text-[#E4ACB2]">
                <Target className="w-5 h-5 text-[#2F3542]" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-[#2F3542]">
                  Planned vs Actual Weekly Hours
                </h3>
                <p className="text-xs text-[#4B5563]">Goal execution accuracy</p>
              </div>
            </div>

            <span className="font-heading font-extrabold text-xl text-[#2F3542]">
              {plannedVsActualPct}% Achieved
            </span>
          </div>

          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-[#2F3542]">Actual Completed: {studyHours?.weekly || 0} hrs</span>
                <span className="text-[#4B5563]">Target Goal: {studyHours?.plannedWeekly || 0} hrs</span>
              </div>
              <div className="w-full h-4 bg-[#FAF8F3] border border-[#E8E5DE] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#E4ACB2] rounded-full transition-all duration-700"
                  style={{ width: `${plannedVsActualPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Study Activity Heatmap */}
        <div className="card-base rounded-3xl p-6 md:p-8 bg-white border border-[#E8E5DE] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-[#F0F3E7] text-[#CCD5AE]">
                <Calendar className="w-5 h-5 text-[#2F3542]" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-[#2F3542]">
                  Study Activity Heatmap
                </h3>
                <p className="text-xs text-[#4B5563]">Daily focus density across past 4 months</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-[#4B5563] font-semibold">
              <span>Less</span>
              <span className="w-3 h-3 rounded bg-[#FAF8F3] border border-[#E8E5DE]" />
              <span className="w-3 h-3 rounded bg-[#F0F3E7]" />
              <span className="w-3 h-3 rounded bg-[#CCD5AE]" />
              <span className="w-3 h-3 rounded bg-[#E4ACB2]" />
              <span>More</span>
            </div>
          </div>

          {/* Heatmap Grid */}
          <div className="overflow-x-auto pt-2">
            {heatmap && heatmap.length > 0 ? (
              <div className="grid grid-flow-col grid-rows-7 gap-1.5 w-max">
                {heatmap.map((cell, idx) => (
                  <div
                    key={idx}
                    title={`Date: ${cell.date || "Day"} • Activity: ${cell.count || 0} sessions`}
                    className={`w-3.5 h-3.5 rounded-sm transition-all hover:scale-125 ${
                      cell.intensity === 0
                        ? "bg-[#FAF8F3]"
                        : cell.intensity === 1
                        ? "bg-[#F0F3E7]"
                        : cell.intensity === 2
                        ? "bg-[#CCD5AE]"
                        : "bg-[#E4ACB2]"
                    }`}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#667085] py-4 italic">No study activity recorded in heatmap yet.</p>
            )}
          </div>
        </div>

        {/* Grid 2: Subject Performance & Quiz Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Subject Performance Comparison */}
          <div className="card-base rounded-3xl p-6 md:p-8 bg-white border border-[#E8E5DE] space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-[#F7E8EA] text-[#E4ACB2]">
                <BarChart3 className="w-5 h-5 text-[#2F3542]" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-[#2F3542]">
                  Subject Performance Breakdown
                </h3>
                <p className="text-xs text-[#4B5563]">Hours, progress %, and quiz accuracy</p>
              </div>
            </div>

            {subjectMetrics && subjectMetrics.length > 0 ? (
              <div className="space-y-4">
                {subjectMetrics.map((sub, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-[#FAF8F3] border border-[#E8E5DE] space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-sm text-[#2F3542]">{sub.name}</h4>
                      <span className="text-xs font-bold text-[#2F3542]">{sub.hours} hrs logged</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                      <div>
                        <span className="text-[#4B5563] block text-[10px]">Topic Progress</span>
                        <span className="font-bold text-[#2F3542]">{sub.progressPct}%</span>
                      </div>
                      <div>
                        <span className="text-[#4B5563] block text-[10px]">Quiz Accuracy</span>
                        <span className="font-bold text-[#2F3542]">{sub.quizAccuracy !== null ? `${sub.quizAccuracy}%` : "No Quizzes"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center bg-[#FAF8F3] rounded-2xl border border-dashed border-[#E8E5DE]">
                <p className="text-xs text-[#667085] font-medium">No subjects found. Create subjects to see performance metrics.</p>
              </div>
            )}
          </div>

          {/* Quiz Score Trends */}
          <div className="card-base rounded-3xl p-6 md:p-8 bg-white border border-[#E8E5DE] space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-[#F0F3E7] text-[#CCD5AE]">
                <TrendingUp className="w-5 h-5 text-[#2F3542]" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-[#2F3542]">
                  Quiz Score Trends
                </h3>
                <p className="text-xs text-[#4B5563]">Score progression over time</p>
              </div>
            </div>

            {quizTrends && quizTrends.length > 0 ? (
              <div className="space-y-3">
                {quizTrends.map((q, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-[#FAF8F3] border border-[#E8E5DE] flex justify-between items-center">
                    <div>
                      <span className="font-bold text-sm text-[#2F3542]">{q.quizTitle || `Quiz #${idx + 1}`}</span>
                      <span className="text-xs text-[#4B5563] block">{q.date}</span>
                    </div>
                    <span className="font-heading font-extrabold text-lg text-[#2F3542]">
                      {q.score}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center bg-[#FAF8F3] rounded-2xl border border-dashed border-[#E8E5DE]">
                <p className="text-xs text-[#667085] font-medium">No quiz attempts recorded yet. Take a quiz to generate score trends.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AnalyticsDashboard;

