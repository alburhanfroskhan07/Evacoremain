"use client";

import { useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BellToggle({
  offLabel = "Notify me",
  onLabel = "You'll be notified",
  color = "#1e293b",
  background = "rgba(255, 255, 255, 0.85)",
  onColor = "#0f172a",
  onBackground = "#dcfce7",
  size = "md",
  radius = 20,
  count = 0,
  badge = true,
  badgeColor = "#ef4444",
  waves = true,
  defaultPressed = false,
  onChange,
  className = "",
}) {
  const [pressed, setPressed] = useState(defaultPressed);
  const [isRinging, setIsRinging] = useState(false);

  const handleClick = () => {
    const next = !pressed;
    setPressed(next);
    if (next) {
      setIsRinging(true);
      setTimeout(() => setIsRinging(false), 820);
    }
    onChange?.(next);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        borderRadius: `${radius}px`,
        backgroundColor: pressed ? onBackground : background,
        color: pressed ? onColor : color,
      }}
      className={cn(
        "relative inline-flex items-center gap-2.5 px-4 py-2 text-xs font-bold font-display shadow-xs border border-stone-200/80 transition-all duration-300 cursor-pointer select-none active:scale-97 backdrop-blur-md",
        pressed ? "border-emerald-300 shadow-emerald-500/10" : "hover:bg-white",
        className
      )}
      aria-pressed={pressed}
    >
      {/* Bell icon with animated swing */}
      <div className={cn("relative flex items-center justify-center", isRinging && "animate-bounce")}>
        {pressed ? (
          <BellRing className="w-4 h-4 text-emerald-600 animate-pulse" />
        ) : (
          <Bell className="w-4 h-4 text-stone-600" />
        )}

        {/* Waves ripple */}
        {waves && pressed && (
          <span className="absolute -inset-1 rounded-full bg-emerald-400/20 animate-ping pointer-events-none" />
        )}

        {/* Notification badge */}
        {badge && count > 0 && (
          <span
            style={{ backgroundColor: badgeColor }}
            className="absolute -top-1.5 -right-2 text-[9px] font-mono font-bold text-white px-1.5 py-0.2 rounded-full shadow-2xs leading-none"
          >
            {count}
          </span>
        )}
      </div>

      <span className="truncate">{pressed ? onLabel : offLabel}</span>
    </button>
  );
}
