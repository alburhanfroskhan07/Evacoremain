"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function JellyRadio({
  items = [],
  defaultValue,
  value,
  onChange,
  chipColor = "rgba(241, 245, 249, 0.8)",
  activeColor = "#ffffff",
  textColor = "#475569",
  activeTextColor = "#0f172a",
  radius = 18,
  gap = 6,
  className = "",
}) {
  const normalizedItems = items.map((item) =>
    typeof item === "string" ? { value: item, label: item } : item
  );

  const initialVal = value !== undefined ? value : (defaultValue ?? normalizedItems[0]?.value);
  const [selected, setSelected] = useState(initialVal);

  const current = value !== undefined ? value : selected;

  const handleSelect = (val, idx) => {
    if (value === undefined) setSelected(val);
    onChange?.(val, idx);
  };

  return (
    <div
      style={{
        gap: `${gap}px`,
        borderRadius: `${radius + 4}px`,
        backgroundColor: chipColor,
      }}
      className={cn(
        "inline-flex items-center p-1 border border-stone-200/80 shadow-2xs backdrop-blur-md select-none",
        className
      )}
      role="radiogroup"
    >
      {normalizedItems.map((item, idx) => {
        const isSelected = item.value === current;
        return (
          <button
            key={item.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={item.disabled}
            onClick={() => !item.disabled && handleSelect(item.value, idx)}
            style={{
              borderRadius: `${radius}px`,
              color: isSelected ? activeTextColor : textColor,
            }}
            className={cn(
              "relative px-3.5 py-1.5 text-xs font-bold font-display transition-colors duration-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-97 z-10",
              isSelected && "shadow-xs"
            )}
          >
            {isSelected && (
              <motion.div
                layoutId="jelly-pill"
                transition={{ type: "spring", stiffness: 500, damping: 32 }}
                style={{
                  borderRadius: `${radius}px`,
                  backgroundColor: activeColor,
                }}
                className="absolute inset-0 border border-stone-200/90 shadow-xs -z-10"
              />
            )}
            {item.icon && <span className="w-3.5 h-3.5 flex items-center justify-center">{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
