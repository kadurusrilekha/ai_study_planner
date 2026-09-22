import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import FocusModal from "./FocusModal";

const AppLayout = ({ children, activeTask, onCompleteTask, isFocusModalOpen, onCloseFocusModal }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [internalFocusOpen, setInternalFocusOpen] = useState(false);

  const modalOpen = Boolean(isFocusModalOpen || internalFocusOpen);

  const handleCloseFocus = () => {
    setInternalFocusOpen(false);
    if (onCloseFocusModal) {
      onCloseFocusModal();
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F3] text-[#2F3542] transition-colors duration-200">
      {/* Sidebar */}
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Main Wrapper */}
      <div className="md:pl-64 flex flex-col min-h-screen">
        {/* Navbar */}
        <Navbar
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenFocusModal={() => {
            setInternalFocusOpen(true);
          }}
        />

        {/* Content Body */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-300">
          {children}
        </main>

        {/* Footer */}
        <footer className="py-6 px-8 border-t border-[#E8E5DE] text-center text-xs text-[#98A0A8]">
          AI Study Planner &copy; {new Date().getFullYear()} — Empowering Intelligent Deep Work
        </footer>
      </div>

      {/* Focus Mode Session Modal */}
      <FocusModal
        isOpen={modalOpen}
        onClose={handleCloseFocus}
        activeTask={activeTask}
        onCompleteTask={onCompleteTask}
      />
    </div>
  );
};

export default AppLayout;
