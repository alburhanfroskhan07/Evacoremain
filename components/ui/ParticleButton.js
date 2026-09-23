"use client";

/**
 * @author: @dorianbaffier
 * @description: Particle Button
 * @version: 1.0.0
 * @date: 2025-06-26
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import { MousePointerClick } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function SuccessParticles({ buttonRef, particleColor = "bg-black dark:bg-white" }) {
  const rect = buttonRef.current?.getBoundingClientRect();
  if (!rect) return null;

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  return (
    <AnimatePresence>
      {[...Array(6)].map((_, i) => (
        <motion.div
          animate={{
            scale: [0, 1, 0],
            x: [0, (i % 2 ? 1 : -1) * (Math.random() * 50 + 20)],
            y: [0, -Math.random() * 50 - 20],
          }}
          className={cn("fixed h-1.5 w-1.5 rounded-full pointer-events-none z-[99999]", particleColor)}
          initial={{
            scale: 0,
            x: 0,
            y: 0,
          }}
          key={i}
          style={{ left: centerX, top: centerY }}
          transition={{
            duration: 0.6,
            delay: i * 0.1,
            ease: "easeOut",
          }}
        />
      ))}
    </AnimatePresence>
  );
}

export default function ParticleButton({
  children,
  onClick,
  onSuccess,
  successDuration = 1000,
  particleColor,
  showDefaultIcon = false,
  className = "",
  ...props
}) {
  const [showParticles, setShowParticles] = useState(false);
  const buttonRef = useRef(null);

  const handleClick = async (e) => {
    setShowParticles(true);

    if (onClick) {
      onClick(e);
    }
    if (onSuccess) {
      onSuccess();
    }

    setTimeout(() => {
      setShowParticles(false);
    }, successDuration);
  };

  return (
    <>
      {showParticles && (
        <SuccessParticles
          buttonRef={buttonRef}
          particleColor={particleColor}
        />
      )}
      <Button
        className={cn(
          "relative",
          showParticles && "scale-95",
          "transition-transform duration-100",
          className
        )}
        onClick={handleClick}
        ref={buttonRef}
        {...props}
      >
        {children}
        {showDefaultIcon && <MousePointerClick className="h-4 w-4 shrink-0 ml-1.5" />}
      </Button>
    </>
  );
}
