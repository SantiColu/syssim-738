"use client";

import { useRef, useEffect } from "react";
import { gaugeCoord } from "./panel-parts";

export function ScallopedKnob({
  ring = false,
  angle = 0,
  onWheelStep,
  onClick,
  size = 52,
}: {
  ring?: boolean;
  angle?: number;
  onWheelStep?: (direction: number) => void;
  onClick?: () => void;
  size?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !onWheelStep) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      // deltaY < 0 (scroll up) -> +1
      // deltaY > 0 (scroll down) -> -1
      onWheelStep(e.deltaY < 0 ? 1 : -1);
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, [onWheelStep]);

  const numScallops = 18;
  const scallops = Array.from({ length: numScallops }).map((_, i) => {
    const rad = i * ((2 * Math.PI) / numScallops);
    return {
      cx: gaugeCoord(27 + Math.sin(rad) * 19.5),
      cy: gaugeCoord(27 - Math.cos(rad) * 19.5),
    };
  });

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        cursor: "pointer",
        userSelect: "none",
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      title="Perilla giratoria (Rueda del ratón para ajustar)"
    >
      <svg
        viewBox="0 0 54 54"
        style={{
          width: "100%",
          height: "100%",
          overflow: "visible",
          transform: `rotate(${angle}deg)`,
          transition: "transform 0.1s ease-out",
          filter: "drop-shadow(0px 3px 4px rgba(0, 0, 0, 0.65))",
        }}
      >
        <defs>
          <radialGradient id="scallop-face-grad" cx="40%" cy="38%" r="60%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#e2e6e9" />
            <stop offset="100%" stopColor="#bec3c7" />
          </radialGradient>
        </defs>

        {/* Outer 18 Scallop Teeth */}
        {scallops.map((s, i) => (
          <circle
            key={i}
            cx={s.cx}
            cy={s.cy}
            r="3.8"
            fill="#e2e6e9"
            stroke="#383c3e"
            strokeWidth="1.8"
          />
        ))}

        {/* Central Body Circle */}
        <circle
          cx="27"
          cy="27"
          r="19.5"
          fill="#e2e6e9"
          stroke="#383c3e"
          strokeWidth="1.8"
        />

        {ring ? (
          <>
            {/* Dual Concentric Ring for LAND ALT */}
            <circle
              cx="27"
              cy="27"
              r="14.5"
              fill="#d4d9dc"
              stroke="#383c3e"
              strokeWidth="2.2"
            />
            <circle
              cx="27"
              cy="27"
              r="9.5"
              fill="url(#scallop-face-grad)"
              stroke="#383c3e"
              strokeWidth="2"
            />
          </>
        ) : (
          /* Single Central Face for FLT ALT */
          <circle
            cx="27"
            cy="27"
            r="15"
            fill="url(#scallop-face-grad)"
            stroke="#383c3e"
            strokeWidth="2.2"
          />
        )}
      </svg>
    </div>
  );
}

export function PointerKnob({
  angle = 0,
  onWheelStep,
  onClick,
  size = 90,
}: {
  angle?: number;
  onWheelStep?: (direction: number) => void;
  onClick?: () => void;
  size?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !onWheelStep) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Scroll up (deltaY < 0): rotate clockwise (+1)
      // Scroll down (deltaY > 0): rotate counter-clockwise (-1)
      onWheelStep(e.deltaY < 0 ? 1 : -1);
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, [onWheelStep]);

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        cursor: "pointer",
        userSelect: "none",
        position: "relative",
      }}
      title="Selector (Rueda del ratón o clic para cambiar posición)"
    >
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          transform: `rotate(${angle}deg)`,
          transformOrigin: "45px 45px",
          transition: "transform 0.15s cubic-bezier(0.2, 0, 0, 1)",
          willChange: "transform",
          filter: "drop-shadow(0px 2px 2px rgba(0, 0, 0, 0.6))",
        }}
      >
        <svg
          viewBox="0 0 90 90"
          style={{ width: "90px", height: "90px", overflow: "visible" }}
        >
          <g transform="translate(45, 45)">
            {/* Base disc */}
            <circle
              cx="0"
              cy="0"
              r="34"
              fill="#eff2f4"
              stroke="#4a4e50"
              strokeWidth="2.5"
            />
            {/* Pointer body */}
            <path
              d="M -20 26 L -20 -10 L -8 -32 L 8 -32 L 20 -10 L 20 26 A 14 14 0 0 1 6 40 L -6 40 A 14 14 0 0 1 -20 26 Z"
              fill="#eff2f4"
              stroke="#4a4e50"
              strokeWidth="2.5"
            />
            {/* Shading facet on right of nose */}
            <polygon points="0,-32 8,-32 20,-10 0,-10" fill="#dfe3e6" />
            {/* White stripe with crisp black outline */}
            <rect
              x="-2.5"
              y="-30"
              width="5"
              height="58"
              fill="#ffffff"
              stroke="#000000"
              strokeWidth="1.8"
              rx="0.5"
            />
          </g>
        </svg>
      </div>
    </div>
  );
}
