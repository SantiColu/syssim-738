"use client";

import { useState, useRef, useEffect, type CSSProperties, type ReactNode } from "react";

function Screw({ className = "" }: { className?: string }) {
  return <i className={`ap-screw ${className}`} />;
}

function Placard({
  children,
  color = "amber",
}: {
  children: ReactNode;
  color?: "amber" | "green" | "blue";
}) {
  return <div className={`ap-placard ap-${color}`}>{children}</div>;
}

function Toggle({ angle = 0 }: { angle?: number }) {
  return (
    <div className="ap-toggle">
      <i style={{ "--toggle-angle": `${angle}deg` } as CSSProperties} />
    </div>
  );
}

function Selector({
  angle = 0,
  large = false,
}: {
  angle?: number;
  large?: boolean;
}) {
  return (
    <div className={`ap-selector ${large ? "large" : ""}`}>
      <i style={{ transform: `rotate(${angle}deg)` }} />
    </div>
  );
}

const DIGIT_SEGMENTS: Record<string, number[]> = {
  "0": [1, 1, 1, 1, 1, 1, 0],
  "1": [0, 1, 1, 0, 0, 0, 0],
  "2": [1, 1, 0, 1, 1, 0, 1],
  "3": [1, 1, 1, 1, 0, 0, 1],
  "4": [0, 1, 1, 0, 0, 1, 1],
  "5": [1, 0, 1, 1, 0, 1, 1],
  "6": [1, 0, 1, 1, 1, 1, 1],
  "7": [1, 1, 1, 0, 0, 0, 0],
  "8": [1, 1, 1, 1, 1, 1, 1],
  "9": [1, 1, 1, 1, 0, 1, 1],
  "-": [0, 0, 0, 0, 0, 0, 1],
  " ": [0, 0, 0, 0, 0, 0, 0],
};

function SevenSegmentCell({ char = " " }: { char?: string }) {
  const segs = DIGIT_SEGMENTS[char] || DIGIT_SEGMENTS[" "];
  return (
    <svg viewBox="0 0 24 36" style={{ width: "24px", height: "36px", flexShrink: 0 }}>
      {/* Cell Background & Divider */}
      <rect x="0.5" y="0.5" width="23" height="35" fill="#dce1e4" stroke="#181a1c" strokeWidth="1" />
      
      {/* 7 Segments (slanted italic) */}
      <g transform="skewX(-5) translate(3, 3)">
        {/* a: top horizontal */}
        <polygon
          points="2,2 14,2 12,4.5 4,4.5"
          fill={segs[0] ? "#181a1c" : "#c4cad0"}
          stroke={segs[0] ? "#181a1c" : "#b0b6bc"}
          strokeWidth="0.5"
        />
        {/* b: top right vertical */}
        <polygon
          points="14.5,2.5 14.5,14 12.5,12 12.5,4.5"
          fill={segs[1] ? "#181a1c" : "#c4cad0"}
          stroke={segs[1] ? "#181a1c" : "#b0b6bc"}
          strokeWidth="0.5"
        />
        {/* c: bottom right vertical */}
        <polygon
          points="14.5,16 14.5,27.5 12.5,25.5 12.5,18"
          fill={segs[2] ? "#181a1c" : "#c4cad0"}
          stroke={segs[2] ? "#181a1c" : "#b0b6bc"}
          strokeWidth="0.5"
        />
        {/* d: bottom horizontal */}
        <polygon
          points="2,28 14,28 12,25.5 4,25.5"
          fill={segs[3] ? "#181a1c" : "#c4cad0"}
          stroke={segs[3] ? "#181a1c" : "#b0b6bc"}
          strokeWidth="0.5"
        />
        {/* e: bottom left vertical */}
        <polygon
          points="1.5,16 1.5,27.5 3.5,25.5 3.5,18"
          fill={segs[4] ? "#181a1c" : "#c4cad0"}
          stroke={segs[4] ? "#181a1c" : "#b0b6bc"}
          strokeWidth="0.5"
        />
        {/* f: top left vertical */}
        <polygon
          points="1.5,2.5 1.5,14 3.5,12 3.5,4.5"
          fill={segs[5] ? "#181a1c" : "#c4cad0"}
          stroke={segs[5] ? "#181a1c" : "#b0b6bc"}
          strokeWidth="0.5"
        />
        {/* g: middle horizontal */}
        <polygon
          points="3,15 13,15 14,15.5 13,16 3,16 2,15.5"
          fill={segs[6] ? "#181a1c" : "#c4cad0"}
          stroke={segs[6] ? "#181a1c" : "#b0b6bc"}
          strokeWidth="0.5"
        />
        {/* Decimal dot at bottom right */}
        <circle
          cx="16"
          cy="27"
          r="1.2"
          fill="#c4cad0"
          stroke="#b0b6bc"
          strokeWidth="0.4"
        />
      </g>
    </svg>
  );
}

export function DigitalDisplay({ value = "10000" }: { value?: string | number }) {
  const str = String(value).padStart(5, " ");
  const chars = str.slice(-5).split("");

  return (
    <div
      style={{
        display: "inline-flex",
        background: "#08090a",
        border: "2px solid #141618",
        borderRadius: "2px",
        padding: "2px 10px",
        gap: "1px",
        boxShadow: "inset 0 1px 4px rgba(0,0,0,0.8), 0 1px 2px rgba(255,255,255,0.1)",
      }}
    >
      {chars.map((ch, index) => (
        <SevenSegmentCell key={index} char={ch} />
      ))}
    </div>
  );
}

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
      cx: 27 + Math.sin(rad) * 19.5,
      cy: 27 - Math.cos(rad) * 19.5,
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

function ValvePositionIndicator({ position = 0 }: { position?: number }) {
  // position from -1 (CLOSE) to 1 (OPEN), 0 is middle
  const needleAngle = position * 45;
  const ticks = Array.from({ length: 15 }, (_, index) => {
    const radians = ((-70 + index * 10) * Math.PI) / 180;
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
      <circle cx="75" cy="76" r="4.5" fill="#222" stroke="#fff" strokeWidth="1.5" />
    </svg>
  );
}

function RoundGauge({
  variant,
}: {
  variant: "altitude" | "climb" | "temperature";
}) {
  const temperature = variant === "temperature";
  const labels = temperature
    ? ["0", "20", "40", "60", "80", "100"]
    : variant === "climb"
      ? ["0", "1", "2", "3", "4", "3", "2", "1"]
      : ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  return (
    <div className={`ap-gauge ap-gauge-${variant}`}>
      <div className="ap-gauge-ticks">
        {Array.from({ length: temperature ? 31 : 40 }).map((_, index) => (
          <i
            key={index}
            style={{
              transform: `rotate(${index * (360 / (temperature ? 31 : 40))}deg)`,
            }}
          />
        ))}
      </div>
      {labels.map((label, index) => {
        const angle = temperature
          ? 220 + index * 44
          : index * (360 / labels.length);
        return (
          <span
            key={`${label}-${index}`}
            style={{ "--label-angle": `${angle}deg` } as CSSProperties}
          >
            {label}
          </span>
        );
      })}
      <b>
        {temperature ? (
          <>
            TEMP
            <br />
            <small>°C</small>
          </>
        ) : variant === "climb" ? (
          <>
            CABIN CLIMB
            <br />
            <small>1000 FEET PER MIN</small>
          </>
        ) : (
          <>
            CABIN
            <br />
            ALT
          </>
        )}
      </b>
      <em className="ap-gauge-needle" />
      <u />
    </div>
  );
}

function PolarTick({
  angle,
  inner,
  outer,
  width = 1,
}: {
  angle: number;
  inner: number;
  outer: number;
  width?: number;
}) {
  const radians = ((angle - 90) * Math.PI) / 180;
  const point = (radius: number) => ({
    x: 100 + Math.cos(radians) * radius,
    y: 100 + Math.sin(radians) * radius,
  });
  const a = point(inner);
  const b = point(outer);
  return (
    <line
      x1={a.x}
      y1={a.y}
      x2={b.x}
      y2={b.y}
      stroke="white"
      strokeWidth={width}
    />
  );
}

function PolarLabel({
  angle,
  radius,
  children,
  size = 8,
}: {
  angle: number;
  radius: number;
  children: ReactNode;
  size?: number;
}) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return (
    <text
      x={100 + Math.cos(radians) * radius}
      y={103 + Math.sin(radians) * radius}
      fill="white"
      fontSize={size}
      textAnchor="middle"
      fontFamily="monospace"
    >
      {children}
    </text>
  );
}

function CabinPressureGauge() {
  const scaleAngles = Array.from(
    { length: 51 },
    (_, index) => index * (327 / 50),
  );
  return (
    <svg
      className="cabin-pressure-gauge"
      viewBox="0 0 200 200"
      role="img"
      aria-label="Cabin altitude and differential pressure indicator"
    >
      <circle
        cx="100"
        cy="100"
        r="96"
        fill="#020202"
        stroke="#383838"
        strokeWidth="8"
      />
      {scaleAngles.map((angle, i) => (
        <PolarTick
          key={`outer-${i}`}
          angle={angle}
          inner={i % 5 === 0 ? 75 : 81}
          outer={88}
          width={i % 5 === 0 ? 2 : 1}
        />
      ))}
      {scaleAngles.map((angle, i) => (
        <PolarTick
          key={`inner-${i}`}
          angle={angle}
          inner={i % 5 === 0 ? 48 : 54}
          outer={60}
          width={i % 5 === 0 ? 1.8 : 0.9}
        />
      ))}
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n, i) => (
        <PolarLabel
          key={n}
          angle={[42, 72, 96, 124, 151, 194, 226, 263, 292, 327][i]}
          radius={69}
          size={8}
        >
          {n}
        </PolarLabel>
      ))}
      {[0, 5, 10, 15, 20, 25, 30, 35, 40, 50].map((n, i) => (
        <PolarLabel
          key={n}
          angle={[0, 43, 94, 150, 190, 235, 270, 286, 306, 334][i]}
          radius={41}
          size={7}
        >
          {n}
        </PolarLabel>
      ))}
      <path
        d="M31 52 A83 83 0 0 0 19 82"
        fill="none"
        stroke="#ffb700"
        strokeWidth="9"
      />
      <path
        d="M38 42 A83 83 0 0 0 31 52"
        fill="none"
        stroke="#df1717"
        strokeWidth="5"
      />
      <text
        x="55"
        y="28"
        fill="white"
        fontSize="8"
        fontFamily="monospace"
        transform="rotate(-24 55 28)"
      >
        DIFF PRESS
      </text>
      <text x="78" y="35" fill="white" fontSize="7" fontFamily="monospace">
        PSI
      </text>
      <text
        x="100"
        y="77"
        fill="white"
        fontSize="9"
        textAnchor="middle"
        fontFamily="monospace"
      >
        CABIN
      </text>
      <text
        x="100"
        y="87"
        fill="white"
        fontSize="9"
        textAnchor="middle"
        fontFamily="monospace"
      >
        ALT
      </text>
      <text
        x="100"
        y="125"
        fill="white"
        fontSize="6"
        textAnchor="middle"
        fontFamily="monospace"
      >
        X 1000 FEET
      </text>
      <polygon points="100,95 35,131 91,105" fill="white" />
      <polygon points="100,94 163,103 100,106" fill="white" />
      <circle
        cx="100"
        cy="100"
        r="8"
        fill="#090909"
        stroke="#aaa"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function CabinClimbGauge() {
  const climbLabels = [
    { value: ".5", angle: -58 },
    { value: "1", angle: -20 },
    { value: "2", angle: 25 },
    { value: "3", angle: 58 },
    { value: "4", angle: 90 },
    { value: ".5", angle: -122 },
    { value: "1", angle: 180 },
    { value: "2", angle: 155 },
    { value: "3", angle: 122 },
  ];
  return (
    <svg
      className="cabin-climb-gauge"
      viewBox="0 0 200 200"
      role="img"
      aria-label="Cabin climb indicator"
    >
      <defs>
        <path id="climb-title-path" d="M43 79 A66 66 0 0 1 157 79" />
        <path id="climb-unit-path" d="M38 129 A70 70 0 0 0 162 129" />
      </defs>
      <circle
        cx="100"
        cy="100"
        r="94"
        fill="#020202"
        stroke="#383838"
        strokeWidth="9"
      />
      {Array.from({ length: 41 }).map((_, i) => (
        <PolarTick
          key={`up-${i}`}
          angle={-90 + i * 4.5}
          inner={i % 10 === 0 ? 69 : 77}
          outer={87}
          width={i % 10 === 0 ? 2 : 1}
        />
      ))}
      {Array.from({ length: 41 }).map((_, i) => (
        <PolarTick
          key={`down-${i}`}
          angle={-90 - i * 4.5}
          inner={i % 10 === 0 ? 69 : 77}
          outer={87}
          width={i % 10 === 0 ? 2 : 1}
        />
      ))}
      <PolarLabel angle={-90} radius={63} size={10}>
        0
      </PolarLabel>
      {climbLabels.map(({ value, angle }) => (
        <PolarLabel
          key={`${value}-${angle}`}
          angle={angle}
          radius={61}
          size={10}
        >
          {value}
        </PolarLabel>
      ))}
      <text fill="white" fontSize="10" fontFamily="monospace">
        <textPath
          href="#climb-title-path"
          startOffset="50%"
          textAnchor="middle"
        >
          CABIN CLIMB
        </textPath>
      </text>
      <text fill="#1538ff" fontSize="9" fontFamily="monospace">
        <textPath href="#climb-unit-path" startOffset="50%" textAnchor="middle">
          1000 FEET PER MIN
        </textPath>
      </text>
      <text x="28" y="82" fill="white" fontSize="8" fontFamily="monospace">
        UP
      </text>
      <text x="27" y="125" fill="white" fontSize="8" fontFamily="monospace">
        DN
      </text>
      <polygon points="100,94 35,100 100,106" fill="white" />
      <rect x="100" y="91" width="31" height="18" fill="white" />
      <circle
        cx="100"
        cy="100"
        r="10"
        fill="#080808"
        stroke="#aaa"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function AircraftToggleSwitch({
  position = "DOWN",
  circleColor = "black",
  orientation = "vertical",
  onClick,
  onWheelStep,
  size = 40,
}: {
  position?: "UP" | "CENTER" | "DOWN";
  circleColor?: "black" | "red" | "light";
  orientation?: "vertical" | "horizontal";
  onClick?: () => void;
  onWheelStep?: (direction: number) => void;
  size?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isUp = position === "UP";
  const isCenter = position === "CENTER";
  const isDown = position === "DOWN";

  const targetY = isUp ? -19 : isCenter ? 0 : 19;
  const stemEndY = targetY * 0.85;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !onWheelStep) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      // deltaY < 0 (scroll up) -> direction -1 (UP / LEFT / CLOSE)
      // deltaY > 0 (scroll down) -> direction 1 (DOWN / RIGHT / OPEN)
      onWheelStep(e.deltaY < 0 ? -1 : 1);
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, [onWheelStep]);

  const isLight = circleColor === "light";

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
      title="Interruptor (Rueda del ratón o clic para cambiar de posición)"
    >
      <svg
        viewBox="0 0 44 44"
        style={{
          width: "100%",
          height: "100%",
          overflow: "visible",
          pointerEvents: "none",
        }}
      >
        <defs>
          <radialGradient id={`dish-grad-${circleColor}`} cx="45%" cy="40%" r="55%">
            {circleColor === "red" ? (
              <>
                <stop offset="0%" stopColor="#8a1a1a" />
                <stop offset="60%" stopColor="#631010" />
                <stop offset="100%" stopColor="#420808" />
              </>
            ) : isLight ? (
              <>
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="50%" stopColor="#e4e8ea" />
                <stop offset="85%" stopColor="#c8ced1" />
                <stop offset="100%" stopColor="#9da3a6" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#757b7d" />
                <stop offset="60%" stopColor="#555a5c" />
                <stop offset="100%" stopColor="#35393b" />
              </>
            )}
          </radialGradient>
          <radialGradient id="bat-head-grad" cx="36%" cy="32%" r="62%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="35%" stopColor="#dce0e3" />
            <stop offset="75%" stopColor="#a3a8ab" />
            <stop offset="100%" stopColor="#767b7e" />
          </radialGradient>
          <linearGradient id="stem-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7e8386" />
            <stop offset="30%" stopColor="#e8ecf0" />
            <stop offset="65%" stopColor="#bec3c7" />
            <stop offset="100%" stopColor="#6e7376" />
          </linearGradient>
        </defs>

        {/* 1. Base Bezel (Concentric Rings) */}
        {/* Outer Ring */}
        <circle
          cx="22"
          cy="22"
          r="19"
          fill={isLight ? "#a8aeb1" : "#92989a"}
          stroke="#3d4143"
          strokeWidth="2.5"
        />

        {/* Sunken Cavity / Dish */}
        <circle
          cx="22"
          cy="22"
          r="15"
          fill={`url(#dish-grad-${circleColor})`}
          stroke="#323537"
          strokeWidth="2"
        />

        {/* Middle Concentric Groove */}
        <circle
          cx="22"
          cy="22"
          r="10.5"
          fill="none"
          stroke={circleColor === "red" ? "#8c2020" : isLight ? "#9da3a6" : "#44484a"}
          strokeWidth="2"
        />

        {/* Inner Pivot Center Collar */}
        <circle
          cx="22"
          cy="22"
          r="6.5"
          fill="none"
          stroke={circleColor === "red" ? "#a82828" : isLight ? "#b8bec1" : "#555a5c"}
          strokeWidth="1.6"
        />

        {/* 2. Switch Bat / Lever anchored at Center (22, 22) */}
        <g
          transform={orientation === "horizontal" ? "translate(22, 22) rotate(-90)" : "translate(22, 22)"}
          style={{
            filter: "drop-shadow(0px 3px 3.5px rgba(0, 0, 0, 0.7))",
          }}
        >
          {/* Cylindrical Stem extending from center (0, 0) */}
          {!isCenter && (
            <path
              d={`M -5 0 L -5 ${stemEndY} L 5 ${stemEndY} L 5 0 Z`}
              fill="url(#stem-grad)"
              stroke="#303335"
              strokeWidth="2.2"
              strokeLinejoin="round"
              style={{
                transition: "d 0.15s cubic-bezier(0.2, 0, 0, 1)",
              }}
            />
          )}

          {/* Stem junction collar ring */}
          {!isCenter && (
            <path
              d={isDown ? `M -7.5 ${stemEndY} A 7.5 4 0 0 1 7.5 ${stemEndY}` : `M -7.5 ${stemEndY} A 7.5 4 0 0 0 7.5 ${stemEndY}`}
              fill="none"
              stroke="#303335"
              strokeWidth="2"
              style={{
                transition: "all 0.15s cubic-bezier(0.2, 0, 0, 1)",
              }}
            />
          )}

          {/* Solid Rounded Bat Head (Ball) */}
          <g
            style={{
              transform: `translate(0px, ${targetY}px)`,
              transition: "transform 0.15s cubic-bezier(0.2, 0, 0, 1)",
              willChange: "transform",
            }}
          >
            <ellipse
              cx="0"
              cy="0"
              rx="8"
              ry="9"
              fill="url(#bat-head-grad)"
              stroke="#303335"
              strokeWidth="2.4"
            />

            {/* Head 3D inner contour arc */}
            {isDown && (
              <path
                d="M -5.5 -1.5 A 6 5 0 0 1 5.5 -1.5"
                fill="none"
                stroke="#45494c"
                strokeWidth="1.5"
              />
            )}
            {isUp && (
              <path
                d="M -5.5 1.5 A 6 5 0 0 0 5.5 1.5"
                fill="none"
                stroke="#45494c"
                strokeWidth="1.5"
              />
            )}
          </g>
        </g>
      </svg>
    </div>
  );
}

export function EquipmentCoolingPanel() {
  const [supplyPos, setSupplyPos] = useState<"NORM" | "ALTN">("NORM");
  const [exhaustPos, setExhaustPos] = useState<"NORM" | "ALTN">("NORM");

  const handleSupplyWheel = (dir: number) => {
    setSupplyPos(dir < 0 ? "NORM" : "ALTN");
  };

  const handleExhaustWheel = (dir: number) => {
    setExhaustPos(dir < 0 ? "NORM" : "ALTN");
  };

  return (
    <section
      className="aircraft-panel equipment-cooling-panel"
      aria-label="Equipment cooling panel"
    >
      <div className="ap-chamfer top" />
      <div className="ap-chamfer bottom" />
      <h2>EQUIP COOLING</h2>
      <div className="ap-rule top-rule" />
      <div className="cooling-head">
        <span>SUPPLY</span>
        <span>EXHAUST</span>
      </div>
      <div className="cooling-norm">NORM</div>
      <div className="cooling-controls" style={{ display: "flex", justifyContent: "space-around", marginTop: "24px" }}>
        <AircraftToggleSwitch
          position={supplyPos === "NORM" ? "UP" : "DOWN"}
          onClick={() => setSupplyPos(p => p === "NORM" ? "ALTN" : "NORM")}
          onWheelStep={handleSupplyWheel}
          size={54}
        />
        <AircraftToggleSwitch
          position={exhaustPos === "NORM" ? "UP" : "DOWN"}
          onClick={() => setExhaustPos(p => p === "NORM" ? "ALTN" : "NORM")}
          onWheelStep={handleExhaustWheel}
          size={54}
        />
      </div>
      <div className="cooling-alt">ALTN</div>
      <div className="cooling-lights">
        <Placard color={supplyPos === "ALTN" ? "amber" : undefined}>OFF</Placard>
        <Placard color={exhaustPos === "ALTN" ? "amber" : undefined}>OFF</Placard>
      </div>
      <div className="ap-rule bottom-rule" />
      <Screw className="s1" />
      <Screw className="s2" />
      <Screw className="s3" />
      <Screw className="s4" />
    </section>
  );
}

export function AircraftPushButton({
  labelTop,
  labelBottom,
  onPressStart,
  onPressEnd,
  onClick,
  size = 36,
}: {
  labelTop?: string | string[];
  labelBottom?: string | string[];
  onPressStart?: () => void;
  onPressEnd?: () => void;
  onClick?: () => void;
  size?: number;
}) {
  const [isPressed, setIsPressed] = useState(false);

  const handleMouseDown = () => {
    setIsPressed(true);
    onPressStart?.();
  };

  const handleMouseUp = () => {
    setIsPressed(false);
    onPressEnd?.();
  };

  const handleMouseLeave = () => {
    if (isPressed) {
      setIsPressed(false);
      onPressEnd?.();
    }
  };

  const renderLabel = (label: string | string[] | undefined, marginClass: string) => {
    if (!label) return null;
    return (
      <div className={`flex flex-col items-center gap-[2px] ${marginClass}`}>
        {(Array.isArray(label) ? label : [label]).map((line, i) => (
          <span key={i} className="text-white bg-[#7a8183] px-1 py-[1px] leading-none text-[10px] whitespace-nowrap">
            {line}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div
      className="flex flex-col items-center relative z-20 font-mono select-none cursor-pointer"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
      onClick={onClick}
      title="Botón pulsable (Haz clic para presionar)"
    >
      {renderLabel(labelTop, "mb-1.5")}

      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg viewBox="0 0 44 44" style={{ width: "100%", height: "100%", overflow: "visible" }}>
          <defs>
            {/* Recessed Inner Bezel Gradient */}
            <radialGradient id="recess-bevel-grad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#e2e6e8" />
              <stop offset="55%" stopColor="#b2b7ba" />
              <stop offset="85%" stopColor="#7a8083" />
              <stop offset="100%" stopColor="#45494b" />
            </radialGradient>

            {/* Plunger Button Cap Gradient */}
            <radialGradient id="plunger-cap-grad" cx="38%" cy="36%" r="62%">
              <stop offset="0%" stopColor="#3a3d3f" />
              <stop offset="40%" stopColor="#202224" />
              <stop offset="80%" stopColor="#111213" />
              <stop offset="100%" stopColor="#080909" />
            </radialGradient>
          </defs>

          {/* 1. Base Bezel Rings */}
          {/* Outer Ring */}
          <circle
            cx="22"
            cy="22"
            r="19"
            fill="#92989a"
            stroke="#3d4143"
            strokeWidth="2.5"
          />

          {/* Recessed Metallic Bevel Ring */}
          <circle
            cx="22"
            cy="22"
            r="15"
            fill="url(#recess-bevel-grad)"
            stroke="#383c3e"
            strokeWidth="2"
          />

          {/* Crescent Highlight on the metal rim */}
          <path
            d="M 9.5 22 A 12.5 12.5 0 0 1 34.5 22"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.8"
            opacity="0.75"
          />

          {/* Inner Deep Dark Cavity / Socket */}
          <circle
            cx="22"
            cy="22"
            r="11.5"
            fill="#121314"
            stroke="#26292a"
            strokeWidth="1.5"
          />

          {/* 2. Plunger (The Pressable Central Button) */}
          <g
            style={{
              transform: isPressed ? "translate(22px, 23px) scale(0.92)" : "translate(22px, 22px) scale(1)",
              transformOrigin: "center",
              transition: "transform 0.08s ease-out, filter 0.08s ease-out",
              filter: isPressed
                ? "drop-shadow(0px 0.5px 1px rgba(0, 0, 0, 0.9))"
                : "drop-shadow(0px 2.5px 3px rgba(0, 0, 0, 0.75))",
            }}
          >
            {/* Plunger Black Body */}
            <circle
              cx="0"
              cy="0"
              r="8.5"
              fill="url(#plunger-cap-grad)"
              stroke="#2e3133"
              strokeWidth="1.8"
            />

            {/* Plunger 3D Rim / Crescent Edge as seen in reference image */}
            <path
              d="M -6.5 -2.5 A 7 7 0 0 1 6.5 -2.5"
              fill="none"
              stroke="#585d60"
              strokeWidth="1.2"
              opacity="0.85"
            />
          </g>
        </svg>
      </div>

      {renderLabel(labelBottom, "mt-1.5")}
    </div>
  );
}

export function TrimAirSwitch({
  position = "ON",
  onWheelStep,
  onClick,
  size = 48,
}: {
  position?: "ON" | "OFF";
  onWheelStep?: (direction: number) => void;
  onClick?: () => void;
  size?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isOff = position === "OFF";

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !onWheelStep) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      // deltaY < 0 (scroll up) -> direction -1 (OFF / UP)
      // deltaY > 0 (scroll down) -> direction 1 (ON / DOWN)
      onWheelStep(e.deltaY < 0 ? -1 : 1);
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
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      title="TRIM AIR Switch (Rueda del ratón o clic para alternar)"
    >
      <svg
        viewBox="0 0 50 50"
        style={{
          width: "100%",
          height: "100%",
          overflow: "visible",
        }}
      >
        <defs>
          <radialGradient id="trim-cavity-grad" cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#484d50" />
            <stop offset="65%" stopColor="#2c3032" />
            <stop offset="100%" stopColor="#181a1b" />
          </radialGradient>
          <radialGradient id="trim-knob-grad" cx="38%" cy="35%" r="62%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="35%" stopColor="#eee8d7" />
            <stop offset="75%" stopColor="#d5ceba" />
            <stop offset="100%" stopColor="#aba38d" />
          </radialGradient>
        </defs>

        {/* 1. Recessed cavity / dish */}
        <circle
          cx="25"
          cy="25"
          r="16"
          fill="url(#trim-cavity-grad)"
          stroke="#26292b"
          strokeWidth="1.8"
        />

        {/* 2. White arc index mark underneath with tick */}
        <path
          d="M 14 26 A 14 14 0 0 0 36 26"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        {/* Center tick at 6 o'clock */}
        <line
          x1="25"
          y1="37"
          x2="25"
          y2="43"
          stroke="#ffffff"
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        {/* 3. Round Ivory/Cream Knob Head */}
        <g
          style={{
            transform: isOff ? "translate(25px, 17px)" : "translate(25px, 31px)",
            transition: "transform 0.15s cubic-bezier(0.2, 0, 0, 1)",
            filter: "drop-shadow(0px 3px 3.5px rgba(0, 0, 0, 0.75))",
          }}
        >
          <circle
            cx="0"
            cy="0"
            r="11.5"
            fill="url(#trim-knob-grad)"
            stroke="#3a3d3f"
            strokeWidth="2.2"
          />
        </g>
      </svg>
    </div>
  );
}

export function CabinAltitudePanel() {
  return (
    <section
      className="aircraft-panel cabin-altitude-panel"
      aria-label="Cabin altitude instruments"
    >
      <div className="cabin-gauges">
        <div className="cabin-main-bezel" />
        <div className="cabin-climb-bezel" />
        <CabinPressureGauge />
        <div className="pressure-note">
          PRESS DIFF
          <br />
          LIMIT: TAKE-
          <br />
          OFF &amp; LDG
          <br />
          .125 PSI
        </div>
        <CabinClimbGauge />
      </div>
      <div className="horn-column">
        <span>
          ALT
          <br />
          HORN
          <br />
          CUTOUT
        </span>
        <span className="horn-cutout" aria-hidden="true" />
      </div>
      <Screw className="s1" />
      <Screw className="s2" />
      <Screw className="s3" />
      <Screw className="s4" />
    </section>
  );
}

export function LandingScaleTable() {
  return (
    <svg
      viewBox="0 0 326 46"
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        userSelect: "none",
      }}
      aria-label="Cabin and Flight Altitude schedule table"
    >
      {/* Black Background Card */}
      <rect x="0" y="0" width="326" height="46" rx="4" fill="#000000" />

      {/* Main Continuous Horizontal Line (from left edge up to vertical line 6) */}
      <line x1="6" y1="22" x2="286" y2="22" stroke="white" strokeWidth="1.6" />

      {/* Vertical Lines */}
      {/* 1. After CAB ALT / FLT ALT (full height) */}
      <line x1="56" y1="6" x2="56" y2="40" stroke="white" strokeWidth="1.6" />
      {/* 2. After LAND ALT (tick down to y = 28) */}
      <line x1="104" y1="6" x2="104" y2="28" stroke="white" strokeWidth="1.6" />
      {/* 3. Between 2000 & 4000 */}
      <line x1="150" y1="6" x2="150" y2="28" stroke="white" strokeWidth="1.6" />
      {/* 4. Between 4000 & 6000 */}
      <line x1="195" y1="6" x2="195" y2="28" stroke="white" strokeWidth="1.6" />
      {/* 5. Between 6000 & 8000 */}
      <line x1="240" y1="6" x2="240" y2="28" stroke="white" strokeWidth="1.6" />
      {/* 6. After 8000 */}
      <line x1="286" y1="6" x2="286" y2="28" stroke="white" strokeWidth="1.6" />

      {/* Text Elements */}
      <g fill="white" fontFamily="monospace" fontWeight="bold" fontSize="9.5" textAnchor="middle">
        {/* Top Row: Centered in cells between vertical lines */}
        <text x="31" y="16">CAB ALT</text>
        <text x="80" y="16">LAND ALT</text>
        <text x="127" y="16">2000</text>
        <text x="172.5" y="16">4000</text>
        <text x="217.5" y="16">6000</text>
        <text x="263" y="16">8000</text>

        {/* Bottom Row: FLT ALT on left, and Flight Levels centered directly under the vertical lines */}
        <text x="31" y="37">FLT ALT</text>
        <text x="104" y="37">&lt;FL160</text>
        <text x="150" y="37">FL220</text>
        <text x="195" y="37">FL260</text>
        <text x="240" y="37">FL320</text>
        <text x="286" y="37">FL410</text>
      </g>
    </svg>
  );
}

export function CabinAltitudeControlPanel() {
  const [modeIndex, setModeIndex] = useState<number>(0); // 0: AUTO, 1: ALTN, 2: MAN
  const [valvePos, setValvePos] = useState<"CLOSE" | "OFF" | "OPEN">("OFF");
  const [fltAlt, setFltAlt] = useState<number>(10000);
  const [landAlt, setLandAlt] = useState<number>(500);
  const [fltKnobAngle, setFltKnobAngle] = useState<number>(0);
  const [landKnobAngle, setLandKnobAngle] = useState<number>(0);

  const modeAngles = [-35, 0, 35];
  const currentMode = modeIndex === 0 ? "AUTO" : modeIndex === 1 ? "ALTN" : "MAN";

  const handleModeStep = (direction: number) => {
    setModeIndex((prev) => {
      if (direction > 0) return Math.min(2, prev + 1);
      return Math.max(0, prev - 1);
    });
  };

  const handleModeClick = () => {
    setModeIndex((prev) => (prev + 1) % 3);
  };

  const handleFltWheel = (direction: number) => {
    // direction > 0 (scroll up) -> +500 ft
    // direction < 0 (scroll down) -> -500 ft
    setFltAlt((prev) => Math.max(0, Math.min(42000, prev + direction * 500)));
    setFltKnobAngle((prev) => prev + direction * 20);
  };

  const handleLandWheel = (direction: number) => {
    // direction > 0 (scroll up) -> +50 ft
    // direction < 0 (scroll down) -> -50 ft
    setLandAlt((prev) => Math.max(-1000, Math.min(14000, prev + direction * 50)));
    setLandKnobAngle((prev) => prev + direction * 20);
  };

  const handleValveWheel = (direction: number) => {
    // direction < 0 is scroll up -> CLOSE (UP)
    // direction > 0 is scroll down -> OPEN (DOWN)
    setValvePos(direction < 0 ? "CLOSE" : "OPEN");
  };

  const handleValveClick = () => {
    setValvePos((prev) => (prev === "CLOSE" ? "OPEN" : "CLOSE"));
  };

  const needlePosition = valvePos === "CLOSE" ? -0.8 : valvePos === "OPEN" ? 0.8 : 0;

  return (
    <section
      className="aircraft-panel cabin-control-panel"
      aria-label="Cabin altitude control panel"
    >
      <div className="mode-lights">
        <Placard>
          AUTO
          <br />
          FAIL
        </Placard>
        <Placard>
          OFF SCHED
          <br />
          DESCENT
        </Placard>
        <Placard color={currentMode === "ALTN" ? "green" : undefined}>ALTN</Placard>
        <Placard color={currentMode === "MAN" ? "green" : undefined}>MANUAL</Placard>
      </div>
      <div className="control-divider" />
      <div className="control-horizontal" />
      <span className="auto-title">AUTO</span>
      <span className="manual-title">MANUAL</span>
      <div className="flight-display">
        <DigitalDisplay value={fltAlt} />
        <label>FLT ALT</label>
        <ScallopedKnob
          angle={fltKnobAngle}
          onWheelStep={handleFltWheel}
          onClick={() => handleFltWheel(1)}
          size={52}
        />
      </div>
      <div className="landing-display">
        <DigitalDisplay value={landAlt} />
        <label>LAND ALT</label>
        <ScallopedKnob
          ring
          angle={landKnobAngle}
          onWheelStep={handleLandWheel}
          onClick={() => handleLandWheel(1)}
          size={52}
        />
      </div>
      <div className="valve-meter">
        <ValvePositionIndicator position={needlePosition} />
        <span>VALVE</span>
        <div style={{ position: "relative", width: "100%", height: "48px", marginTop: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* Vertical C L O S E on the left */}
          <div
            style={{
              position: "absolute",
              left: "-12px",
              display: "flex",
              flexDirection: "column",
              lineHeight: "1.1",
              fontSize: "12px",
              fontWeight: "bold",
              color: "white",
              textAlign: "center",
              cursor: "pointer",
            }}
            onClick={() => setValvePos("CLOSE")}
          >
            <span>C</span>
            <span>L</span>
            <span>O</span>
            <span>S</span>
            <span>E</span>
          </div>

          {/* Horizontal Toggle Switch */}
          <AircraftToggleSwitch
            position={valvePos === "CLOSE" ? "UP" : valvePos === "OPEN" ? "DOWN" : "CENTER"}
            orientation="horizontal"
            circleColor="light"
            onWheelStep={handleValveWheel}
            onClick={handleValveClick}
            size={48}
          />

          {/* Vertical O P E N on the right */}
          <div
            style={{
              position: "absolute",
              right: "-12px",
              display: "flex",
              flexDirection: "column",
              lineHeight: "1.1",
              fontSize: "12px",
              fontWeight: "bold",
              color: "white",
              textAlign: "center",
              cursor: "pointer",
            }}
            onClick={() => setValvePos("OPEN")}
          >
            <span>O</span>
            <span>P</span>
            <span>E</span>
            <span>N</span>
          </div>
        </div>
      </div>
      <div className="alt-mode" style={{ position: "absolute", top: "258px", right: "22px", textAlign: "center" }}>
        {/* Mode Labels */}
        <div style={{ position: "relative", width: "124px", height: "38px", margin: "0 auto 0 auto" }}>
          <span style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", top: "0px", fontWeight: "bold", fontSize: "14px", color: "white" }}>
            ALTN
          </span>
          <span style={{ position: "absolute", left: "8px", top: "16px", fontWeight: "bold", fontSize: "14px", color: "white" }}>
            AUTO
          </span>
          <span style={{ position: "absolute", right: "8px", top: "16px", fontWeight: "bold", fontSize: "14px", color: "white" }}>
            MAN
          </span>
        </div>
        {/* Mode Selector Knob with 3 Alignment Tick Lines */}
        <div style={{ position: "relative", width: "90px", height: "90px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible" }} viewBox="0 0 90 90">
            {/* Line to AUTO (-35 deg from top center) */}
            <line x1="25" y1="16" x2="20" y2="7" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
            {/* Line to ALTN (0 deg / vertical) */}
            <line x1="45" y1="11" x2="45" y2="2" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
            {/* Line to MAN (+35 deg from top center) */}
            <line x1="65" y1="16" x2="70" y2="7" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
          <PointerKnob
            angle={modeAngles[modeIndex]}
            onWheelStep={handleModeStep}
            onClick={handleModeClick}
            size={90}
          />
        </div>
      </div>
      <div className="landing-scale">
        <LandingScaleTable />
      </div>
      <Screw className="s1" />
      <Screw className="s2" />
      <Screw className="s3" />
      <Screw className="s4" />
    </section>
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
        <svg viewBox="0 0 90 90" style={{ width: "90px", height: "90px", overflow: "visible" }}>
          <g transform="translate(45, 45)">
            {/* Base disc */}
            <circle cx="0" cy="0" r="34" fill="#eff2f4" stroke="#4a4e50" strokeWidth="2.5" />
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
            <rect x="-2.5" y="-30" width="5" height="58" fill="#ffffff" stroke="#000000" strokeWidth="1.8" rx="0.5" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function TempSourceLabels() {
  return (
    <svg
      viewBox="-150 -120 280 230"
      style={{
        position: "absolute",
        left: "-150px",
        top: "-120px",
        width: "280px",
        height: "230px",
        overflow: "visible",
        zIndex: 0,
        pointerEvents: "none",
      }}
    >
      {/* Radial lines and Outer Arcs */}
      <g stroke="white" strokeWidth="2" fill="none">
        {/* Inner lines from knob to labels (r: 35 to 42) - excludes -90 (FWD) */}
        {[-135, -45, 0, 45, 90, 135].map(a => {
          const rad = (a - 90) * Math.PI / 180;
          return <line key={`in-${a}`} x1={35 * Math.cos(rad)} y1={35 * Math.sin(rad)} x2={42 * Math.cos(rad)} y2={42 * Math.sin(rad)} />;
        })}

        {/* Outer radial lines beyond labels (r: 76 to 88) - excludes -90 (FWD) */}
        {[-135, -45, 0, 45, 90, 135].map(a => {
          const rad = (a - 90) * Math.PI / 180;
          return <line key={`out-${a}`} x1={76 * Math.cos(rad)} y1={76 * Math.sin(rad)} x2={88 * Math.cos(rad)} y2={88 * Math.sin(rad)} />;
        })}

        {/* Outer connecting arcs (r = 88) */}
        {/* SUPPLY DUCT arc: -135° to -45° */}
        <path d="M -62.2 62.2 A 88 88 0 0 1 -62.2 -62.2" />
        {/* PASS CAB arc: 0° to 45° */}
        <path d="M 0 -88 A 88 88 0 0 1 62.2 -62.2" />
        {/* PACK arc: 90° to 135° */}
        <path d="M 88 0 A 88 88 0 0 1 62.2 62.2" />
      </g>
      
      {/* Position labels around knob */}
      <g fill="white" fontSize="13" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
        {/* CONT CAB at -135° */}
        <text x="-44" y="38">CONT</text>
        <text x="-44" y="52">CAB</text>
        {/* AFT (SUPPLY DUCT) at -45° */}
        <text x="-41" y="-36">AFT</text>
        {/* FWD (PASS CAB) at 0° */}
        <text x="0" y="-53">FWD</text>
        {/* AFT (PASS CAB) at 45° */}
        <text x="41" y="-36">AFT</text>
        {/* R (PACK) at 90° */}
        <text x="58" y="4">R</text>
        {/* L (PACK) at 135° */}
        <text x="41" y="46">L</text>
      </g>

      {/* Vertical text: FWD (inside SUPPLY DUCT arc) */}
      <g fill="white" fontSize="14" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
        {['F','W','D'].map((char, i) => (
          <text key={`fwd-${i}`} x="-68" y={-14 + i * 15}>{char}</text>
        ))}
      </g>

      {/* Group text: SUPPLY DUCT */}
      <g fill="white" fontSize="14" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
        {['S','U','P','P','L','Y'].map((char, i) => <text key={`s-${i}`} x="-120" y={-50 + i * 16}>{char}</text>)}
        {['D','U','C','T'].map((char, i) => <text key={`d-${i}`} x="-98" y={-34 + i * 16}>{char}</text>)}
      </g>

      {/* Group text: PACK */}
      <g fill="white" fontSize="14" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
        {['P','A','C','K'].map((char, i) => <text key={`p-${i}`} x="105" y={10 + i * 16}>{char}</text>)}
      </g>

      {/* Group texts: AIR TEMP and PASS CAB */}
      <text x="-15" y="-102" fill="white" fontSize="14" fontFamily="monospace" fontWeight="bold" textAnchor="middle">AIR TEMP</text>
      <text x="64" y="-102" fill="white" fontSize="14" fontFamily="monospace" fontWeight="bold" textAnchor="middle">PASS</text>
      <text x="64" y="-88" fill="white" fontSize="14" fontFamily="monospace" fontWeight="bold" textAnchor="middle">CAB</text>
    </svg>
  );
}

export function RoundHeadToggle({
  position = "OFF",
  onToggle,
}: {
  position?: "ON" | "OFF";
  onToggle?: () => void;
}) {
  const isOff = position === "OFF";
  return (
    <svg
      viewBox="0 0 60 60"
      onClick={onToggle}
      style={{
        width: "50px",
        height: "50px",
        overflow: "visible",
        cursor: onToggle ? "pointer" : "default",
      }}
    >
      <defs>
        <radialGradient id="bezel-grad" cx="50%" cy="50%" r="50%">
          <stop offset="60%" stopColor="#4a5053" />
          <stop offset="90%" stopColor="#25282a" />
          <stop offset="100%" stopColor="#151718" />
        </radialGradient>
        <radialGradient id="cavity-grad" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#1a1d1e" />
          <stop offset="70%" stopColor="#2c3033" />
          <stop offset="100%" stopColor="#111314" />
        </radialGradient>
        <radialGradient id="ball-grad" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor="#ede7d5" />
          <stop offset="75%" stopColor="#c5bea8" />
          <stop offset="100%" stopColor="#968f7a" />
        </radialGradient>
      </defs>

      {/* Base Bezel */}
      <circle cx="30" cy="30" r="22" fill="url(#bezel-grad)" stroke="#606669" strokeWidth="1.5" />
      <circle cx="30" cy="30" r="16" fill="url(#cavity-grad)" stroke="#111314" strokeWidth="1" />

      {/* Crescent / arc track underneath */}
      <path d="M 17 34 A 14 14 0 0 0 43 34" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" />

      {/* Stem & Round Head */}
      <g
        transform={isOff ? "translate(0, -6)" : "translate(0, 8)"}
        style={{
          transition: "transform 0.15s ease-out",
          filter: "drop-shadow(0px 2px 2px rgba(10, 10, 10, 0.8))",
        }}
      >
        {/* Metal stem */}
        <path d="M 28 32 L 28 26 L 32 26 L 32 32 Z" fill="#b0b5b8" stroke="#505558" strokeWidth="0.5" />
        {/* Round Head Ball */}
        <circle cx="30" cy="24" r="11" fill="url(#ball-grad)" stroke="#8c8573" strokeWidth="0.8" />
      </g>
    </svg>
  );
}

export function TemperatureGauge({ value = 24 }: { value?: number }) {
  const needleDeg = 220 + (Math.max(0, Math.min(100, value)) / 100) * 255;
  const numbers = [0, 20, 40, 60, 80, 100];
  const allTicks = Array.from({ length: 51 }, (_, i) => i * 2);

  return (
    <div style={{ position: "relative", width: "150px", height: "150px" }}>
      {/* 1. Static Dial Face */}
      <svg
        viewBox="0 0 200 200"
        style={{
          position: "absolute",
          inset: 0,
          width: "150px",
          height: "150px",
          overflow: "visible",
          pointerEvents: "none",
        }}
      >
        {/* Outer grey border / bezel */}
        <circle cx="100" cy="100" r="98" fill="#52585c" stroke="#25282a" strokeWidth="2.5" />
        <circle cx="100" cy="100" r="91" fill="#1b1d1e" stroke="#70767a" strokeWidth="2" />
        <circle cx="100" cy="100" r="86" fill="#08090a" />

        {/* Scale Ticks */}
        <g stroke="white" strokeLinecap="round">
          {allTicks.map((v) => {
            const isMajor = v % 10 === 0;
            const deg = 220 + (v / 100) * 255;
            const rad = ((deg - 90) * Math.PI) / 180;
            const innerR = isMajor ? 67 : 75;
            const outerR = 83;
            return (
              <line
                key={`t-${v}`}
                x1={100 + innerR * Math.cos(rad)}
                y1={100 + innerR * Math.sin(rad)}
                x2={100 + outerR * Math.cos(rad)}
                y2={100 + outerR * Math.sin(rad)}
                strokeWidth={isMajor ? 2.5 : 1.2}
              />
            );
          })}
        </g>

        {/* Numbers */}
        <g fill="white" fontSize="13" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
          {numbers.map((v) => {
            const deg = 220 + (v / 100) * 255;
            const rad = ((deg - 90) * Math.PI) / 180;
            const r = 53;
            const x = 100 + r * Math.cos(rad);
            const y = 100 + r * Math.sin(rad) + 4;
            return (
              <text key={`num-${v}`} x={x} y={y}>
                {v}
              </text>
            );
          })}
        </g>

        {/* Center Dial Labels */}
        <text x="100" y="68" fill="white" fontSize="13" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
          TEMP
        </text>
        <text x="100" y="134" fill="white" fontSize="13" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
          °C
        </text>
      </svg>

      {/* 2. Isolated Rotating Needle & Hub */}
      <svg
        viewBox="0 0 200 200"
        style={{
          position: "absolute",
          inset: 0,
          width: "150px",
          height: "150px",
          overflow: "visible",
          pointerEvents: "none",
        }}
      >
        {/* Needle (Acute sharp triangle) */}
        <g
          transform={`rotate(${needleDeg}, 100, 100)`}
          style={{
            transition: "transform 0.3s ease-out",
            willChange: "transform",
          }}
        >
          <polygon points="97,100 100,18 103,100 100,108" fill="white" />
        </g>

        {/* Central Hub Circle */}
        <circle cx="100" cy="100" r="20" fill="#121415" stroke="#70767a" strokeWidth="2.5" />
      </svg>
    </div>
  );
}

export function TemperatureSelector({
  angle = 0,
  onWheelDelta,
}: {
  angle?: number;
  onWheelDelta?: (deltaAngle: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !onWheelDelta) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Scroll up (deltaY < 0): rotate clockwise (+angle / Warmer)
      // Scroll down (deltaY > 0): rotate counter-clockwise (-angle / Cooler / OFF)
      const step = Math.sign(-e.deltaY) * Math.max(2, Math.min(8, Math.abs(e.deltaY) * 0.04));
      onWheelDelta(step);
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, [onWheelDelta]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "120px",
        height: "125px",
        margin: "0 auto",
        cursor: "ns-resize",
        userSelect: "none",
      }}
      title="Zone Temperature (Scroll wheel to adjust temperature)"
    >
      {/* 1. Static Dial Face (Labels AUTO, C, W, OFF, arcs, dots) */}
      <svg
        viewBox="0 0 120 125"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          overflow: "visible",
        }}
      >
        <g transform="translate(15, 12)">
          {/* AUTO label in the gap */}
          <text x="45" y="6" fill="white" fontSize="16" fontFamily="monospace" fontWeight="bold" textAnchor="middle">AUTO</text>
          
          {/* Left Arc: -115 to -32 degrees */}
          <path d="M 4.2 64 A 45 45 0 0 1 21 6.8" fill="none" stroke="white" strokeWidth="2.5" />
          
          {/* Right Arc: 32 to 115 degrees */}
          <path d="M 69 6.8 A 45 45 0 0 1 85.8 64" fill="none" stroke="white" strokeWidth="2.5" />
          
          {/* 4 Dots (inside the arc, radius 40 instead of 45) */}
          {[-90, -45, 45, 90].map((a, i) => {
            const rad = (a - 90) * Math.PI / 180;
            const r = 40;
            const x = 45 + r * Math.cos(rad);
            const y = 45 + r * Math.sin(rad);
            return <circle key={i} cx={x} cy={y} r="2" fill="white" />;
          })}

          {/* Labels C, W, OFF */}
          <text x="4" y="86" fill="white" fontSize="16" fontFamily="monospace" fontWeight="bold" textAnchor="middle">C</text>
          <text x="86" y="86" fill="white" fontSize="16" fontFamily="monospace" fontWeight="bold" textAnchor="middle">W</text>
          <text x="37" y="106" fill="white" fontSize="16" fontFamily="monospace" fontWeight="bold" textAnchor="middle">OFF</text>
        </g>
      </svg>

      {/* 2. Isolated Rotating Knob with hardware-accelerated CSS transform & shadow */}
      <div
        style={{
          position: "absolute",
          left: "15px",
          top: "12px",
          width: "90px",
          height: "90px",
          transform: `rotate(${angle}deg)`,
          transformOrigin: "45px 45px",
          transition: "transform 0.05s ease-out",
          willChange: "transform",
          filter: "drop-shadow(0px 2px 2px rgba(0, 0, 0, 0.6))",
          pointerEvents: "none",
        }}
      >
        <svg viewBox="0 0 90 90" style={{ width: "90px", height: "90px", overflow: "visible" }}>
          <g transform="translate(45, 45)">
            {/* Base disc */}
            <circle cx="0" cy="0" r="34" fill="#eff2f4" stroke="#4a4e50" strokeWidth="2.5" />
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
            <rect x="-2.5" y="-30" width="5" height="58" fill="#ffffff" stroke="#000000" strokeWidth="1.8" rx="0.5" />
          </g>
        </svg>
      </div>
    </div>
  );
}

const AIR_TEMP_POSITIONS = [
  { name: "CONT CAB", angle: -135 },
  { name: "SUPPLY DUCT FWD", angle: -90 },
  { name: "SUPPLY DUCT AFT", angle: -45 },
  { name: "PASS CAB FWD", angle: 0 },
  { name: "PASS CAB AFT", angle: 45 },
  { name: "PACK R", angle: 90 },
  { name: "PACK L", angle: 135 },
];

export function TemperaturePanel() {
  const [sourceIndex, setSourceIndex] = useState(3); // Default to PASS CAB FWD (0°)
  const [zoneAngles, setZoneAngles] = useState<[number, number, number]>([0, 0, 0]); // [CONT CAB, FWD CAB, AFT CAB]
  const [trimAir, setTrimAir] = useState<"ON" | "OFF">("ON");

  const handleSourceStep = (dir: number) => {
    setSourceIndex((prev) => Math.max(0, Math.min(AIR_TEMP_POSITIONS.length - 1, prev + dir)));
  };

  const handleZoneDelta = (index: number, delta: number) => {
    setZoneAngles((prev) => {
      const next = [...prev] as [number, number, number];
      next[index] = Math.max(-140, Math.min(120, next[index] + delta));
      return next;
    });
  };

  // Compute realistic gauge temperature based on selected source and zone angles
  let gaugeTemp = 24;
  switch (sourceIndex) {
    case 0: // CONT CAB
      gaugeTemp = zoneAngles[0] <= -130 ? 16 : 22 + (zoneAngles[0] / 120) * 6;
      break;
    case 1: // SUPPLY DUCT FWD
      gaugeTemp = zoneAngles[1] <= -130 ? 12 : 18 + (zoneAngles[1] / 120) * 14;
      break;
    case 2: // SUPPLY DUCT AFT
      gaugeTemp = zoneAngles[2] <= -130 ? 12 : 20 + (zoneAngles[2] / 120) * 14;
      break;
    case 3: // PASS CAB FWD
      gaugeTemp = zoneAngles[1] <= -130 ? 17 : 23 + (zoneAngles[1] / 120) * 5;
      break;
    case 4: // PASS CAB AFT
      gaugeTemp = zoneAngles[2] <= -130 ? 17 : 24 + (zoneAngles[2] / 120) * 5;
      break;
    case 5: // PACK R
      gaugeTemp = 12;
      break;
    case 6: // PACK L
      gaugeTemp = 10;
      break;
  }

  return (
    <section
      className="aircraft-panel temperature-panel"
      aria-label="Air temperature panel"
    >
      <div className="temp-gauge">
        <TemperatureGauge value={Math.round(gaugeTemp)} />
      </div>
      
      {/* Temp-source component overlay */}
      <div style={{ position: "absolute", left: "320px", top: "126px" }}>
        <TempSourceLabels />
        <div style={{ position: "absolute", left: "-45px", top: "-45px", width: "90px", height: "90px" }}>
          <PointerKnob
            angle={AIR_TEMP_POSITIONS[sourceIndex].angle}
            onWheelStep={handleSourceStep}
            onClick={() => handleSourceStep(1)}
          />
        </div>
      </div>
      <div
        className="trim-air"
        style={{
          position: "absolute",
          left: "175px",
          top: "195px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          fontFamily: "monospace",
          color: "white",
        }}
      >
        <span style={{ marginBottom: "6px", fontSize: "16px", fontWeight: "bold", whiteSpace: "nowrap" }}>
          TRIM AIR
        </span>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <TrimAirSwitch
            position={trimAir}
            onWheelStep={(dir) => setTrimAir(dir < 0 ? "OFF" : "ON")}
            onClick={() => setTrimAir((p) => (p === "ON" ? "OFF" : "ON"))}
            size={48}
          />
          {/* OFF and ON labels stacked on the right */}
          <div
            style={{
              position: "absolute",
              left: "56px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              fontSize: "15px",
              fontWeight: "bold",
              color: "white",
              cursor: "pointer",
            }}
            onClick={() => setTrimAir((p) => (p === "ON" ? "OFF" : "ON"))}
          >
            <span>OFF</span>
            <span>ON</span>
          </div>
        </div>
      </div>
      <div className="zone-controls" style={{ top: "290px" }}>
        {(["CONT CAB", "FWD CAB", "AFT CAB"] as const).map((label, index) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Placard>
              ZONE
              <br />
              TEMP
            </Placard>
            <b style={{ marginBottom: "-6px", marginTop: "2px", zIndex: 10 }}>{label}</b>
            <TemperatureSelector
              angle={zoneAngles[index]}
              onWheelDelta={(delta) => handleZoneDelta(index, delta)}
            />
          </div>
        ))}
      </div>
      <Screw className="s1" />
      <Screw className="s2" />
      <Screw className="s3" />
      <Screw className="s4" />
    </section>
  );
}
