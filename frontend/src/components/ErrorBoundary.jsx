import React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught React Error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF8F3] text-[#2F3542] flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white border border-[#E8E5DE] rounded-3xl p-8 shadow-xl space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-rose-500" />
            </div>

            <div className="space-y-2">
              <h2 className="font-heading font-extrabold text-2xl text-[#2F3542]">
                Something went wrong
              </h2>
              <p className="text-sm text-[#4B5563] font-medium leading-relaxed">
                An unexpected error occurred while rendering the page. Please refresh the page or return to dashboard.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#E4ACB2] hover:bg-[#D69AA2] text-[#2F3542] font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Refresh Page</span>
              </button>
              <a
                href="/dashboard"
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#F0F3E7] hover:bg-[#CCD5AE] text-[#2F3542] font-bold text-sm border border-[#CCD5AE] transition-all text-center"
              >
                Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
