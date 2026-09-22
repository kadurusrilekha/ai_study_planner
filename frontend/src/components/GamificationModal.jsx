import React from "react";
import { X, Trophy, Award, Sparkles, CheckCircle2, Lock, Zap } from "lucide-react";

const GamificationModal = ({ isOpen, onClose, stats = {} }) => {
  if (!isOpen) return null;

  const xp = stats.xp || 0;
  const level = stats.level || Math.max(1, Math.floor(xp / 200) + 1);
  const achievements = stats.achievements || [];

  const currentLevelXp = xp % 200;
  const levelProgressPct = Math.round((currentLevelXp / 200) * 100);

  const getLevelTitle = (lvl) => {
    if (lvl >= 10) return "Grandmaster Scholar";
    if (lvl >= 5) return "Master of Deep Work";
    if (lvl >= 3) return "Focused Strategist";
    return "Dedicated Scholar";
  };

  const hasBadge = (id) => achievements.some((a) => a.id === id);

  const badgesList = [
    {
      id: "first_task",
      title: "Task Crusher",
      icon: Award,
      description: "Completed your first focus task.",
      unlocked: hasBadge("first_task"),
      progressText: hasBadge("first_task") ? "Completed" : "0 / 1 task",
      progressPct: hasBadge("first_task") ? 100 : 0
    },
    {
      id: "quiz_master",
      title: "Quiz Master",
      icon: Sparkles,
      description: "Completed an interactive study quiz.",
      unlocked: hasBadge("quiz_master"),
      progressText: hasBadge("quiz_master") ? "Completed" : "0 / 1 quiz",
      progressPct: hasBadge("quiz_master") ? 100 : 0
    },
    {
      id: "first_login",
      title: "Welcome Scholar",
      icon: Zap,
      description: "Created your AI Study Planner account.",
      unlocked: true,
      progressText: "Unlocked",
      progressPct: 100
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white border border-[#E8E5DE] rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E8E5DE] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#F0F3E7] text-[#2F3542]">
              <Trophy className="w-6 h-6 text-[#2F3542]" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-xl text-[#2F3542]">
                Gamification & Progress Hub
              </h3>
              <p className="text-xs text-[#4B5563] font-semibold">
                Track your XP, level progression, and study achievements
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#98A0A8] hover:text-[#2F3542] rounded-xl hover:bg-[#FAF8F3] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Level & XP Overview Card */}
        <div className="p-5 rounded-2xl bg-[#F0F3E7] border border-[#CCD5AE]/60 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#4B5563]">
                Current Tier
              </span>
              <div className="font-heading font-black text-2xl text-[#2F3542] mt-0.5">
                Level {level} — {getLevelTitle(level)}
              </div>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-[#E4ACB2] text-[#2F3542] font-black text-sm shadow-sm">
              {xp} XP
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-[#CCD5AE]/40">
            <div className="flex justify-between text-xs font-bold text-[#2F3542]">
              <span>Level {level} Progress</span>
              <span>{currentLevelXp} / 200 XP</span>
            </div>
            <div className="w-full h-3 bg-white rounded-full overflow-hidden border border-[#CCD5AE]/60">
              <div
                className="h-full bg-[#E4ACB2] rounded-full transition-all duration-500"
                style={{ width: `${levelProgressPct}%` }}
              />
            </div>
            <p className="text-[11px] text-[#4B5563] font-semibold text-right">
              {200 - currentLevelXp} XP remaining to Level {level + 1}
            </p>
          </div>
        </div>

        {/* Achievements & Badges List */}
        <div className="space-y-3">
          <h4 className="font-heading font-bold text-base text-[#2F3542] flex items-center justify-between">
            <span>Achievements & Badges</span>
            <span className="text-xs text-[#4B5563] font-normal">
              {badgesList.filter((b) => b.unlocked).length} of {badgesList.length} Unlocked
            </span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {badgesList.map((badge) => {
              const Icon = badge.icon;
              return (
                <div
                  key={badge.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    badge.unlocked
                      ? "bg-white border-[#CCD5AE] shadow-sm"
                      : "bg-[#FAF8F3] border-[#E8E5DE] opacity-80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`p-2 rounded-xl ${
                          badge.unlocked
                            ? "bg-[#E4ACB2] text-[#2F3542]"
                            : "bg-[#E8E5DE] text-[#667085]"
                        }`}
                      >
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#2F3542]">
                          {badge.title}
                        </div>
                        <span className="text-[10px] text-[#4B5563] font-semibold">
                          {badge.progressText}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 ${
                        badge.unlocked
                          ? "bg-[#F0F3E7] text-[#2F3542] border border-[#CCD5AE]"
                          : "bg-white text-[#667085] border border-[#E8E5DE]"
                      }`}
                    >
                      {badge.unlocked ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-[#2F3542]" /> Unlocked
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3 text-[#667085]" /> Locked
                        </>
                      )}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#4B5563] font-medium leading-tight mb-2">
                    "{badge.description}"
                  </p>

                  <div className="w-full h-1.5 bg-[#E8E5DE] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        badge.unlocked ? "bg-[#E4ACB2]" : "bg-[#CCD5AE]"
                      }`}
                      style={{ width: `${badge.progressPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamificationModal;
