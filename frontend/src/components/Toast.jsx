import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "success", duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all duration-300 transform translate-y-0 animate-in fade-in slide-in-from-bottom-5 ${
              toast.type === "success"
                ? "bg-[#F0F3E7] border-[#AFC7A1] text-[#2F3542]"
                : toast.type === "error"
                ? "bg-[#F7E8EA] border-[#D99A9A] text-[#2F3542]"
                : toast.type === "warning"
                ? "bg-[#FAF8F3] border-[#E7D59A] text-[#2F3542]"
                : "bg-[#FAF8F3] border-[#C8D8E8] text-[#2F3542]"
            }`}
          >
            <div className="flex items-center gap-3">
              {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-[#AFC7A1] shrink-0" />}
              {toast.type === "error" && <AlertCircle className="w-5 h-5 text-[#D99A9A] shrink-0" />}
              {toast.type === "warning" && <AlertCircle className="w-5 h-5 text-[#E7D59A] shrink-0" />}
              {toast.type === "info" && <Info className="w-5 h-5 text-[#C8D8E8] shrink-0" />}
              <span className="text-sm font-semibold">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-[#98A0A8] hover:text-[#2F3542] p-1 rounded-lg transition-colors ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
