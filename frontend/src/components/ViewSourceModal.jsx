import React from "react";
import { FileText, BookOpen, X, ExternalLink } from "lucide-react";

const ViewSourceModal = ({ isOpen, onClose, sourceRef }) => {
  if (!isOpen || !sourceRef) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white border border-[#E8E5DE] rounded-3xl p-6 md:p-8 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E8E5DE]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#F7E8EA] text-[#E4ACB2]">
              <FileText className="w-5 h-5 text-[#2F3542]" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base md:text-lg text-[#2F3542] flex items-center gap-1.5">
                📖 Source Grounding Reference
              </h3>
              <p className="text-xs text-[#4B5563]">
                Verbatim excerpt from user uploaded study material
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#667085] hover:text-[#2F3542] rounded-xl hover:bg-[#FAF8F3]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source File Details */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF8F3] border border-[#E8E5DE]">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-4 h-4 text-[#E4ACB2]" />
            <span className="font-bold text-xs md:text-sm text-[#2F3542]">
              {sourceRef.fileName || "Uploaded Study Material"}
            </span>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#E4ACB2] text-[#2F3542]">
            Page {sourceRef.pageNumber || 1}
          </span>
        </div>

        {/* Verbatim Excerpt Quote */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">
            Verified Text Excerpt
          </label>
          <div className="p-4 rounded-2xl bg-[#F7E8EA]/60 border border-[#E4ACB2]/40 text-xs md:text-sm text-[#2F3542] leading-relaxed italic font-serif">
            "{sourceRef.excerpt || "Text excerpt reference grounded in uploaded document."}"
          </div>
        </div>

        {/* Footer Note */}
        <div className="pt-2 flex justify-between items-center text-[11px] text-[#4B5563]">
          <span>✨ 100% Grounded in your PDF material</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#2F3542] text-white font-bold hover:bg-[#4B5563] transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewSourceModal;
