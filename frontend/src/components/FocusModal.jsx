import React, { useState, useEffect } from "react";
import { X, Play, Pause, RotateCcw, CheckCircle, Sparkles, Flame, Volume2, VolumeX } from "lucide-react";
import { useToast } from "./Toast";

const FocusModal = ({ isOpen, onClose, activeTask, onCompleteTask }) => {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 min default
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    let timer;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      addToast("Focus session complete! Take a break 🎉", "success");
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft, addToast]);

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const totalSeconds = 25 * 60;
  const progressPercent = ((totalSeconds - timeLeft) / totalSeconds) * 100;

  const handleTogglePlay = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(25 * 60);
  };

  const handleFinish = () => {
    setIsRunning(false);
    if (activeTask && onCompleteTask) {
      onCompleteTask(activeTask);
    }
    addToast("Great job! Session completed successfully!", "success");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white border border-[#E8E5DE] rounded-3xl p-8 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#F7E8EA] text-[#E4ACB2]">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-heading font-bold text-lg text-[#2F3542]">AI Focus Mode</h3>
              <p className="text-xs text-[#667085]">Distraction-free deep work session</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#98A0A8] hover:text-[#2F3542] rounded-xl hover:bg-[#FAF8F3] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Task Display */}
        <div className="bg-[#FAF8F3] border border-[#E8E5DE] p-4 rounded-2xl mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-[#E4ACB2]">
            Target Topic / Task
          </span>
          <p className="font-bold text-[#2F3542] text-base mt-1">
            {activeTask ? (typeof activeTask === "string" ? activeTask : activeTask.title || activeTask.name || activeTask.topic) : "General Deep Study Session"}
          </p>
        </div>

        {/* Timer Visualization */}
        <div className="flex flex-col items-center justify-center my-6">
          <div className="relative w-56 h-56 flex items-center justify-center">
            {/* SVG Circular Progress */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="44"
                className="text-[#E8E5DE] stroke-current"
                strokeWidth="6"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="44"
                className="text-[#E4ACB2] stroke-current transition-all duration-1000 ease-linear"
                strokeWidth="6"
                strokeDasharray={276}
                strokeDashoffset={276 - (276 * progressPercent) / 100}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-heading font-black text-4xl text-[#2F3542] tracking-tight">
                {formattedTime}
              </span>
              <span className="text-xs font-semibold text-[#667085] mt-1 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-[#E4ACB2] fill-[#E4ACB2] inline" /> {isRunning ? "Focusing..." : "Paused"}
              </span>
            </div>
          </div>
        </div>

        {/* Motivational Tip */}
        <p className="text-center text-xs text-[#667085] mb-8 italic font-medium">
          "Deep work creates high value, improves skills, and is hard to replicate."
        </p>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleReset}
            className="p-3.5 rounded-2xl bg-[#FAF8F3] text-[#2F3542] hover:bg-[#F0F3E7] transition-colors border border-[#E8E5DE]"
            title="Reset Timer"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleTogglePlay}
            className="px-8 py-3.5 rounded-2xl bg-[#E4ACB2] hover:bg-[#D69AA2] text-[#2F3542] font-bold flex items-center gap-2 shadow-sm transition-all transform hover:scale-105 active:scale-95"
          >
            {isRunning ? (
              <>
                <Pause className="w-5 h-5 fill-current" /> Pause
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current ml-0.5" /> Start Focus
              </>
            )}
          </button>

          <button
            onClick={handleFinish}
            className="p-3.5 rounded-2xl bg-[#F0F3E7] text-[#2F3542] hover:bg-[#CCD5AE] transition-colors border border-[#CCD5AE]"
            title="Mark Completed"
          >
            <CheckCircle className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FocusModal;
