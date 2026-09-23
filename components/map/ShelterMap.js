"use client";

import dynamic from "next/dynamic";
import React, { Component } from "react";

class MapErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.warn("Map view notice:", error?.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="rounded-2xl border border-[#DCE8E2] bg-[#F7FAF8] p-6 flex flex-col items-center justify-center text-center space-y-3"
          style={{ minHeight: "360px" }}
        >
          <div className="w-10 h-10 rounded-2xl bg-[#EAF5EF] text-[#16A34A] flex items-center justify-center border border-[#B8D7C8]">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold font-display text-[#1C1917]">Map View Resting</h4>
            <p className="text-xs text-[#6E7973] max-w-sm">
              The live map layer had a transient display event. Tap below to reload the grid cleanly.
            </p>
          </div>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold font-display shadow-xs transition-all cursor-pointer"
          >
            Reload Map Grid
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const ShelterMapInner = dynamic(() => import("./ShelterMapInner"), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl border border-[#E5DCCE] bg-[#FAF8F5] flex items-center justify-center animate-pulse" style={{ minHeight: "360px" }}>
      <div className="flex flex-col items-center gap-2 text-[#78716C]">
        <div className="w-8 h-8 rounded-full border-2 border-[#FF5A1F] border-t-transparent animate-spin" />
        <span className="text-xs font-semibold font-display">Loading Live Flood Shelter Map…</span>
      </div>
    </div>
  ),
});

export default function ShelterMap(props) {
  return (
    <MapErrorBoundary>
      <ShelterMapInner {...props} />
    </MapErrorBoundary>
  );
}
