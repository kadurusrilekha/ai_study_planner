import React, { useState } from "react";
import API from "../api";
import { useToast } from "./Toast";
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X, Sparkles } from "lucide-react";

const PdfUploadModal = ({ isOpen, onClose, subjects = [], onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [subjectId, setSubjectId] = useState("");
  const [uploading, setUploading] = useState(false);
  const { addToast } = useToast();

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        addToast("Please select a PDF document.", "error");
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        addToast("File size exceeds 20MB limit.", "error");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      addToast("Please select a PDF file to upload.", "error");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);
    if (subjectId) formData.append("subjectId", subjectId);

    try {
      const res = await API.post("/study-materials/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data && res.data.success) {
        addToast(res.data.message || "PDF processed successfully!", "success");
        if (onUploadSuccess) onUploadSuccess(res.data.studyMaterial);
        onClose();
        setSelectedFile(null);
      }
    } catch (err) {
      console.error("PDF upload error:", err);
      const errMsg = err.response?.data?.error || err.response?.data?.message || err.message || "Failed to upload and process PDF.";
      addToast(errMsg, "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white border border-[#E8E5DE] rounded-3xl p-6 md:p-8 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E8E5DE]">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-[#F7E8EA] text-[#E4ACB2]">
              <UploadCloud className="w-5 h-5 text-[#2F3542]" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-[#2F3542]">
                Upload PDF Study Material ✨
              </h3>
              <p className="text-xs text-[#4B5563]">
                Turn your lecture notes & syllabus into source-grounded quizzes & flashcards
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

        <form onSubmit={handleUpload} className="space-y-4">
          {/* File Dropzone */}
          <div className="relative border-2 border-dashed border-[#E4ACB2] hover:border-[#D69AA2] rounded-2xl p-6 text-center bg-[#F7E8EA]/30 transition-all">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            {selectedFile ? (
              <div className="space-y-2">
                <FileText className="w-10 h-10 text-[#E4ACB2] mx-auto" />
                <p className="font-bold text-xs md:text-sm text-[#2F3542] truncate max-w-xs mx-auto">
                  {selectedFile.name}
                </p>
                <p className="text-[11px] text-[#4B5563]">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for AI extraction
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <UploadCloud className="w-10 h-10 text-[#E4ACB2] mx-auto" />
                <p className="font-bold text-xs md:text-sm text-[#2F3542]">
                  Click or Drag & Drop PDF here
                </p>
                <p className="text-[11px] text-[#4B5563]">
                  Supports lecture notes, textbooks, and syllabus slides (up to 20MB)
                </p>
              </div>
            )}
          </div>

          {/* Subject Link (Optional) */}
          {subjects.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-[#2F3542] block mb-1">
                Link to Subject (Optional)
              </label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-4 py-2.5 text-xs md:text-sm text-[#2F3542] focus:outline-none focus:border-[#E4ACB2]"
              >
                <option value="">General (No specific subject)</option>
                {subjects.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#4B5563] hover:text-[#2F3542]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="px-6 py-2.5 text-xs font-bold bg-[#CCD5AE] text-[#2F3542] rounded-xl hover:bg-[#B9C89A] disabled:opacity-40 shadow-sm transition-all flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin text-[#2F3542]" />
                  <span>Extracting PDF Topics...</span>
                </>
              ) : (
                "Process & Save Material"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PdfUploadModal;
