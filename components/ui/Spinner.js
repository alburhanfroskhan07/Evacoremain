"use client";

/**
 * Spinner - inline loading indicator.
 * Sizes: "sm" (16px), "md" (20px), "lg" (28px)
 */
export default function Spinner({ size = "md", className = "" }) {
  const px = { sm: "w-4 h-4", md: "w-5 h-5", lg: "w-7 h-7" }[size] ?? "w-5 h-5";

  return (
    <svg
      className={`animate-spin ${px} ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
      />
    </svg>
  );
}
