"use client";

import { type ReactNode } from "react";

export function Screw({ className = "" }: { className?: string }) {
  return <i className={`ap-screw ${className}`} />;
}

export function Placard({
  children,
  color = "amber",
  lit = true,
}: {
  children: ReactNode;
  color?: "amber" | "green" | "blue";
  /** Annunciator lights can go dark; plain placards stay lit. */
  lit?: boolean;
}) {
  return <div className={`ap-placard ap-${color}${lit ? "" : " ap-unlit"}`}>{children}</div>;
}

/** Needle swing to the first / last tick of the scale. */
const VALVE_INDICATOR_HALF_SWEEP_DEG = 70;

export function ValvePositionIndicator({ position = 0 }: { position?: number }) {
  // position from -1 (CLOSE) to 1 (OPEN), 0 is middle; the ends land on the
  // end ticks of the scale
  const needleAngle = position * VALVE_INDICATOR_HALF_SWEEP_DEG;
  const ticks = Array.from({ length: 15 }, (_, index) => {
    const radians = ((-VALVE_INDICATOR_HALF_SWEEP_DEG + index * 10) * Math.PI) / 180;
    return {
      x1: 75 + Math.sin(radians) * 43,
      y1: 76 - Math.cos(radians) * 43,
      x2: 75 + Math.sin(radians) * 57,
      y2: 76 - Math.cos(radians) * 57,
      dx: 75 + Math.sin(radians) * 39,
      dy: 76 - Math.cos(radians) * 39,
    };
  });
  return (
    <svg
      className="valve-position-indicator"
      viewBox="0 0 150 92"
      aria-label="Outflow valve position indicator"
    >
      <path
        d="M7 79 A68 68 0 0 1 143 79 Q143 89 133 89 H17 Q7 89 7 79Z"
        fill="#050505"
      />
      <path
        d="M25 74 A52 52 0 0 1 125 74 Q124 80 116 80 H34 Q26 80 25 74Z"
        fill="#947257"
      />
      {ticks.map((tick, index) => (
        <g key={index}>
          <line
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            stroke="white"
            strokeWidth="2"
          />
          <circle cx={tick.dx} cy={tick.dy} r="2.2" fill="#66f5a5" />
        </g>
      ))}
      {/* Needle */}
      <line
        x1="75"
        y1="76"
        x2="75"
        y2="24"
        stroke="#ffffff"
        strokeWidth="2.5"
        style={{
          transformOrigin: "75px 76px",
          transform: `rotate(${needleAngle}deg)`,
          transition: "transform 0.3s cubic-bezier(0.2, 0, 0, 1)",
        }}
      />
      <circle
        cx="75"
        cy="76"
        r="4.5"
        fill="#222"
        stroke="#fff"
        strokeWidth="1.5"
      />
    </svg>
  );
}
