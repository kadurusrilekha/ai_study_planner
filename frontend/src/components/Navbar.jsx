import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import API from "../api";
import {
  Menu,
  Search,
  Bell,
  Sparkles,
  Calendar,
  Check,
  User,
  Settings,
  X,
  Loader2,
  BookOpen,
  CheckSquare,
  HelpCircle,
  Layers,
  Award,
  ChevronRight
} from "lucide-react";
import { useToast } from "./Toast";
import ProfileSettingsModal from "./ProfileSettingsModal";

const Navbar = ({ onOpenMobileMenu, onOpenFocusModal }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const searchContainerRef = useRef(null);
  const navigate = useNavigate();
  const { addToast } = useToast();
  const user = JSON.parse(localStorage.getItem("user")) || {};

  const todayDateStr = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  const notifications = [
    { id: 1, title: "Study Goal Reminder", desc: "You have 2 scheduled sessions left today.", time: "10m ago" },
    { id: 2, title: "Study Goal Achieved!", desc: "You completed your focus session yesterday.", time: "2h ago" },
    { id: 3, title: "AI Learning Coach Tip", desc: "Reviewing topics after 24h improves retention by 80%.", time: "1d ago" }
  ];

  // Debounced live search
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults(null);
      setShowResults(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setShowResults(true);

    const timer = setTimeout(async () => {
      try {
        const res = await API.get("/search", { params: { q: trimmed } });
        if (res.data && res.data.success) {
          setSearchResults(res.data);
        }
      } catch (err) {
        console.error("Search API error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside and Escape key handler
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleClearNotifications = () => {
    setUnreadCount(0);
    addToast("All notifications marked as read", "info");
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
    setShowResults(false);
  };

  const handleResultClick = (path) => {
    setShowResults(false);
    navigate(path);
  };

  const hasResults =
    searchResults &&
    searchResults.totalMatches > 0 &&
    searchResults.results;

  return (
    <>
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-[#E8E5DE] px-4 md:px-8 py-3.5 transition-colors">
        <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
          {/* Left Side: Mobile Menu Button & Date */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenMobileMenu}
              className="md:hidden p-2 rounded-xl text-[#667085] hover:bg-[#FAF8F3] transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-[#2F3542] bg-[#FAF8F3] px-3.5 py-1.5 rounded-full border border-[#E8E5DE]">
              <Calendar className="w-3.5 h-3.5 text-[#E4ACB2]" />
              <span>{todayDateStr}</span>
            </div>
          </div>

          {/* Middle: Live Search Bar & Floating Dropdown */}
          <div ref={searchContainerRef} className="flex-1 max-w-md relative hidden md:block">
            <form onSubmit={(e) => e.preventDefault()} className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#667085]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.trim() && setShowResults(true)}
                placeholder="Search subjects, tasks, quizzes, flashcards, goals..."
                className="w-full bg-[#FAF8F3] text-[#2F3542] pl-10 pr-9 py-2 rounded-xl text-xs font-semibold border border-[#E8E5DE] focus:border-[#E4ACB2] focus:bg-white focus:outline-none transition-all placeholder-[#667085]"
              />
              {isSearching ? (
                <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#E4ACB2] animate-spin" />
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667085] hover:text-[#2F3542]"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : null}
            </form>

            {/* Results Dropdown */}
            {showResults && (
              <div className="absolute left-0 right-0 mt-2 bg-white border border-[#E8E5DE] rounded-2xl shadow-xl max-h-96 overflow-y-auto z-50 p-3 space-y-3 animate-in fade-in slide-in-from-top-2">
                {isSearching ? (
                  <div className="p-4 text-center text-xs font-semibold text-[#4B5563] flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#E4ACB2]" /> Searching study materials...
                  </div>
                ) : hasResults ? (
                  <>
                    <div className="flex items-center justify-between pb-2 border-b border-[#E8E5DE] px-1">
                      <span className="text-[11px] font-bold text-[#4B5563] uppercase tracking-wider">
                        Matches for "{searchResults.query}"
                      </span>
                      <span className="text-[11px] font-bold text-[#2F3542] bg-[#FAF8F3] px-2 py-0.5 rounded-md border border-[#E8E5DE]">
                        {searchResults.totalMatches} result{searchResults.totalMatches > 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Subjects */}
                    {searchResults.results.subjects && searchResults.results.subjects.length > 0 && (
                      <div>
                        <div className="text-[11px] font-bold text-[#2F3542] flex items-center gap-1.5 mb-1.5 px-1">
                          <BookOpen className="w-3.5 h-3.5 text-[#E4ACB2]" /> Subjects
                        </div>
                        <div className="space-y-1">
                          {searchResults.results.subjects.map((s) => (
                            <button
                              key={s._id}
                              onClick={() => handleResultClick("/subjects")}
                              className="w-full text-left p-2 rounded-xl bg-[#FAF8F3] hover:bg-[#F7E8EA] transition-colors flex items-center justify-between group"
                            >
                              <div>
                                <div className="text-xs font-bold text-[#2F3542]">{s.name}</div>
                                {s.syllabus && (
                                  <div className="text-[11px] text-[#4B5563] line-clamp-1">{s.syllabus}</div>
                                )}
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-[#667085] group-hover:text-[#2F3542] transition-colors" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI Study Plan & Schedules */}
                    {searchResults.results.schedules && searchResults.results.schedules.length > 0 && (
                      <div>
                        <div className="text-[11px] font-bold text-[#2F3542] flex items-center gap-1.5 mb-1.5 px-1">
                          <Calendar className="w-3.5 h-3.5 text-[#E4ACB2]" /> AI Study Plan & Schedules
                        </div>
                        <div className="space-y-1">
                          {searchResults.results.schedules.map((sch) => (
                            <button
                              key={sch._id}
                              onClick={() => handleResultClick("/study-schedule")}
                              className="w-full text-left p-2 rounded-xl bg-[#FAF8F3] hover:bg-[#F7E8EA] transition-colors flex items-center justify-between group"
                            >
                              <div>
                                <div className="text-xs font-bold text-[#2F3542]">
                                  {sch.topic || "Study Session"} <span className="font-normal text-[#4B5563]">({sch.subject?.name || "General"})</span>
                                </div>
                                <div className="text-[11px] text-[#4B5563]">
                                  {sch.day ? `${sch.day} ` : ""}{sch.startTime ? `at ${sch.startTime}` : ""} • {sch.type || "Study"}
                                </div>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-[#667085] group-hover:text-[#2F3542] transition-colors" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tasks */}
                    {searchResults.results.tasks && searchResults.results.tasks.length > 0 && (
                      <div>
                        <div className="text-[11px] font-bold text-[#2F3542] flex items-center gap-1.5 mb-1.5 px-1">
                          <CheckSquare className="w-3.5 h-3.5 text-[#CCD5AE]" /> Tasks
                        </div>
                        <div className="space-y-1">
                          {searchResults.results.tasks.map((t) => (
                            <button
                              key={t._id}
                              onClick={() => handleResultClick("/tasks")}
                              className="w-full text-left p-2 rounded-xl bg-[#FAF8F3] hover:bg-[#F0F3E7] transition-colors flex items-center justify-between group"
                            >
                              <div>
                                <div className="text-xs font-bold text-[#2F3542]">{t.title}</div>
                                <div className="text-[11px] text-[#4B5563]">
                                  {t.subject?.name || "General"} {t.topic ? `• ${t.topic}` : ""}
                                </div>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-[#E8E5DE] text-[#2F3542]">
                                {t.status || "Pending"}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quizzes */}
                    {searchResults.results.quizzes && searchResults.results.quizzes.length > 0 && (
                      <div>
                        <div className="text-[11px] font-bold text-[#2F3542] flex items-center gap-1.5 mb-1.5 px-1">
                          <HelpCircle className="w-3.5 h-3.5 text-[#E4ACB2]" /> Quizzes
                        </div>
                        <div className="space-y-1">
                          {searchResults.results.quizzes.map((q) => (
                            <button
                              key={q._id}
                              onClick={() => handleResultClick("/quizzes")}
                              className="w-full text-left p-2 rounded-xl bg-[#FAF8F3] hover:bg-[#F7E8EA] transition-colors flex items-center justify-between group"
                            >
                              <div>
                                <div className="text-xs font-bold text-[#2F3542]">{q.title}</div>
                                <div className="text-[11px] text-[#4B5563]">{q.topic || "General"}</div>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-[#E8E5DE] text-[#2F3542]">
                                {q.difficulty || "Medium"}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Flashcards */}
                    {searchResults.results.flashcards && searchResults.results.flashcards.length > 0 && (
                      <div>
                        <div className="text-[11px] font-bold text-[#2F3542] flex items-center gap-1.5 mb-1.5 px-1">
                          <Layers className="w-3.5 h-3.5 text-[#CCD5AE]" /> Flashcards
                        </div>
                        <div className="space-y-1">
                          {searchResults.results.flashcards.map((f) => (
                            <button
                              key={f._id}
                              onClick={() => handleResultClick("/flashcards")}
                              className="w-full text-left p-2 rounded-xl bg-[#FAF8F3] hover:bg-[#F0F3E7] transition-colors flex items-center justify-between group"
                            >
                              <div className="pr-2">
                                <div className="text-xs font-bold text-[#2F3542] line-clamp-1">{f.front}</div>
                                <div className="text-[11px] text-[#4B5563] line-clamp-1">{f.back}</div>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-[#667085] shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Exams */}
                    {searchResults.results.exams && searchResults.results.exams.length > 0 && (
                      <div>
                        <div className="text-[11px] font-bold text-[#2F3542] flex items-center gap-1.5 mb-1.5 px-1">
                          <Award className="w-3.5 h-3.5 text-[#E4ACB2]" /> Exams & Goals
                        </div>
                        <div className="space-y-1">
                          {searchResults.results.exams.map((ex) => (
                            <button
                              key={ex._id}
                              onClick={() => handleResultClick("/goals")}
                              className="w-full text-left p-2 rounded-xl bg-[#FAF8F3] hover:bg-[#F7E8EA] transition-colors flex items-center justify-between group"
                            >
                              <div>
                                <div className="text-xs font-bold text-[#2F3542]">{ex.title}</div>
                                <div className="text-[11px] text-[#4B5563]">
                                  {ex.examDate ? new Date(ex.examDate).toLocaleDateString() : "Upcoming"}
                                </div>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-[#667085]" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-6 text-center space-y-1.5">
                    <div className="text-xs font-bold text-[#2F3542]">
                      No matching study materials found for "{searchQuery}"
                    </div>
                    <p className="text-[11px] text-[#4B5563]">
                      Try searching by subject name, task title, quiz topic, or flashcard text.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Side: Quick Action Buttons */}
          <div className="flex items-center gap-2.5">
            {/* Focus Mode Trigger */}
            <button
              type="button"
              onClick={onOpenFocusModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#E4ACB2] text-[#2F3542] text-xs font-bold shadow-sm hover:bg-[#D69AA2] transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Focus Mode</span>
            </button>

            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 rounded-xl text-[#2F3542] hover:bg-[#FAF8F3] transition-colors"
              >
                <Bell className="w-4.5 h-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#E4ACB2] ring-2 ring-white animate-pulse" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-[#E8E5DE] rounded-2xl shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#E8E5DE]">
                    <h4 className="font-heading font-bold text-sm text-[#2F3542]">Notifications</h4>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleClearNotifications}
                        className="text-[11px] font-bold text-[#2F3542] hover:underline flex items-center gap-1"
                      >
                        <Check className="w-3 h-3 text-[#E4ACB2]" /> Mark all read
                      </button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className="p-2.5 rounded-xl bg-[#FAF8F3] hover:bg-[#F7E8EA] transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-bold text-[#2F3542]">{n.title}</span>
                          <span className="text-[10px] text-[#667085] font-semibold">{n.time}</span>
                        </div>
                        <p className="text-xs text-[#4B5563] font-medium mt-0.5">{n.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile & Settings Trigger */}
            <div className="flex items-center gap-2 pl-2 border-l border-[#E8E5DE]">
              <button
                onClick={() => setShowSettingsModal(true)}
                className="w-8 h-8 rounded-full bg-[#E4ACB2] text-[#2F3542] font-bold text-xs flex items-center justify-center shadow-sm hover:opacity-90 transition-opacity"
                title="Account Settings & Profile"
              >
                {(user.name || "U").charAt(0).toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Profile & Settings Modal */}
      <ProfileSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </>
  );
};

export default Navbar;
