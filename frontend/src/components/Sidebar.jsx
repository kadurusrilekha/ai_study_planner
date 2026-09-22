import React from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  CheckSquare,
  Sparkles,
  HelpCircle,
  BarChart3,
  Brain,
  Target,
  LogOut,
  Flame,
  X,
  Layers,
  ChevronRight
} from "lucide-react";
import { useToast } from "./Toast";
import GamificationWidget from "./GamificationWidget";

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const user = JSON.parse(localStorage.getItem("user")) || {};

  const mainNav = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Subjects", path: "/subjects", icon: BookOpen },
    { name: "Study Planner", path: "/study-schedule", icon: Calendar },
    { name: "Task Manager", path: "/tasks", icon: CheckSquare },
    { name: "AI Study Planner", path: "/ai-planner", icon: Sparkles, badge: "AI" },
    { name: "Progress Matrix", path: "/progress", icon: Layers },
  ];

  const secondaryNav = [
    { name: "AI Assistant", path: "/ai-assistant", icon: Brain, badge: "Chat" },
    { name: "Quiz Center", path: "/quizzes", icon: HelpCircle, badge: "AI" },
    { name: "Flashcard Studio", path: "/flashcards", icon: Layers, badge: "SRS" },
    { name: "Analytics", path: "/analytics", icon: BarChart3 },
    { name: "Exams & Goals", path: "/goals", icon: Target },
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    addToast("Logged out successfully", "info");
    navigate("/");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#CCD5AE] border-r border-[#B9C89A] w-64 select-none">
      {/* Brand Header */}
      <div className="p-5 flex items-center justify-between border-b border-[#B9C89A]">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#E4ACB2] text-[#2F3542] flex items-center justify-center font-bold shadow-sm">
            <Brain className="w-5 h-5 text-[#2F3542]" />
          </div>
          <div>
            <h1 className="font-heading font-extrabold text-base text-[#2F3542]">
              AI Study Planner
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#2F3542]">
              Pro Edition
            </span>
          </div>
        </Link>
        {isOpen && (
          <button
            onClick={onClose}
            className="md:hidden p-1.5 text-[#2F3542] hover:text-black rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Main Section */}
        <div>
          <p className="px-3 text-[11px] font-bold text-[#2F3542] uppercase tracking-wider mb-2">
            Workspace
          </p>
          <nav className="space-y-1">
            {mainNav.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
                    isActive
                      ? "bg-[#F7E8EA] text-[#2F3542] shadow-sm border border-[#E4ACB2]/60"
                      : "text-[#2F3542] hover:bg-[#F0F3E7]/80"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4.5 h-4.5 ${isActive ? "text-[#E4ACB2]" : "text-[#2F3542]"}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge ? (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? "bg-[#E4ACB2] text-[#2F3542]" : "bg-[#F0F3E7] text-[#2F3542]"}`}>
                      {item.badge}
                    </span>
                  ) : isActive ? (
                    <ChevronRight className="w-4 h-4 text-[#E4ACB2]" />
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Learning Suite */}
        <div>
          <p className="px-3 text-[11px] font-bold text-[#2F3542] uppercase tracking-wider mb-2">
            Intelligent Engine
          </p>
          <nav className="space-y-1">
            {secondaryNav.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
                    isActive
                      ? "bg-[#F7E8EA] text-[#2F3542] shadow-sm border border-[#E4ACB2]/60"
                      : "text-[#2F3542] hover:bg-[#F0F3E7]/80"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4.5 h-4.5 ${isActive ? "text-[#E4ACB2]" : "text-[#2F3542]"}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? "bg-[#E4ACB2] text-[#2F3542]" : "bg-[#F0F3E7] text-[#2F3542]"}`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Real Gamification & XP Widget */}
        <GamificationWidget />
      </div>

      {/* Footer Profile & Controls */}
      <div className="p-4 border-t border-[#B9C89A] space-y-3">
        {/* User Badge */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[#E4ACB2] text-[#2F3542] font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
              {(user.name || "U").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#2F3542] truncate">
                {user.name || "Student User"}
              </p>
              <p className="text-[11px] text-[#2F3542] truncate">{user.email || "student@ai.edu"}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            className="p-2 text-[#2F3542] hover:text-rose-600 rounded-xl hover:bg-[#F0F3E7]/80 transition-colors"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:block fixed top-0 left-0 bottom-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="md:hidden fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`md:hidden fixed top-0 left-0 bottom-0 z-50 transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent />
      </aside>
    </>
  );
};

export default Sidebar;
