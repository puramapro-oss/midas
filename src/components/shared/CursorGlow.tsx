'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

const GLOW_SIZE = 300;
const SPRING_CONFIG = { damping: 25, stiffness: 200, mass: 0.5 };

export default function CursorGlow({ children }: { children: React.ReactNode }) {
  const [isDesktop, setIsDesktop] = useState(false);
  const cursorX = useMotionValue(-GLOW_SIZE);
  const cursorY = useMotionValue(-GLOW_SIZE);
  const springX = useSpring(cursorX, SPRING_CONFIG);
  const springY = useSpring(cursorY, SPRING_CONFIG);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDesktop) return;
      cursorX.set(e.clientX - GLOW_SIZE / 2);
      cursorY.set(e.clientY - GLOW_SIZE / 2);
    },
    [isDesktop, cursorX, cursorY]
  );

  return (
    <div className="relative" onMouseMove={handleMouseMove}>
      {isDesktop && (
        <motion.div
          className="pointer-events-none fixed z-[1] rounded-full"
          style={{
            x: springX,
            y: springY,
            width: GLOW_SIZE,
            height: GLOW_SIZE,
            background:
              'radial-gradient(circle, rgba(255,215,0,0.07) 0%, rgba(255,215,0,0.03) 40%, transparent 70%)',
          }}
        />
      )}
      {children}
    </div>
  );
}
