"use client";

import { Mic } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export default function AI_Voice({
  onListeningToggle,
  isRecording = false,
  className = "",
}) {
  const [submitted, setSubmitted] = useState(isRecording);
  const [time, setTime] = useState(0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    setSubmitted(isRecording);
  }, [isRecording]);

  useEffect(() => {
    let intervalId;
    if (submitted) {
      intervalId = setInterval(() => {
        setTime((t) => t + 1);
      }, 1000);
    } else {
      setTime(0);
    }
    return () => clearInterval(intervalId);
  }, [submitted]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleClick = () => {
    const nextState = !submitted;
    setSubmitted(nextState);
    onListeningToggle?.(nextState);
  };

  return (
    <div className={cn("w-full py-2", className)}>
      <div className="relative mx-auto flex w-full max-w-sm flex-col items-center gap-2">
        <button
          className={cn(
            "group flex h-14 w-14 items-center justify-center rounded-2xl transition-all cursor-pointer shadow-sm active:scale-95 border",
            submitted
              ? "bg-red-500/15 border-red-300 text-red-600 shadow-red-500/10"
              : "bg-white/80 hover:bg-white border-stone-200 text-stone-800"
          )}
          onClick={handleClick}
          type="button"
          aria-label={submitted ? "Stop listening" : "Click to speak"}
        >
          {submitted ? (
            <div
              className="h-5 w-5 animate-spin rounded-xs bg-red-500"
              style={{ animationDuration: "3s" }}
            />
          ) : (
            <Mic className="h-6 w-6 text-stone-800 transition-transform group-hover:scale-110" />
          )}
        </button>

        <span
          className={cn(
            "font-mono text-xs transition-opacity duration-300 font-bold",
            submitted ? "text-stone-800" : "text-stone-400"
          )}
        >
          {formatTime(time)}
        </span>

        {/* 48-bar Audio Equalizer Waveform */}
        <div className="flex h-4 w-56 sm:w-64 items-center justify-center gap-0.5">
          {[...Array(40)].map((_, i) => (
            <div
              className={cn(
                "w-0.75 rounded-full transition-all duration-300",
                submitted ? "animate-pulse bg-emerald-500/80" : "h-1 bg-stone-300/60"
              )}
              key={i}
              style={
                submitted && isClient
                  ? {
                      height: `${20 + Math.random() * 80}%`,
                      animationDelay: `${i * 0.04}s`,
                    }
                  : undefined
              }
            />
          ))}
        </div>

        <p className="h-4 text-stone-600 text-[11px] font-mono font-medium">
          {submitted ? "Listening to voice input…" : "Tap mic to speak intake"}
        </p>
      </div>
    </div>
  );
}
