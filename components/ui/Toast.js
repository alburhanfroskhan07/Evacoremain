"use client";

import { useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Liquid Glass Notification System
 *
 * Full liquid glassmorphism / chromatic refraction toast notifications.
 * Features:
 * - Ultra-high blur (backdrop-blur-2xl) with specular top refraction edge
 * - Ambient liquid glow aura keyed to toast severity (warning, success, error, info)
 * - Frosted icon bubble with fluid micro-glow
 * - Fluid liquid progress countdown bar
 * - Tactile spring entrance, layout shift, and exit transitions via Framer Motion
 * - Hover-to-pause dismissal timer
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback(({ type = "info", message, duration = 4500 }) => {
    if (!message) return;

    setToasts((prev) => {
      // Prevent duplicate identical toast spamming
      if (prev.some((t) => t.message === message)) {
        return prev;
      }
      const id = typeof window !== "undefined" && window.crypto?.randomUUID
        ? window.crypto.randomUUID()
        : Math.random().toString(36).substring(2, 9);

      // Keep maximum 3 toasts visible at once
      const capped = prev.length >= 3 ? prev.slice(prev.length - 2) : prev;

      return [...capped, { id, type, message, duration, createdAt: Date.now() }];
    });
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const ToastContainer = useCallback(() => {
    return (
      <div
        aria-live="polite"
        className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-[100005] pointer-events-none flex flex-col gap-2.5 max-w-sm sm:max-w-md sm:w-auto ml-auto"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    );
  }, [toasts, dismiss]);

  return { toast, ToastContainer };
}

const LIQUID_THEMES = {
  warning: {
    liquidGradient: "from-amber-500/15 via-white/80 to-white/60 dark:from-amber-950/40 dark:via-stone-900/80 dark:to-stone-950/70",
    border: "border-amber-300/60 dark:border-amber-500/30",
    shadow: "shadow-[0_16px_36px_-6px_rgba(217,119,6,0.22),0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.95)]",
    aura: "bg-amber-400/25",
    iconBg: "bg-gradient-to-br from-amber-400/25 to-amber-500/10 border-amber-300/80 text-amber-600 shadow-[0_0_12px_rgba(245,158,11,0.25)]",
    bar: "bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500",
    icon: (
      <svg className="w-4 h-4 text-amber-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
  success: {
    liquidGradient: "from-emerald-500/15 via-white/80 to-white/60 dark:from-emerald-950/40 dark:via-stone-900/80 dark:to-stone-950/70",
    border: "border-emerald-300/60 dark:border-emerald-500/30",
    shadow: "shadow-[0_16px_36px_-6px_rgba(16,185,129,0.22),0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.95)]",
    aura: "bg-emerald-400/25",
    iconBg: "bg-gradient-to-br from-emerald-400/25 to-emerald-500/10 border-emerald-300/80 text-emerald-600 shadow-[0_0_12px_rgba(16,185,129,0.25)]",
    bar: "bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500",
    icon: (
      <svg className="w-4 h-4 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    ),
  },
  error: {
    liquidGradient: "from-rose-500/15 via-white/80 to-white/60 dark:from-rose-950/40 dark:via-stone-900/80 dark:to-stone-950/70",
    border: "border-rose-300/60 dark:border-rose-500/30",
    shadow: "shadow-[0_16px_36px_-6px_rgba(225,29,72,0.22),0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.95)]",
    aura: "bg-rose-400/25",
    iconBg: "bg-gradient-to-br from-rose-400/25 to-rose-500/10 border-rose-300/80 text-rose-600 shadow-[0_0_12px_rgba(225,29,72,0.25)]",
    bar: "bg-gradient-to-r from-rose-500 via-rose-600 to-red-600",
    icon: (
      <svg className="w-4 h-4 text-rose-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
  info: {
    liquidGradient: "from-[#FF5A1F]/15 via-white/80 to-white/60 dark:from-[#FF5A1F]/20 dark:via-stone-900/80 dark:to-stone-950/70",
    border: "border-[#FF5A1F]/35 dark:border-[#FF5A1F]/30",
    shadow: "shadow-[0_16px_36px_-6px_rgba(255,90,31,0.22),0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.95)]",
    aura: "bg-[#FF5A1F]/25",
    iconBg: "bg-gradient-to-br from-[#FF5A1F]/25 to-[#E04825]/10 border-[#FF5A1F]/40 text-[#FF5A1F] shadow-[0_0_12px_rgba(255,90,31,0.25)]",
    bar: "bg-gradient-to-r from-[#FF5A1F] via-[#FF7D4D] to-[#FFA07A]",
    icon: (
      <svg className="w-4 h-4 text-[#FF5A1F] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
      </svg>
    ),
  },
};

function ToastItem({ toast, onDismiss }) {
  const theme = LIQUID_THEMES[toast.type] || LIQUID_THEMES.info;
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (isPaused) return;
    const duration = toast.duration || 4500;
    const intervalTime = 30;
    const step = (intervalTime / duration) * 100;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(interval);
          onDismiss(toast.id);
          return 0;
        }
        return prev - step;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isPaused, toast.duration, toast.id, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.94, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -16, scale: 0.94, filter: "blur(8px)" }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="alert"
      className={`
        pointer-events-auto relative overflow-hidden select-none
        rounded-2xl sm:rounded-3xl border ${theme.border} ${theme.shadow}
        bg-gradient-to-br ${theme.liquidGradient} backdrop-blur-2xl
        p-3.5 sm:p-4 transition-all duration-300
        before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-white/90 before:to-transparent
      `}
    >
      {/* Liquid chromatic ambient aura */}
      <div
        className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-60 ${theme.aura}`}
      />

      <div className="relative z-10 flex items-start gap-3">
        {/* Glowing frosted icon capsule */}
        <div className={`p-2 rounded-xl sm:rounded-2xl border flex items-center justify-center shrink-0 ${theme.iconBg}`}>
          {theme.icon}
        </div>

        {/* Message body */}
        <div className="flex-1 min-w-0 pr-1 pt-0.5">
          <p className="text-xs sm:text-[13px] font-bold font-display text-stone-900 dark:text-stone-100 leading-snug tracking-tight">
            {toast.message}
          </p>
        </div>

        {/* Frosted dismiss button */}
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss notification"
          className="
            p-1.5 rounded-xl text-stone-400 hover:text-stone-800 dark:hover:text-white
            bg-white/40 hover:bg-white/80 dark:bg-stone-800/40 dark:hover:bg-stone-800/80
            border border-white/60 dark:border-white/10 shadow-2xs
            transition-all duration-200 cursor-pointer active:scale-90 shrink-0
          "
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Fluid liquid progress countdown bar */}
      <div className="absolute bottom-0 inset-x-0 h-[2.5px] bg-black/5 dark:bg-white/5 overflow-hidden">
        <div
          className={`h-full transition-all duration-75 ease-linear ${theme.bar}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  );
}
