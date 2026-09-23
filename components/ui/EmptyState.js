"use client";

import React from "react";
import Link from "next/link";

/**
 * EmptyState
 *
 * Modern, sleek empty state component with clean SVG iconography.
 *
 * @param {Object} props
 * @param {React.ReactNode} [props.icon] - Optional custom SVG icon
 * @param {string} props.title - Main heading
 * @param {string} [props.description] - Subtext explanation
 * @param {string} [props.actionLabel] - Button text
 * @param {string} [props.actionHref] - Link URL if navigation
 * @param {Function} [props.onAction] - Click handler if callback
 * @param {string} [props.className] - Extra Tailwind classes
 */
export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className = "",
}) {
  return (
    <div
      className={`
        rounded-2xl border border-dashed border-[#E4DCCC] bg-[#FAF8F5]/80
        p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-3.5
        shadow-xs backdrop-blur-xs ${className}
      `}
    >
      <div className="w-12 h-12 rounded-2xl bg-[#F2ECE1] border border-[#E2D7C3] flex items-center justify-center text-[#78716C] shadow-inner mb-1">
        {icon || (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        )}
      </div>

      <div className="space-y-1 max-w-md">
        <h3 className="text-sm sm:text-base font-bold font-display text-[#1C1917]">
          {title}
        </h3>
        {description && (
          <p className="text-xs sm:text-sm text-[#78716C] leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {(actionLabel && (actionHref || onAction)) && (
        <div className="mt-2">
          {actionHref ? (
            <Link
              href={actionHref}
              className="btn-primary text-xs px-4 py-2 no-underline"
            >
              <span>{actionLabel}</span>
              <svg className="w-3.5 h-3.5 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          ) : (
            <button
              type="button"
              onClick={onAction}
              className="btn-primary text-xs px-4 py-2"
            >
              <span>{actionLabel}</span>
              <svg className="w-3.5 h-3.5 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

