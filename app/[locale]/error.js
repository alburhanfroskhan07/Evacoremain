"use client";

import { useEffect } from "react";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error("Route segment error:", error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-2xl border border-[#FECACA] bg-[#FFFFFF] p-6 shadow-sm text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#FBE7E5] text-[#DC2626] flex items-center justify-center mx-auto border border-[#FECACA]">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>

        <div className="space-y-1">
          <h2 className="text-base font-bold font-display text-[#1C1917]">
            Something went wrong
          </h2>
          <p className="text-xs text-[#78716C]">
            {error?.message || "An unexpected error occurred while loading this view."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => reset()}
          className="btn-primary w-full text-xs font-semibold"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
