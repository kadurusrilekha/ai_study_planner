import React, { useState } from "react";
import { X, User, Mail, Target, Bell, Lock, Shield, Save } from "lucide-react";
import { useToast } from "./Toast";

const ProfileSettingsModal = ({ isOpen, onClose }) => {
  const { addToast } = useToast();
  const storedUser = JSON.parse(localStorage.getItem("user")) || { name: "Student", email: "student@ai.edu" };

  const [name, setName] = useState(storedUser.name || "");
  const [email, setEmail] = useState(storedUser.email || "");
  const [dailyGoalHours, setDailyGoalHours] = useState("3.0");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [studyGoalReminders, setStudyGoalReminders] = useState(true);

  if (!isOpen) return null;

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await API.put("/auth/profile", { name, email });
      if (res.data && res.data.success && res.data.user) {
        localStorage.setItem("user", JSON.stringify(res.data.user));
        addToast("Profile & Settings saved successfully! ✨", "success");
        onClose();
        window.dispatchEvent(new Event("storage"));
      }
    } catch (err) {
      console.error("Failed to update profile", err);
      addToast("Failed to update profile settings", "error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-lg bg-white border border-[#E8E5DE] rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E8E5DE] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E4ACB2] text-[#2F3542] font-bold flex items-center justify-center shadow-sm">
              {(name || "U").charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-lg text-[#2F3542]">Account Settings</h3>
              <p className="text-xs text-[#4B5563] font-medium">Manage profile details & preferences</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#667085] hover:text-[#2F3542] rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSaveProfile} className="space-y-5">
          {/* Section 1: Profile Information */}
          <div className="space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#2F3542] block">
              Profile Details
            </span>

            <div>
              <label className="text-xs font-bold text-[#2F3542] block mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#667085]" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl pl-10 pr-4 py-2.5 text-xs md:text-sm text-[#2F3542] font-semibold focus:border-[#E4ACB2] outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#2F3542] block mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#667085]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl pl-10 pr-4 py-2.5 text-xs md:text-sm text-[#2F3542] font-semibold focus:border-[#E4ACB2] outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#2F3542] block mb-1">Target Daily Study Hours</label>
              <div className="relative">
                <Target className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#667085]" />
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="12"
                  value={dailyGoalHours}
                  onChange={(e) => setDailyGoalHours(e.target.value)}
                  className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl pl-10 pr-4 py-2.5 text-xs md:text-sm text-[#2F3542] font-semibold focus:border-[#E4ACB2] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Preferences */}
          <div className="space-y-3 pt-2 border-t border-[#E8E5DE]">
            <span className="text-xs font-bold uppercase tracking-wider text-[#E4ACB2] block">
              Preferences & Notifications
            </span>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF8F3]">
              <div className="flex items-center gap-2.5 text-xs font-semibold text-[#2F3542]">
                <Bell className="w-4 h-4 text-[#E4ACB2]" />
                <span>Email Session Reminders</span>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-4 h-4 accent-[#E4ACB2] cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF8F3]">
              <div className="flex items-center gap-2.5 text-xs font-semibold text-[#2F3542]">
                <Shield className="w-4 h-4 text-[#CCD5AE]" />
                <span>Daily Study Goal Alerts</span>
              </div>
              <input
                type="checkbox"
                checked={studyGoalReminders}
                onChange={(e) => setStudyGoalReminders(e.target.checked)}
                className="w-4 h-4 accent-[#E4ACB2] cursor-pointer"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#667085] hover:text-[#2F3542]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-bold bg-[#E4ACB2] hover:bg-[#D69AA2] text-[#2F3542] rounded-xl shadow-sm flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" /> Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileSettingsModal;
