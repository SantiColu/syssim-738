"use client";

import { useState, useRef, useEffect } from "react";
import {
  Screw,
  Placard,
} from "./panel-parts";
import {
  PointerKnob,
} from "./knobs";
import { usePneumatic } from "../../simulation/pneumatic/pneumatic-context";

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
            transform: isOff
              ? "translate(25px, 17px)"
              : "translate(25px, 31px)",
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

export function TempSourceLabels() {
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
        {[-135, -45, 0, 45, 90, 135].map((a) => {
          const rad = ((a - 90) * Math.PI) / 180;
          return (
            <line
              key={`in-${a}`}
              x1={35 * Math.cos(rad)}
              y1={35 * Math.sin(rad)}
              x2={42 * Math.cos(rad)}
              y2={42 * Math.sin(rad)}
            />
          );
        })}

        {/* Outer radial lines beyond labels (r: 76 to 88) - excludes -90 (FWD) */}
        {[-135, -45, 0, 45, 90, 135].map((a) => {
          const rad = ((a - 90) * Math.PI) / 180;
          return (
            <line
              key={`out-${a}`}
              x1={76 * Math.cos(rad)}
              y1={76 * Math.sin(rad)}
              x2={88 * Math.cos(rad)}
              y2={88 * Math.sin(rad)}
            />
          );
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
      <g
        fill="white"
        fontSize="13"
        fontFamily="monospace"
        fontWeight="bold"
        textAnchor="middle"
      >
        {/* CONT CAB at -135° */}
        <text x="-44" y="38">
          CONT
        </text>
        <text x="-44" y="52">
          CAB
        </text>
        {/* AFT (SUPPLY DUCT) at -45° */}
        <text x="-41" y="-36">
          AFT
        </text>
        {/* FWD (PASS CAB) at 0° */}
        <text x="0" y="-53">
          FWD
        </text>
        {/* AFT (PASS CAB) at 45° */}
        <text x="41" y="-36">
          AFT
        </text>
        {/* R (PACK) at 90° */}
        <text x="58" y="4">
          R
        </text>
        {/* L (PACK) at 135° */}
        <text x="41" y="46">
          L
        </text>
      </g>

      {/* Vertical text: FWD (inside SUPPLY DUCT arc) */}
      <g
        fill="white"
        fontSize="14"
        fontFamily="monospace"
        fontWeight="bold"
        textAnchor="middle"
      >
        {["F", "W", "D"].map((char, i) => (
          <text key={`fwd-${i}`} x="-68" y={-14 + i * 15}>
            {char}
          </text>
        ))}
      </g>

      {/* Group text: SUPPLY DUCT */}
      <g
        fill="white"
        fontSize="14"
        fontFamily="monospace"
        fontWeight="bold"
        textAnchor="middle"
      >
        {["S", "U", "P", "P", "L", "Y"].map((char, i) => (
          <text key={`s-${i}`} x="-120" y={-50 + i * 16}>
            {char}
          </text>
        ))}
        {["D", "U", "C", "T"].map((char, i) => (
          <text key={`d-${i}`} x="-98" y={-34 + i * 16}>
            {char}
          </text>
        ))}
      </g>

      {/* Group text: PACK */}
      <g
        fill="white"
        fontSize="14"
        fontFamily="monospace"
        fontWeight="bold"
        textAnchor="middle"
      >
        {["P", "A", "C", "K"].map((char, i) => (
          <text key={`p-${i}`} x="105" y={10 + i * 16}>
            {char}
          </text>
        ))}
      </g>

      {/* Group texts: AIR TEMP and PASS CAB */}
      <text
        x="-15"
        y="-102"
        fill="white"
        fontSize="14"
        fontFamily="monospace"
        fontWeight="bold"
        textAnchor="middle"
      >
        AIR TEMP
      </text>
      <text
        x="64"
        y="-102"
        fill="white"
        fontSize="14"
        fontFamily="monospace"
        fontWeight="bold"
        textAnchor="middle"
      >
        PASS
      </text>
      <text
        x="64"
        y="-88"
        fill="white"
        fontSize="14"
        fontFamily="monospace"
        fontWeight="bold"
        textAnchor="middle"
      >
        CAB
      </text>
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
        <circle
          cx="100"
          cy="100"
          r="98"
          fill="#52585c"
          stroke="#25282a"
          strokeWidth="2.5"
        />
        <circle
          cx="100"
          cy="100"
          r="91"
          fill="#1b1d1e"
          stroke="#70767a"
          strokeWidth="2"
        />
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
        <g
          fill="white"
          fontSize="13"
          fontFamily="monospace"
          fontWeight="bold"
          textAnchor="middle"
        >
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
        <text
          x="100"
          y="68"
          fill="white"
          fontSize="13"
          fontFamily="monospace"
          fontWeight="bold"
          textAnchor="middle"
        >
          TEMP
        </text>
        <text
          x="100"
          y="134"
          fill="white"
          fontSize="13"
          fontFamily="monospace"
          fontWeight="bold"
          textAnchor="middle"
        >
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
        <circle
          cx="100"
          cy="100"
          r="20"
          fill="#121415"
          stroke="#70767a"
          strokeWidth="2.5"
        />
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
      const step =
        Math.sign(-e.deltaY) *
        Math.max(2, Math.min(8, Math.abs(e.deltaY) * 0.04));
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
          <text
            x="45"
            y="6"
            fill="white"
            fontSize="16"
            fontFamily="monospace"
            fontWeight="bold"
            textAnchor="middle"
          >
            AUTO
          </text>

          {/* Left Arc: -115 to -32 degrees */}
          <path
            d="M 4.2 64 A 45 45 0 0 1 21 6.8"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
          />

          {/* Right Arc: 32 to 115 degrees */}
          <path
            d="M 69 6.8 A 45 45 0 0 1 85.8 64"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
          />

          {/* 4 Dots (inside the arc, radius 40 instead of 45) */}
          {[-90, -45, 45, 90].map((a, i) => {
            const rad = ((a - 90) * Math.PI) / 180;
            const r = 40;
            const x = 45 + r * Math.cos(rad);
            const y = 45 + r * Math.sin(rad);
            return <circle key={i} cx={x} cy={y} r="2" fill="white" />;
          })}

          {/* Labels C, W, OFF */}
          <text
            x="4"
            y="86"
            fill="white"
            fontSize="16"
            fontFamily="monospace"
            fontWeight="bold"
            textAnchor="middle"
          >
            C
          </text>
          <text
            x="86"
            y="86"
            fill="white"
            fontSize="16"
            fontFamily="monospace"
            fontWeight="bold"
            textAnchor="middle"
          >
            W
          </text>
          <text
            x="37"
            y="106"
            fill="white"
            fontSize="16"
            fontFamily="monospace"
            fontWeight="bold"
            textAnchor="middle"
          >
            OFF
          </text>
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

export const AIR_TEMP_POSITIONS = [
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
  const [zoneAngles, setZoneAngles] = useState<[number, number, number]>([
    0, 0, 0,
  ]); // [CONT CAB, FWD CAB, AFT CAB]
  const { switches, setTrimAir } = usePneumatic();
  const trimAir = switches.trimAir ? "ON" : "OFF";

  const handleSourceStep = (dir: number) => {
    setSourceIndex((prev) =>
      Math.max(0, Math.min(AIR_TEMP_POSITIONS.length - 1, prev + dir)),
    );
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
        <div
          style={{
            position: "absolute",
            left: "-45px",
            top: "-45px",
            width: "90px",
            height: "90px",
          }}
        >
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
        <span
          style={{
            marginBottom: "6px",
            fontSize: "16px",
            fontWeight: "bold",
            whiteSpace: "nowrap",
          }}
        >
          TRIM AIR
        </span>
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
          }}
        >
          <TrimAirSwitch
            position={trimAir}
            onWheelStep={(dir) => setTrimAir(dir >= 0)}
            onClick={() => setTrimAir(!switches.trimAir)}
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
            onClick={() => setTrimAir(!switches.trimAir)}
          >
            <span>OFF</span>
            <span>ON</span>
          </div>
        </div>
      </div>
      <div className="zone-controls" style={{ top: "290px" }}>
        {(["CONT CAB", "FWD CAB", "AFT CAB"] as const).map((label, index) => (
          <div
            key={label}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Placard>
              ZONE
              <br />
              TEMP
            </Placard>
            <b style={{ marginBottom: "-6px", marginTop: "2px", zIndex: 10 }}>
              {label}
            </b>
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
