"use client";

import React from "react";

/**
 * ErrorBoundary
 *
 * React error boundary component providing a resilient, user-friendly fallback
 * when unexpected runtime errors occur, with retry and recovery capabilities.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("EVACORE Uncaught Error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[50vh] flex items-center justify-center p-4">
          <div className="max-w-lg w-full rounded-2xl border border-red-500/30 bg-bg-card p-6 sm:p-8 shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#FBE7E5] border border-[#FECACA] flex items-center justify-center mx-auto shadow-xs text-[#DC2626]">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold font-display text-[#1C1917]">
                Something went wrong
              </h2>
              <p className="text-xs sm:text-sm text-[#78716C] leading-relaxed">
                An unexpected error occurred while rendering this section of EVACORE.
                Emergency offline caches remain active.
              </p>
            </div>

            {this.state.error && (
              <div className="text-left rounded-xl bg-[#1C1917] border border-white/10 p-3 text-[11px] font-mono text-[#DC2626] overflow-x-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-[#FF5A1F] text-white hover:bg-[#E04B14] active:scale-[0.98] transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                <span>Refresh & Reload</span>
              </button>
              <button
                type="button"
                onClick={() => this.setState({ hasError: false })}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-bg-secondary text-text-secondary hover:text-text-primary border border-border transition-all cursor-pointer"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
