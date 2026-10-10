"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Screw,
} from "./panel-parts";

export type WiperPosition = "PARK" | "INT" | "LOW" | "HIGH";

export const WIPER_POSITIONS: WiperPosition[] = ["PARK", "INT", "LOW", "HIGH"];

export const WIPER_ANGLES: Record<WiperPosition, number> = {
  PARK: 0,
  INT: 45,
  LOW: 90,
  HIGH: 135,
};

export const wiperStore: Record<"L" | "R", WiperPosition> = {
  L: "PARK",
  R: "PARK",
};

export const wiperListeners = new Set<() => void>();

export function useWiperState(side: "L" | "R") {
  const [position, setPosition] = useState<WiperPosition>(wiperStore[side]);

  useEffect(() => {
    const listener = () => {
      setPosition(wiperStore[side]);
    };
    wiperListeners.add(listener);
    return () => {
      wiperListeners.delete(listener);
    };
  }, [side]);

  const updatePosition = useCallback(
    (newPos: WiperPosition) => {
      wiperStore[side] = newPos;
      wiperListeners.forEach((l) => l());
    },
    [side],
  );

  return [position, updatePosition] as const;
}

export function WiperDial({
  label,
  position,
  onChange,
}: {
  label: string;
  position: WiperPosition;
  onChange: (newPos: WiperPosition) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const angle = WIPER_ANGLES[position];

  const handleStep = useCallback(
    (direction: number) => {
      const currentIndex = WIPER_POSITIONS.indexOf(position);
      const nextIndex = Math.max(
        0,
        Math.min(WIPER_POSITIONS.length - 1, currentIndex + direction),
      );
      onChange(WIPER_POSITIONS[nextIndex]);
    },
    [position, onChange],
  );

  const handleClick = () => {
    const currentIndex = WIPER_POSITIONS.indexOf(position);
    const nextIndex = (currentIndex + 1) % WIPER_POSITIONS.length;
    onChange(WIPER_POSITIONS[nextIndex]);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      handleStep(e.deltaY < 0 ? 1 : -1);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [handleStep]);

  return (
    <>
      <span className="wiper-title">{label}</span>
      <div
        ref={containerRef}
        onClick={handleClick}
        className="wiper-dial-container cursor-pointer select-none"
        title={`${label} (${position}) - Clic o rueda para cambiar posición`}
      >
        <svg
          viewBox="-54 -54 108 108"
          style={{ width: "100%", height: "100%", overflow: "visible" }}
        >
          {/* Base dish ring under the knob */}
          <circle
            cx="0"
            cy="0"
            r="23"
            fill="#eff2f4"
            stroke="#4a4e50"
            strokeWidth="1.8"
          />

          {/* Tick lines from dish border outwards */}
          {/* PARK (0° - straight up) */}
          <line
            x1="0"
            y1="-23"
            x2="0"
            y2="-32"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* INT (45° clockwise) */}
          <line
            x1="16.26"
            y1="-16.26"
            x2="23.33"
            y2="-23.33"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* LOW (90° clockwise - horizontal right) */}
          <line
            x1="23"
            y1="0"
            x2="32"
            y2="0"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* HIGH (135° clockwise) */}
          <line
            x1="16.26"
            y1="16.26"
            x2="23.33"
            y2="23.33"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Position Text Labels */}
          <text
            x="0"
            y="-35"
            textAnchor="middle"
            fill="#ffffff"
            fontFamily="Arial, sans-serif"
            fontSize="8.5"
            fontWeight="bold"
            letterSpacing="0.04em"
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onChange("PARK");
            }}
          >
            PARK
          </text>
          <text
            x="30"
            y="-20"
            textAnchor="start"
            fill="#ffffff"
            fontFamily="Arial, sans-serif"
            fontSize="8.5"
            fontWeight="bold"
            letterSpacing="0.04em"
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onChange("INT");
            }}
          >
            INT
          </text>
          <text
            x="37"
            y="3"
            textAnchor="start"
            fill="#ffffff"
            fontFamily="Arial, sans-serif"
            fontSize="8.5"
            fontWeight="bold"
            letterSpacing="0.04em"
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onChange("LOW");
            }}
          >
            LOW
          </text>
          <text
            x="30"
            y="26"
            textAnchor="start"
            fill="#ffffff"
            fontFamily="Arial, sans-serif"
            fontSize="8.5"
            fontWeight="bold"
            letterSpacing="0.04em"
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onChange("HIGH");
            }}
          >
            HIGH
          </text>

          {/* Rotating Boeing Pointer Knob */}
          <g
            transform={`rotate(${angle})`}
            style={{
              transition: "transform 0.15s cubic-bezier(0.2, 0, 1, 1)",
              filter: "drop-shadow(0px 2px 3px rgba(0, 0, 0, 0.7))",
            }}
          >
            {/* Pointer body */}
            <path
              d="M -13 18 L -13 -7 L -5 -23 L 5 -23 L 13 -7 L 13 18 A 9 9 0 0 1 4 27 L -4 27 A 9 9 0 0 1 -13 18 Z"
              fill="#eff2f4"
              stroke="#4a4e50"
              strokeWidth="2"
            />
            {/* Shading facet on right of nose */}
            <polygon
              points="0,-23 5,-23 13,-7 0,-7"
              fill="#dfe3e6"
            />
            {/* White stripe with crisp black outline */}
            <rect
              x="-2"
              y="-21"
              width="4"
              height="44"
              fill="#ffffff"
              stroke="#000000"
              strokeWidth="1.2"
              rx="0.5"
            />
          </g>
        </svg>
      </div>
    </>
  );
}

export function SingleWiperPanel({
  side,
  className = "",
}: {
  side: "L" | "R";
  className?: string;
}) {
  const [position, setPosition] = useWiperState(side);
  const label = `${side} WIPER`;

  return (
    <section
      className={`aircraft-panel single-wiper-panel ${className}`}
      aria-label={`${label} control`}
    >
      <WiperDial
        label={label}
        position={position}
        onChange={setPosition}
      />
      {/* Boeing Diagonal Screws: Top-Right & Bottom-Left */}
      <Screw className="wiper-screw-tr" />
      <Screw className="wiper-screw-bl" />
    </section>
  );
}

export function LeftWiperPanel(props: { className?: string }) {
  return <SingleWiperPanel side="L" {...props} />;
}

export function RightWiperPanel(props: { className?: string }) {
  return <SingleWiperPanel side="R" {...props} />;
}

export function WindshieldWiperPanel() {
  return (
    <div className="windshield-wiper-dual-container">
      <LeftWiperPanel />
      <RightWiperPanel />
    </div>
  );
}
