"use client";

import SmoothTab from "@/components/ui/SmoothTab";

/**
 * MeterMateTaskbar - KokonutUI Smooth Navigation Tab Bar
 *
 * Provides smooth spring-animated navigation dock with sliding pill,
 * real-time disaster telemetry badges, and waveform graphics.
 */
export default function MeterMateTaskbar({
  activeTab = "home",
  onTabChange,
  shelterCount = 0,
  hazardCount = 0,
  hospitalCount = 0,
}) {
  const tabs = [
    {
      id: "home",
      title: "Home",
      description: "Live real-time disaster grid telemetry, rainfall, and critical advisories",
      color: "bg-emerald-600 hover:bg-emerald-700",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      ),
    },
    {
      id: "camps",
      title: "Camps",
      description: "Verified relief camps, live berth availability, food rations, and medical wings",
      badge: shelterCount > 0 ? shelterCount : null,
      color: "bg-amber-600 hover:bg-amber-700",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 20h18M3 20l9-16 9 16M12 4v16M8.5 20l3.5-7 3.5 7" />
        </svg>
      ),
    },
    {
      id: "map",
      title: "Live Map",
      description: "Passable routes, road flood hazard radar, and 24/7 ER trauma centers",
      badge: hazardCount > 0 ? hazardCount : null,
      color: "bg-[#FF5A1F] hover:bg-[#E04B14]",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
    },
  ];

  return (
    <div className="w-full">
      <SmoothTab
        items={tabs}
        selectedTab={activeTab}
        onChange={onTabChange}
        className="glass-panel"
      />
    </div>
  );
}
