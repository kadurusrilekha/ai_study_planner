import React, { useEffect, useState } from "react";
import API from "../api";
import { Zap, Award, Trophy, Sparkles, Star } from "lucide-react";
import GamificationModal from "./GamificationModal";

const GamificationWidget = () => {
  const [stats, setStats] = useState({
    xp: 0,
    level: 1,
    achievements: []
  });
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchGamificationStats();
  }, []);

  const fetchGamificationStats = async () => {
    try {
      const res = await API.get("/gamification").catch(() => ({
        data: { xp: 0, level: 1, achievements: [] }
      }));
      setStats(res.data || {});
    } catch (err) {
      console.error("Failed to load gamification data", err);
    }
  };

  const xp = stats.xp || 0;
  const currentLevelXp = xp % 200;
  const levelProgressPct = Math.round((currentLevelXp / 200) * 100);

  const getLevelTitle = (lvl) => {
    if (lvl >= 10) return "Grandmaster Scholar";
    if (lvl >= 5) return "Master of Deep Work";
    if (lvl >= 3) return "Focused Strategist";
    return "Dedicated Scholar";
  };

  return (
    <>
      <div
        onClick={() => setShowModal(true)}
        className="p-4 rounded-2xl bg-white/80 border border-[#B9C89A] hover:border-[#E4ACB2] transition-all cursor-pointer space-y-3 shadow-sm transform hover:scale-[1.01] active:scale-[0.99] group"
      >
        {/* Top Level & XP Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#E4ACB2] text-[#2F3542] font-bold text-xs flex items-center justify-center shadow-sm">
              Lvl {stats.level || 1}
            </div>
            <div>
              <h4 className="font-heading font-bold text-xs text-[#2F3542]">
                {getLevelTitle(stats.level || 1)}
              </h4>
              <span className="text-[10px] text-[#4B5563] font-bold">
                {xp} Total XP
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs font-bold text-[#2F3542] bg-[#F0F3E7] px-2.5 py-1 rounded-full border border-[#B9C89A] group-hover:bg-[#F7E8EA] transition-colors">
            <Trophy className="w-3.5 h-3.5 text-[#2F3542]" />
            <span>Badges</span>
          </div>
        </div>

        {/* Level XP Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-bold text-[#4B5563]">
            <span>Level {stats.level || 1} Progress</span>
            <span>{currentLevelXp} / 200 XP</span>
          </div>
          <div className="w-full h-2 bg-[#E8E5DE] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#E4ACB2] rounded-full transition-all duration-500"
              style={{ width: `${levelProgressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Gamification Modal */}
      <GamificationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        stats={stats}
      />
    </>
  );
};

export default GamificationWidget;
