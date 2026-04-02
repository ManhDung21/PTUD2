import React from 'react';
import { Apple, Cherry, Citrus, Grape, Leaf, Plus } from 'lucide-react';

export const FruitPatternBg = () => {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden opacity-10 dark:opacity-20 text-slate-800 dark:text-white">
      <svg width="100%" height="100%" style={{ color: 'inherit' }}>
        <defs>
          <pattern id="fruit-pattern" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
            {/* Telegram-style doodles: scattered, rotated, and semi-transparent line art */}
            <svg x="20" y="30" overflow="visible">
              <g transform="scale(1.2) rotate(-15)"><Apple stroke="currentColor" strokeWidth="1.5" size={24} /></g>
            </svg>
            <svg x="110" y="40" overflow="visible">
              <g transform="scale(1.1) rotate(10)"><Cherry stroke="currentColor" strokeWidth="1.5" size={24} /></g>
            </svg>
            <svg x="50" y="110" overflow="visible">
              <g transform="scale(1.3) rotate(25)"><Citrus stroke="currentColor" strokeWidth="1.5" size={24} /></g>
            </svg>
            <svg x="140" y="130" overflow="visible">
              <g transform="scale(1.1) rotate(-10)"><Grape stroke="currentColor" strokeWidth="1.5" size={24} /></g>
            </svg>
            <svg x="90" y="80" overflow="visible">
              <g transform="scale(0.8) rotate(45)"><Leaf stroke="currentColor" strokeWidth="1.5" size={24} /></g>
            </svg>
            <svg x="160" y="10" overflow="visible">
              <g transform="scale(0.5) rotate(70)"><Plus stroke="currentColor" strokeWidth="2" size={24} /></g>
            </svg>
            <svg x="10" y="160" overflow="visible">
              <g transform="scale(0.6) rotate(-20)"><Leaf stroke="currentColor" strokeWidth="1.5" size={24} /></g>
            </svg>
            <svg x="180" y="180" overflow="visible">
              <g transform="scale(1) rotate(15)"><Apple stroke="currentColor" strokeWidth="1.5" size={24} /></g>
            </svg>
          </pattern>
        </defs>
        {/* Fill the background with the repeating pattern */}
        <rect width="100%" height="100%" fill="url(#fruit-pattern)" />
      </svg>
    </div>
  );
};
