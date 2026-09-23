"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";

export default function SwipeRow({
  children,
  actions = [],
  onAction,
  onCommit,
  actionColor = "#f87171",
  drawerColor = "#f1f5f9",
  rowColor = "rgba(255, 255, 255, 0.9)",
  textColor = "#1e293b",
  height = 64,
  radius = 16,
  actionWidth = 80,
  style,
  className = "",
}) {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const currentOffset = useRef(0);

  const totalActionWidth = actions.length * actionWidth;

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    currentOffset.current = offset;
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientX - startX.current;
    let newOffset = currentOffset.current + diff;
    // limit drag to left swipe
    if (newOffset > 0) newOffset = 0;
    if (newOffset < -totalActionWidth * 1.2) newOffset = -totalActionWidth * 1.2;
    setOffset(newOffset);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (offset < -totalActionWidth * 0.4) {
      setOffset(-totalActionWidth);
    } else {
      setOffset(0);
    }
  };

  return (
    <div
      style={{
        height: `${height}px`,
        borderRadius: `${radius}px`,
        backgroundColor: drawerColor,
        ...style,
      }}
      className={cn("relative overflow-hidden select-none border border-stone-200/80 shadow-xs", className)}
    >
      {/* Background action drawers */}
      <div className="absolute inset-y-0 right-0 flex items-stretch">
        {actions.map((act) => (
          <button
            key={act.id}
            type="button"
            onClick={() => {
              onAction?.(act);
              if (act.dismiss) setOffset(0);
            }}
            style={{ width: `${actionWidth}px`, backgroundColor: actionColor }}
            className="flex flex-col items-center justify-center text-white text-xs font-bold gap-1 cursor-pointer transition-opacity hover:opacity-90 active:scale-95"
          >
            {act.icon}
            <span className="text-[10px] font-mono leading-none">{act.label}</span>
          </button>
        ))}
      </div>

      {/* Main Foreground Swipeable Row */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${offset}px)`,
          backgroundColor: rowColor,
          color: textColor,
          borderRadius: `${radius}px`,
          transition: isDragging ? "none" : "transform 250ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        className="absolute inset-0 flex items-center px-4 backdrop-blur-md border border-stone-200/60 z-10"
      >
        {children}
      </div>
    </div>
  );
}
