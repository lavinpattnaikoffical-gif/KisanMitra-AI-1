import React, { MouseEvent, useEffect, useState } from "react";
import { motion, useMotionTemplate, useMotionValue } from "motion/react";

interface LivingSurfaceProps {
  key?: React.Key;
  children: React.ReactNode;
  className?: string;
  tier?: "lite" | "premium" | "interactive";
  interactiveProps?: any;
  onClick?: () => void;
  as?: React.ElementType;
}

export default function LivingSurface({ 
  children, 
  className = "", 
  tier = "lite", 
  interactiveProps = {}, 
  onClick, 
  as: Component = "div" 
}: LivingSurfaceProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [isHovered, setIsHovered] = useState(false);
  const [canHover, setCanHover] = useState(true);

  // Device capability detection for graceful degradation
  useEffect(() => {
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isTouchDevice || prefersReducedMotion) {
      setCanHover(false);
    }
  }, []);

  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    if (!canHover) return;
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  // Define intensity and radius based on tier
  let reflectionColor = "rgba(255,255,255,0.02)";
  let reflectionRadius = "250px";

  if (tier === "premium") {
    reflectionColor = "rgba(255,255,255,0.05)";
    reflectionRadius = "400px";
  } else if (tier === "interactive") {
    reflectionColor = "rgba(255,255,255,0.07)";
    reflectionRadius = "200px";
  }

  // Dynamic light mask
  const background = useMotionTemplate`radial-gradient(${reflectionRadius} circle at ${mouseX}px ${mouseY}px, ${reflectionColor}, transparent 100%)`;

  const innerContent = (
    <>
      {canHover && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-500 ease-out"
          style={{ background }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
        />
      )}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </>
  );

  const MotionComp = onClick || tier === "interactive" ? motion.button : motion.div;
  
  return (
    <MotionComp
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative overflow-hidden ${className}`}
      whileHover={canHover && (tier === "interactive" || onClick) ? { scale: 1.02 } : undefined}
      whileTap={canHover && (tier === "interactive" || onClick) ? { scale: 0.98 } : undefined}
      {...(tier === "interactive" || onClick ? { type: "button" } : {})}
      {...interactiveProps}
    >
      {innerContent}
    </MotionComp>
  );
}
