import React, { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Brain, Lock, Mail, User, ArrowRight, AlertCircle, Sparkles } from "lucide-react";
import { useToast } from "../components/Toast";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (data.success) {
        addToast("Registration successful! Please sign in.", "success");
        navigate("/");
      } else {
        setError(data.error || "Registration failed");
      }
    } catch (err) {
      setError("Server error. Please ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#FAF7F2] text-[#1E293B] overflow-x-hidden select-none">
      {/* LEFT PANEL - VIDEO (50% Desktop) */}
      <div className="relative w-full lg:w-1/2 h-[260px] sm:h-[340px] lg:h-auto lg:min-h-screen bg-[#1E293B] flex-shrink-0 overflow-hidden">
        {/* Background Video */}
        <video
          autoPlay
          muted
          loop
          playsInline
          src="/regvidio.mp4"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
        />

        {/* Subtle Dark Translucent Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1E293B]/70 via-[#1E293B]/20 to-[#1E293B]/40 pointer-events-none z-10" />

        {/* Decorative Branding Content over Video */}
        <div className="relative z-20 h-full p-6 sm:p-10 lg:p-14 flex flex-col justify-between text-white pointer-events-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-[#B2A5FF] shadow-lg">
              <Brain className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white drop-shadow-sm">
              AI Study Planner
            </span>
          </div>

          <div className="hidden lg:block space-y-4 max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-semibold text-[#E2F1E8]">
              <Sparkles className="w-3.5 h-3.5 text-[#B2A5FF]" />
              <span>Smart Habit & Goal Tracking</span>
            </div>
            <h2 className="font-heading text-3xl xl:text-4xl font-extrabold leading-tight text-white drop-shadow-md">
              Unlock Your Full Academic Potential
            </h2>
            <p className="text-sm text-slate-200/90 font-medium leading-relaxed">
              Join thousands of students organizing schedule, conquering exams, and building daily mastery with AI.
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - REGISTRATION FORM (50% Desktop) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-5 sm:p-8 lg:p-12 xl:p-16 bg-[#FAF7F2] min-h-screen lg:min-h-0">
        <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-3xl p-6 sm:p-8 md:p-10 shadow-xl shadow-slate-200/60 space-y-6">
          {/* Header */}
          <div className="space-y-2 text-center lg:text-left">
            <div className="w-12 h-12 rounded-2xl bg-[#E2F1E8] border border-[#86D3CE]/30 flex items-center justify-center text-[#1E293B] shadow-sm mb-4 lg:mx-0 mx-auto">
              <Brain className="w-6 h-6 text-[#1E293B]" />
            </div>
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#1E293B] tracking-tight">
              Create Your Account
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
              Start planning, learning, and achieving your study goals with AI.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-[#FDF2F2] border border-[#E7A3A3] text-[#1E293B] text-xs sm:text-sm flex items-center gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-[#E7A3A3] shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[#1E293B] block mb-1.5 uppercase tracking-wider">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
                <input
                  type="text"
                  placeholder="Alex Johnson"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:border-[#B2A5FF] focus:ring-4 focus:ring-[#B2A5FF]/25 transition-all font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#1E293B] block mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
                <input
                  type="email"
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:border-[#B2A5FF] focus:ring-4 focus:ring-[#B2A5FF]/25 transition-all font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#1E293B] block mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:border-[#B2A5FF] focus:ring-4 focus:ring-[#B2A5FF]/25 transition-all font-medium"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#B2A5FF] hover:bg-[#9E8EFE] text-[#1E293B] font-bold text-xs sm:text-sm shadow-md shadow-[#B2A5FF]/25 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-[#1E293B] border-t-transparent rounded-full animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Complete Registration</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="pt-2 text-center">
            <p className="text-xs sm:text-sm text-[#64748B]">
              Already registered?{" "}
              <Link to="/" className="text-[#B2A5FF] font-bold hover:underline hover:text-[#9E8EFE] transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;