'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const COLORS = ['#FFD700', '#FFC107', '#B8860B', '#FFE44D', '#F59E0B'];
const PIECE_COUNT = 50;

interface ConfettiPiece {
  id: number;
  x: number;
  size: number;
  color: string;
  rotation: number;
  delay: number;
  drift: number;
  duration: number;
  isCircle: boolean;
}

function generatePieces(): ConfettiPiece[] {
  return Array.from({ length: PIECE_COUNT }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    size: 4 + Math.random() * 6,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotation: Math.random() * 360,
    delay: Math.random() * 0.6,
    drift: (Math.random() - 0.5) * 80,
    duration: 2.6 + Math.random() * 0.8,
    isCircle: Math.random() > 0.5,
  }));
}

export default function Confetti({ active }: { active: boolean }) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>(() => active ? generatePieces() : []);

  useEffect(() => {
    if (active && pieces.length === 0) {
      queueMicrotask(() => setPieces(generatePieces()));
    }
  }, [active, pieces.length]);

  return (
    <AnimatePresence>
      {active && (
        <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
          {pieces.map((piece) => (
            <motion.div
              key={piece.id}
              initial={{
                x: `${piece.x}vw`,
                y: -20,
                rotate: 0,
                opacity: 1,
                scale: 1,
              }}
              animate={{
                y: '110vh',
                x: `calc(${piece.x}vw + ${piece.drift}px)`,
                rotate: piece.rotation + 720,
                opacity: [1, 1, 0.8, 0],
                scale: [1, 1.1, 0.9, 0.6],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: piece.duration,
                delay: piece.delay,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              style={{
                position: 'absolute',
                width: piece.size,
                height: piece.size,
                backgroundColor: piece.color,
                borderRadius: piece.isCircle ? '50%' : '2px',
                boxShadow: `0 0 ${piece.size}px ${piece.color}40`,
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
