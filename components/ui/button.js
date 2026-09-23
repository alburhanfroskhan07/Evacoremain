"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export const Button = React.forwardRef(function Button(
  { className, variant = "default", size = "default", ...props },
  ref
) {
  const variantStyles = {
    default: "bg-stone-900 text-white hover:bg-stone-800 shadow-xs",
    destructive: "bg-red-600 text-white hover:bg-red-700 shadow-xs",
    outline: "border border-stone-200 bg-white hover:bg-stone-50 text-stone-900",
    secondary: "bg-stone-100 text-stone-900 hover:bg-stone-200",
    ghost: "hover:bg-stone-100 text-stone-800",
    link: "text-stone-900 underline-offset-4 hover:underline",
  };

  const sizeStyles = {
    default: "h-10 px-4 py-2 text-sm",
    sm: "h-8 rounded-lg px-3 text-xs",
    lg: "h-12 rounded-2xl px-6 text-base",
    icon: "h-9 w-9",
  };

  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-display font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none active:scale-98",
        variantStyles[variant] || variantStyles.default,
        sizeStyles[size] || sizeStyles.default,
        className
      )}
      {...props}
    />
  );
});

Button.displayName = "Button";
export default Button;
