import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import API from "../api";
import AppLayout from "../components/AppLayout";
import { useToast } from "../components/Toast";
import {
  Brain,
  Send,
  Sparkles,
  Bot,
  User,
  ArrowRight,
  Target,
  BookOpen,
  Calendar,
  HelpCircle,
  Layers,
  RotateCcw
} from "lucide-react";

const AiAssistantPage = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "ai",
      text: "Hello! I am your AI Study Coach. I have indexed your live subjects, upcoming exams, quiz accuracy, and pending tasks. How can I optimize your learning today?",
      actionLink: null,
      timestamp: "Just now"
    }
  ]);

  const [inputPrompt, setInputPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const { addToast } = useToast();
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user")) || {};

  const quickPrompts = [
    "What should I study today?",
    "Create a 7-day Python plan",
    "I have an exam in 10 days",
    "Which subject needs more attention?",
    "Why is my SQL progress low?",
    "What should I revise?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (customText = null) => {
    const textToSend = customText || inputPrompt;
    if (!textToSend.trim() || loading) return;

    const userMsg = {
      id: Date.now(),
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputPrompt("");
    setLoading(true);

    try {
      const res = await API.post("/ai/chat", { message: textToSend });

      if (res.data && res.data.success) {
        const aiMsg = {
          id: Date.now() + 1,
          sender: "ai",
          text: res.data.reply,
          actionLink: res.data.actionLink,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch (err) {
      console.error("AI Chat error:", err);
      addToast("Failed to connect to AI Assistant", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col space-y-4 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 card-base rounded-3xl shrink-0 bg-[#F7E8EA] border border-[#E4ACB2]/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E4ACB2] text-[#2F3542] flex items-center justify-center font-bold shadow-sm">
              <Brain className="w-5 h-5 text-[#2F3542]" />
            </div>
            <div>
              <h2 className="font-heading font-extrabold text-base md:text-lg text-[#2F3542] flex items-center gap-2">
                AI Study Assistant
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F0F3E7] text-[#2F3542] border border-[#CCD5AE] uppercase tracking-widest">
                  Context Active
                </span>
              </h2>
              <p className="text-xs text-[#4B5563] font-medium">
                Connected to live Subjects, Schedule, Quizzes, and SRS metrics
              </p>
            </div>
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0 select-none">
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt)}
              className="px-3.5 py-1.5 rounded-full bg-white border border-[#E8E5DE] text-xs font-bold text-[#2F3542] hover:bg-[#E4ACB2] hover:text-[#2F3542] transition-all whitespace-nowrap shadow-sm"
            >
              ⚡ {prompt}
            </button>
          ))}
        </div>

        {/* Chat Thread Workspace */}
        <div className="flex-1 card-base rounded-3xl p-4 md:p-6 overflow-y-auto space-y-4 bg-[#FAF8F3]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${
                msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 shadow-sm ${
                  msg.sender === "user"
                    ? "bg-[#E4ACB2] text-[#2F3542]"
                    : "bg-[#CCD5AE] text-[#2F3542]"
                }`}
              >
                {msg.sender === "user" ? (
                  (user.name || "U").charAt(0).toUpperCase()
                ) : (
                  <Bot className="w-5 h-5 text-[#2F3542]" />
                )}
              </div>

              {/* Message Content Bubble */}
              <div
                className={`p-4 rounded-3xl space-y-2 text-xs md:text-sm leading-relaxed border ${
                  msg.sender === "user"
                    ? "bg-[#F7E8EA] text-[#2F3542] border-[#E4ACB2]/40 shadow-sm"
                    : "bg-white border-[#E8E5DE] text-[#2F3542] shadow-sm"
                }`}
              >
                <p className="whitespace-pre-line font-medium">{msg.text}</p>

                {/* Smart Learning Loop Action Link Button */}
                {msg.actionLink && (
                  <div className="pt-2">
                    <button
                      onClick={() => navigate(msg.actionLink.path)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#E4ACB2] text-[#2F3542] font-bold text-xs hover:bg-[#D69AA2] transition-all shadow-sm"
                    >
                      <span>{msg.actionLink.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#2F3542]" />
                    </button>
                  </div>
                )}

                <span className="block text-[10px] opacity-70 text-right font-semibold text-[#667085]">
                  {msg.timestamp}
                </span>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 mr-auto items-center text-xs text-[#2F3542] font-bold animate-pulse">
              <Bot className="w-5 h-5 text-[#2F3542]" />
              <span>AI Coach is analyzing your study metrics...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2 p-2 bg-white border border-[#E8E5DE] rounded-2xl shrink-0 shadow-sm"
        >
          <input
            type="text"
            placeholder="Ask your AI coach (e.g. What should I study today?)"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            className="flex-1 bg-transparent px-4 py-2 text-xs md:text-sm text-[#2F3542] font-semibold focus:outline-none placeholder-[#667085]"
          />

          <button
            type="submit"
            disabled={loading || !inputPrompt.trim()}
            className="p-3 rounded-xl bg-[#E4ACB2] hover:bg-[#D69AA2] text-[#2F3542] font-bold disabled:opacity-40 transition-all shadow-sm"
          >
            <Send className="w-4 h-4 text-[#2F3542]" />
          </button>
        </form>
      </div>
    </AppLayout>
  );
};

export default AiAssistantPage;
