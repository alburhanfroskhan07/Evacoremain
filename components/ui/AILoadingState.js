"use client";

/**
 * @author: @kokonutui
 * @description: AI Loading State
 * @version: 1.0.0
 * @date: 2025-06-26
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import { useEffect, useRef, useState } from "react";

const TASK_SEQUENCES = [
  {
    status: "Searching the web",
    lines: [
      "Initializing web search...",
      "Scanning web pages...",
      "Visiting 5 websites...",
      "Analyzing content...",
      "Generating summary...",
    ],
  },
  {
    status: "Analyzing results",
    lines: [
      "Analyzing search results...",
      "Generating summary...",
      "Checking for relevant information...",
      "Finalizing analysis...",
      "Setting up lazy loading...",
      "Configuring caching strategies...",
      "Running performance tests...",
      "Finalizing optimizations...",
    ],
  },
  {
    status: "Enhancing UI/UX",
    lines: [
      "Initializing UI enhancement scan...",
      "Checking accessibility compliance...",
      "Analyzing component animations...",
      "Reviewing loading states...",
      "Testing responsive layouts...",
      "Optimizing user interactions...",
      "Validating color contrast...",
      "Checking motion preferences...",
      "Finalizing UI improvements...",
    ],
  },
];

const LoadingAnimation = ({ progress = 0 }) => (
  <div className="relative h-6 w-6 shrink-0">
    <svg
      aria-label={`Loading progress: ${Math.round(progress)}%`}
      className="h-full w-full"
      fill="none"
      viewBox="0 0 240 240"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Loading Progress Indicator</title>

      <defs>
        <mask id="progress-mask">
          <rect fill="black" height="240" width="240" />
          <circle
            cx="120"
            cy="120"
            fill="white"
            r="120"
            strokeDasharray={`${(progress / 100) * 754}, 754`}
            transform="rotate(-90 120 120)"
          />
        </mask>
      </defs>

      <style>
        {`
          @keyframes rotate-cw {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes rotate-ccw {
            from { transform: rotate(360deg); }
            to { transform: rotate(0deg); }
          }
          .g-spin circle {
            transform-origin: 120px 120px;
          }
          .g-spin circle:nth-child(1) { animation: rotate-cw 8s linear infinite; }
          .g-spin circle:nth-child(2) { animation: rotate-ccw 8s linear infinite; }
          .g-spin circle:nth-child(3) { animation: rotate-cw 8s linear infinite; }
          .g-spin circle:nth-child(4) { animation: rotate-ccw 8s linear infinite; }
          .g-spin circle:nth-child(5) { animation: rotate-cw 8s linear infinite; }
          .g-spin circle:nth-child(6) { animation: rotate-ccw 8s linear infinite; }

          .g-spin circle:nth-child(2n) { animation-delay: 0.2s; }
          .g-spin circle:nth-child(3n) { animation-delay: 0.3s; }
        `}
      </style>

      <g
        className="g-spin"
        mask="url(#progress-mask)"
        strokeDasharray="18% 40%"
        strokeWidth="16"
      >
        <circle cx="120" cy="120" opacity="0.95" r="150" stroke="#FF2E7E" />
        <circle cx="120" cy="120" opacity="0.95" r="130" stroke="#00E5FF" />
        <circle cx="120" cy="120" opacity="0.95" r="110" stroke="#4ADE80" />
        <circle cx="120" cy="120" opacity="0.95" r="90" stroke="#FFA726" />
        <circle cx="120" cy="120" opacity="0.95" r="70" stroke="#FFEB3B" />
        <circle cx="120" cy="120" opacity="0.95" r="50" stroke="#FF4081" />
      </g>
    </svg>
  </div>
);

export default function AILoadingState({
  sequences = TASK_SEQUENCES,
  className = "",
}) {
  const activeSequences = sequences || TASK_SEQUENCES;
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const [visibleLines, setVisibleLines] = useState([]);
  const [scrollPosition, setScrollPosition] = useState(0);
  const codeContainerRef = useRef(null);
  const rootRef = useRef(null);
  const [isVisible, setIsVisible] = useState(true);
  const lineHeight = 28;

  useEffect(() => {
    const element = rootRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin: "100px" }
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const currentSequence = activeSequences[sequenceIndex] || activeSequences[0];
  const totalLines = currentSequence?.lines?.length || 0;

  useEffect(() => {
    if (!currentSequence?.lines) return;
    const initialLines = [];
    for (let i = 0; i < Math.min(5, totalLines); i++) {
      initialLines.push({
        text: currentSequence.lines[i],
        number: i + 1,
      });
    }
    setVisibleLines(initialLines);
    setScrollPosition(0);
  }, [sequenceIndex, currentSequence, totalLines]);

  useEffect(() => {
    if (!isVisible || totalLines === 0) return;

    const advanceTimer = setInterval(() => {
      const firstVisibleLineIndex = Math.floor(scrollPosition / lineHeight);
      const nextLineIndex = (firstVisibleLineIndex + 3) % totalLines;

      if (nextLineIndex < firstVisibleLineIndex && nextLineIndex !== 0) {
        setSequenceIndex((prevIndex) => (prevIndex + 1) % activeSequences.length);
        return;
      }

      if (nextLineIndex >= visibleLines.length && nextLineIndex < totalLines) {
        setVisibleLines((prevLines) => [
          ...prevLines,
          {
            text: currentSequence.lines[nextLineIndex],
            number: nextLineIndex + 1,
          },
        ]);
      }

      setScrollPosition((prevPosition) => prevPosition + lineHeight);
    }, 2000);

    return () => clearInterval(advanceTimer);
  }, [
    isVisible,
    scrollPosition,
    visibleLines,
    totalLines,
    sequenceIndex,
    currentSequence,
    activeSequences.length,
    lineHeight,
  ]);

  useEffect(() => {
    if (codeContainerRef.current) {
      codeContainerRef.current.scrollTop = scrollPosition;
    }
  }, [scrollPosition]);

  return (
    <div
      className={`flex min-h-full w-full items-center justify-center p-2 ${className}`}
      ref={rootRef}
    >
      <div className="w-full max-w-sm space-y-3">
        <div className="flex items-center space-x-2 font-bold text-stone-700 dark:text-stone-300 font-display">
          <LoadingAnimation
            progress={((sequenceIndex + 1) / activeSequences.length) * 100}
          />
          <span className="text-xs sm:text-sm font-display tracking-tight">
            {currentSequence?.status}…
          </span>
        </div>

        <div className="relative rounded-2xl border border-stone-200/80 bg-stone-50/80 p-2 dark:border-stone-800 dark:bg-stone-900/80 shadow-2xs">
          <div
            className="relative h-[84px] w-full overflow-hidden rounded-xl font-mono text-xs"
            ref={codeContainerRef}
            style={{ scrollBehavior: "smooth" }}
          >
            <div>
              {visibleLines.map((line) => (
                <div
                  className="flex h-[28px] items-center px-2"
                  key={`${line.number}-${line.text}`}
                >
                  <div className="w-6 select-none pr-3 text-right font-bold text-stone-400 dark:text-stone-500">
                    {line.number}
                  </div>
                  <div className="ml-1 flex-1 text-stone-700 dark:text-stone-200 truncate">
                    {line.text}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="pointer-events-none absolute top-0 right-0 bottom-0 left-0 rounded-xl from-stone-50/80 via-transparent to-stone-50/80 dark:from-stone-900/80 dark:via-transparent dark:to-stone-900/80"
            style={{
              background:
                "linear-gradient(to bottom, var(--tw-gradient-from) 0%, transparent 40%, transparent 60%, var(--tw-gradient-to) 100%)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
