"use client";

/**
 * @author: @dorianbaffier
 * @description: Smooth Tab
 * @version: 1.0.0
 * @date: 2025-06-26
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";
import { cn } from "@/lib/utils";

const WaveformPath = () => (
  <motion.path
    animate={{
      x: [0, 10, 0],
      transition: {
        duration: 5,
        ease: "linear",
        repeat: Number.POSITIVE_INFINITY,
      },
    }}
    d="M0 50 
           C 20 40, 40 30, 60 50
           C 80 70, 100 60, 120 50
           C 140 40, 160 30, 180 50
           C 200 70, 220 60, 240 50
           C 260 40, 280 30, 300 50
           C 320 70, 340 60, 360 50
           C 380 40, 400 30, 420 50
           L 420 100 L 0 100 Z"
    initial={false}
  />
);

function TabCardContent({ title, description, fillClass }) {
  return (
    <div className="relative h-full">
      <div className="absolute inset-0 overflow-hidden">
        <svg
          aria-hidden="true"
          className="absolute bottom-0 h-32 w-full"
          preserveAspectRatio="none"
          role="presentation"
          viewBox="0 0 420 100"
        >
          <motion.g
            animate={{ opacity: 0.15 }}
            className={`fill-${fillClass} stroke-${fillClass}`}
            initial={{ opacity: 0 }}
            style={{ strokeWidth: 1 }}
            transition={{ duration: 0.5 }}
          >
            <WaveformPath />
          </motion.g>
          <motion.g
            animate={{ opacity: 0.1 }}
            className={`fill-${fillClass} stroke-${fillClass}`}
            initial={{ opacity: 0 }}
            style={{ strokeWidth: 1, transform: "translateY(10px)" }}
            transition={{ duration: 0.5 }}
          >
            <WaveformPath />
          </motion.g>
        </svg>
      </div>
      <div className="relative flex h-full flex-col p-5 sm:p-6">
        <div className="space-y-1.5 sm:space-y-2">
          <h3 className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-700 font-bold text-xl sm:text-2xl tracking-tight [text-shadow:_0_1px_1px_rgb(0_0_0_/_10%)] dark:from-white dark:to-stone-300 font-display">
            {title}
          </h3>
          <p className="max-w-[92%] text-stone-600 text-xs sm:text-sm leading-relaxed dark:text-stone-300">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_TABS = [
  {
    id: "Models",
    title: "Models",
    description: "Choose the model you want to use",
    color: "bg-blue-500 hover:bg-blue-600",
  },
  {
    id: "MCPs",
    title: "MCPs",
    description: "Choose the MCP you want to use",
    color: "bg-purple-500 hover:bg-purple-600",
  },
  {
    id: "Agents",
    title: "Agents",
    description: "Choose the agent you want to use",
    color: "bg-emerald-500 hover:bg-emerald-600",
  },
  {
    id: "Users",
    title: "Users",
    description: "Choose the user you want to use",
    color: "bg-amber-500 hover:bg-amber-600",
  },
];

const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0,
    filter: "blur(8px)",
    scale: 0.95,
    position: "absolute",
  }),
  center: {
    x: 0,
    opacity: 1,
    filter: "blur(0px)",
    scale: 1,
    position: "absolute",
  },
  exit: (direction) => ({
    x: direction < 0 ? "100%" : "-100%",
    opacity: 0,
    filter: "blur(8px)",
    scale: 0.95,
    position: "absolute",
  }),
};

const transition = {
  duration: 0.4,
  ease: [0.32, 0.72, 0, 1],
};

export default function SmoothTab({
  items = DEFAULT_TABS,
  defaultTabId = DEFAULT_TABS[0].id,
  selectedTab = null,
  className = "",
  activeColor = "bg-[#1F9CFE]",
  showCard = false,
  onChange,
}) {
  const [selected, setSelected] = React.useState(selectedTab || defaultTabId);
  const [direction, setDirection] = React.useState(0);
  const [dimensions, setDimensions] = React.useState({ width: 0, left: 0 });

  React.useEffect(() => {
    if (selectedTab && selectedTab !== selected) {
      const currentIndex = items.findIndex((item) => item.id === selected);
      const newIndex = items.findIndex((item) => item.id === selectedTab);
      setDirection(newIndex > currentIndex ? 1 : -1);
      setSelected(selectedTab);
    }
  }, [selectedTab, items, selected]);

  const buttonRefs = React.useRef(new Map());
  const containerRef = React.useRef(null);

  React.useLayoutEffect(() => {
    const updateDimensions = () => {
      const selectedButton = buttonRefs.current.get(selected);
      const container = containerRef.current;

      if (selectedButton && container) {
        const rect = selectedButton.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        setDimensions({
          width: rect.width,
          left: rect.left - containerRect.left,
        });
      }
    };

    requestAnimationFrame(updateDimensions);
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [selected]);

  const handleTabClick = (tabId) => {
    const currentIndex = items.findIndex((item) => item.id === selected);
    const newIndex = items.findIndex((item) => item.id === tabId);
    setDirection(newIndex > currentIndex ? 1 : -1);
    setSelected(tabId);
    onChange?.(tabId);
  };

  const handleKeyDown = (e, tabId) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleTabClick(tabId);
    }
  };

  const selectedItem = items.find((item) => item.id === selected) || items[0];

  return (
    <div className="flex w-full flex-col">
      {/* Optional Card Content Area */}
      {showCard && (
        <div className="relative mb-3.5 flex-1">
          <div className="relative h-[160px] sm:h-[180px] w-full rounded-2xl border border-stone-200/80 bg-white/95 shadow-xs overflow-hidden dark:border-stone-800 dark:bg-stone-900">
            <div className="absolute inset-0 overflow-hidden rounded-2xl">
              <AnimatePresence custom={direction} initial={false} mode="popLayout">
                <motion.div
                  animate="center"
                  className="absolute inset-0 h-full w-full bg-white will-change-transform dark:bg-stone-900"
                  custom={direction}
                  exit="exit"
                  initial="enter"
                  key={`card-${selected}`}
                  style={{
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                  }}
                  transition={transition}
                  variants={slideVariants}
                >
                  {selectedItem?.cardContent ??
                    (selectedItem && (
                      <TabCardContent
                        description={selectedItem.description ?? ""}
                        fillClass={
                          selectedItem.color
                            ?.split(" ")
                            .at(0)
                            ?.replace("bg-", "") ?? "blue-500"
                        }
                        title={selectedItem.title}
                      />
                    ))}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div
        aria-label="Smooth tabs"
        className={cn(
          "relative flex items-center justify-between gap-1 p-1",
          "w-full bg-white/90 backdrop-blur-md",
          "rounded-2xl border border-stone-200/80 shadow-xs",
          "transition-all duration-200",
          className
        )}
        ref={containerRef}
        role="tablist"
      >
        {/* Sliding Background */}
        {dimensions.width > 0 && (
          <motion.div
            animate={{
              width: dimensions.width - 6,
              x: dimensions.left + 3,
              opacity: 1,
            }}
            className={cn(
              "absolute z-[1] rounded-xl shadow-xs",
              selectedItem?.color || activeColor
            )}
            initial={false}
            style={{ height: "calc(100% - 8px)", top: "4px" }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 30,
            }}
          />
        )}

        <div
          className="relative z-[2] grid w-full gap-1"
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        >
          {items.map((item) => {
            const isSelected = selected === item.id;
            return (
              <motion.button
                aria-controls={`panel-${item.id}`}
                aria-selected={isSelected}
                className={cn(
                  "relative flex items-center justify-center gap-1.5 rounded-xl px-2 py-2",
                  "font-bold text-xs sm:text-sm font-display transition-all duration-200 cursor-pointer select-none",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400",
                  "truncate",
                  isSelected
                    ? "text-white"
                    : "text-stone-600 hover:bg-stone-100/60 hover:text-stone-900"
                )}
                id={`tab-${item.id}`}
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                onKeyDown={(e) => handleKeyDown(e, item.id)}
                ref={(el) => {
                  if (el) buttonRefs.current.set(item.id, el);
                  else buttonRefs.current.delete(item.id);
                }}
                role="tab"
                tabIndex={isSelected ? 0 : -1}
                type="button"
              >
                {item.icon && <span className="shrink-0">{item.icon}</span>}
                <span className="truncate">{item.title}</span>
                {item.badge && (
                  <span
                    className={cn(
                      "text-[9.5px] font-mono font-black px-1.5 py-0.5 rounded-full",
                      isSelected ? "bg-white/25 text-white" : "bg-stone-200 text-stone-700"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
