"use client";

/**
 * @author: @dorianbaffier
 * @description: Background Paths - KokonutUI (Evacore Botanical Vines Edition)
 * @version: 1.0.0
 * @license: MIT
 * @website: https://kokonutui.com
 */

import { motion } from "framer-motion";
import { memo, useMemo } from "react";

// Path generation function
function generateAestheticPath(index, position, type) {
  const baseAmplitude =
    type === "primary" ? 150 : type === "secondary" ? 100 : 60;
  const phase = index * 0.2;
  const points = [];
  const segments = type === "primary" ? 10 : type === "secondary" ? 8 : 6;

  const startX = 2400;
  const startY = 800;
  const endX = -2400;
  const endY = -800 + index * 25;

  for (let i = 0; i <= segments; i++) {
    const progress = i / segments;
    const eased = 1 - Math.pow(1 - progress, 2);

    const baseX = startX + (endX - startX) * eased;
    const baseY = startY + (endY - startY) * eased;

    const amplitudeFactor = 1 - eased * 0.3;
    const wave1 =
      Math.sin(progress * Math.PI * 3 + phase) *
      (baseAmplitude * 0.7 * amplitudeFactor);
    const wave2 =
      Math.cos(progress * Math.PI * 4 + phase) *
      (baseAmplitude * 0.3 * amplitudeFactor);
    const wave3 =
      Math.sin(progress * Math.PI * 2 + phase) *
      (baseAmplitude * 0.2 * amplitudeFactor);

    points.push({
      x: baseX * position,
      y: baseY + wave1 + wave2 + wave3,
    });
  }

  const pathCommands = points.map((point, i) => {
    if (i === 0) return `M ${point.x} ${point.y}`;
    const prevPoint = points[i - 1];
    const tension = 0.4;
    const cp1x = prevPoint.x + (point.x - prevPoint.x) * tension;
    const cp1y = prevPoint.y;
    const cp2x = prevPoint.x + (point.x - prevPoint.x) * (1 - tension);
    const cp2y = point.y;
    return `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${point.x} ${point.y}`;
  });

  return pathCommands.join(" ");
}

const generateUniqueId = (prefix) =>
  `${prefix}-${Math.random().toString(36).substring(2, 9)}`;

// Memoized FloatingPaths component with Vine Botanical Color Gradients
export const FloatingPaths = memo(function FloatingPaths({ position = 1 }) {
  const primaryPaths = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        id: generateUniqueId("primary"),
        d: generateAestheticPath(i, position, "primary"),
        opacity: 0.14 + i * 0.02,
        width: 3.5 + i * 0.3,
        duration: 25,
      })),
    [position]
  );

  const secondaryPaths = useMemo(
    () =>
      Array.from({ length: 15 }, (_, i) => ({
        id: generateUniqueId("secondary"),
        d: generateAestheticPath(i, position, "secondary"),
        opacity: 0.10 + i * 0.015,
        width: 2.5 + i * 0.25,
        duration: 20,
      })),
    [position]
  );

  const accentPaths = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        id: generateUniqueId("accent"),
        d: generateAestheticPath(i, position, "accent"),
        opacity: 0.08 + i * 0.015,
        width: 2 + i * 0.2,
        duration: 15,
      })),
    [position]
  );

  const sharedAnimationProps = {
    opacity: 1,
    scale: 1,
  };
  const sharedTransition = {
    opacity: { duration: 1 },
    scale: { duration: 1 },
  };

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden select-none">
      <svg
        className="h-full w-full"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        viewBox="-2400 -800 4800 1600"
      >
        <title>Botanical Vine Paths</title>
        <defs>
          {/* Lush Vine Botanical Gradient (Fresh Emerald -> Deep Forest Ivy -> Teal Mist) */}
          <linearGradient id="vineGradient" x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="rgba(16, 185, 129, 0.55)" />
            <stop offset="35%" stopColor="rgba(5, 150, 105, 0.65)" />
            <stop offset="70%" stopColor="rgba(42, 157, 143, 0.60)" />
            <stop offset="100%" stopColor="rgba(34, 197, 94, 0.55)" />
          </linearGradient>

          {/* Accent Vine Foliage Gradient */}
          <linearGradient id="vineGradientAccent" x1="0%" x2="100%" y1="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(52, 211, 153, 0.45)" />
            <stop offset="50%" stopColor="rgba(16, 185, 129, 0.50)" />
            <stop offset="100%" stopColor="rgba(20, 184, 166, 0.45)" />
          </linearGradient>
        </defs>

        <g className="primary-waves">
          {primaryPaths.map((path) => (
            <motion.path
              key={path.id}
              animate={{
                ...sharedAnimationProps,
                y: [0, -15, 0],
              }}
              d={path.d}
              initial={{ opacity: 0, scale: 0.8 }}
              stroke="url(#vineGradient)"
              strokeLinecap="round"
              strokeWidth={path.width}
              style={{ opacity: path.opacity }}
              transition={{
                ...sharedTransition,
                y: {
                  duration: 8,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                  repeatType: "reverse",
                },
              }}
            />
          ))}
        </g>

        <g className="secondary-waves" style={{ opacity: 0.85 }}>
          {secondaryPaths.map((path) => (
            <motion.path
              key={path.id}
              animate={{
                ...sharedAnimationProps,
                y: [0, -10, 0],
              }}
              d={path.d}
              initial={{ opacity: 0, scale: 0.9 }}
              stroke="url(#vineGradient)"
              strokeLinecap="round"
              strokeWidth={path.width}
              style={{ opacity: path.opacity }}
              transition={{
                ...sharedTransition,
                y: {
                  duration: 6,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                  repeatType: "reverse",
                },
              }}
            />
          ))}
        </g>

        <g className="accent-waves" style={{ opacity: 0.7 }}>
          {accentPaths.map((path) => (
            <motion.path
              key={path.id}
              animate={{
                ...sharedAnimationProps,
                y: [0, -5, 0],
              }}
              d={path.d}
              initial={{ opacity: 0, scale: 0.95 }}
              stroke="url(#vineGradientAccent)"
              strokeLinecap="round"
              strokeWidth={path.width}
              style={{ opacity: path.opacity }}
              transition={{
                ...sharedTransition,
                y: {
                  duration: 4,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                  repeatType: "reverse",
                },
              }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
});

// Memoized AnimatedTitle component
export const AnimatedTitle = memo(function AnimatedTitle({ title }) {
  if (!title) return null;
  return (
    <motion.h1
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 bg-gradient-to-r from-emerald-900 via-stone-800 to-emerald-700 bg-clip-text font-bold text-3xl text-transparent tracking-tighter sm:text-5xl md:text-5xl font-display"
      initial={{ opacity: 0, y: 20 }}
      transition={{
        duration: 1.2,
        ease: [0.2, 0.65, 0.3, 0.9],
      }}
    >
      {title}
    </motion.h1>
  );
});

export default memo(function BackgroundPaths({
  title,
  children,
  className = "",
}) {
  return (
    <div className={`relative flex min-h-full w-full items-center justify-center overflow-hidden bg-white ${className}`}>
      <div className="absolute inset-0 pointer-events-none">
        <FloatingPaths position={1} />
      </div>

      {title ? (
        <div className="container relative z-10 mx-auto px-4 text-center md:px-6">
          <motion.div
            animate={{ opacity: 1 }}
            className="mx-auto max-w-4xl"
            initial={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
          >
            <AnimatedTitle title={title} />
            {children}
          </motion.div>
        </div>
      ) : (
        children && <div className="relative z-10 w-full">{children}</div>
      )}
    </div>
  );
});
