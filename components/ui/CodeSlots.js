"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export default function CodeSlots({
  length = 6,
  status = "idle", // 'idle' | 'success' | 'error'
  onChange,
  onComplete,
  slotSize = 44,
  gap = 8,
  radius = 12,
  slotColor = "rgba(255, 255, 255, 0.85)",
  digitColor = "#0f172a",
  dangerColor = "#ef4444",
  className = "",
}) {
  const [digits, setDigits] = useState(Array(length).fill(""));
  const inputRefs = useRef([]);

  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  const handleChange = (e, index) => {
    const val = e.target.value.slice(-1);
    if (!/^\d*$/.test(val)) return;

    const next = [...digits];
    next[index] = val;
    setDigits(next);
    onChange?.(next.join(""));

    if (val && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (next.every((d) => d !== "") && next.join("").length === length) {
      onComplete?.(next.join(""));
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").trim().slice(0, length);
    if (!/^\d+$/.test(pasteData)) return;

    const next = [...digits];
    for (let i = 0; i < pasteData.length; i++) {
      next[i] = pasteData[i];
    }
    setDigits(next);
    onChange?.(next.join(""));

    const nextFocusIndex = Math.min(pasteData.length, length - 1);
    inputRefs.current[nextFocusIndex]?.focus();

    if (next.every((d) => d !== "") && next.join("").length === length) {
      onComplete?.(next.join(""));
    }
  };

  return (
    <div
      style={{ gap: `${gap}px` }}
      className={cn("flex items-center justify-center select-none", className)}
      onPaste={handlePaste}
    >
      {digits.map((digit, idx) => {
        const isError = status === "error";
        const isSuccess = status === "success";

        return (
          <input
            key={idx}
            ref={(el) => (inputRefs.current[idx] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(e, idx)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            style={{
              width: `${slotSize}px`,
              height: `${slotSize}px`,
              borderRadius: `${radius}px`,
              backgroundColor: slotColor,
              color: isError ? dangerColor : digitColor,
              borderColor: isError
                ? dangerColor
                : isSuccess
                ? "#22c55e"
                : digit
                ? "#94a3b8"
                : "rgba(226, 232, 240, 0.8)",
            }}
            className={cn(
              "text-center text-lg font-mono font-bold border shadow-xs outline-none transition-all duration-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 backdrop-blur-md",
              isError && "animate-shake border-red-400 bg-red-50/50",
              isSuccess && "border-emerald-400 bg-emerald-50/50"
            )}
            aria-label={`Digit ${idx + 1}`}
          />
        );
      })}
    </div>
  );
}
