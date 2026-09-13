"use client";

import React, { useEffect, useRef } from "react";
import { useWiperState, WiperPosition } from "./aircraft-panels";

// Geometry constants for Boeing 737-800 forward windshields (in schematic space)
// Forward Windshield No. 1 Bounds:
// - L FWD: Midpoint of front arista at x = 374.5, y = 53.0. Front arista angle is exactly 152.2°.
// - R FWD: Midpoint of front arista at x = 385.5, y = 53.0. Front arista angle is exactly 27.8°.
// Centerline of fuselage is at X = 380.0
const PIVOT_L = { x: 374.5, y: 53.0 };
const PARK_ANGLE_L = 152.2; // Perfectly aligned with front window arista
const SWEEP_RANGE_L = -110.0; // Expanded sweep range (from 152.2° down to 42.2°)

const PIVOT_R = { x: 385.5, y: 53.0 };
const PARK_ANGLE_R = 27.8; // Perfectly aligned with front window arista
const SWEEP_RANGE_R = 110.0; // Expanded sweep range (from 27.8° up to 137.8°)

// Proportional sizing: fits cleanly inside windshield without protruding
const L_ARM = 2.1; // Primary wiper arm length
const MAX_BLADE_ARTICULATION = 32.0; // Relative articulation angle at peak sweep

// Timing constants per Boeing 737 FCOM
const PERIOD_LOW = 750; // ~160 strokes/min (~80 cycles/min) -> 750ms
const PERIOD_HIGH = 480; // ~250 strokes/min (~125 cycles/min) -> 480ms
const PERIOD_INT_SWEEP = 1200; // 1200ms active sweep
const PERIOD_INT_CYCLE = 6200; // 1200ms sweep + 5000ms delay at park

interface WiperStateSim {
  phase: number; // accumulated phase in radians
  progress: number; // 0 (parked) to 1 (inward end of stroke)
  isMoving: boolean;
}

export function WindshieldWipersLayer() {
  const [wiperPosL] = useWiperState("L");
  const [wiperPosR] = useWiperState("R");

  const armGroupRefL = useRef<SVGGElement>(null);
  const bladeGroupRefL = useRef<SVGGElement>(null);
  const arcRefL = useRef<SVGPathElement>(null);

  const armGroupRefR = useRef<SVGGElement>(null);
  const bladeGroupRefR = useRef<SVGGElement>(null);
  const arcRefR = useRef<SVGPathElement>(null);

  // Animation simulation state maintained across frames
  const simStateL = useRef<WiperStateSim>({
    phase: 0,
    progress: 0,
    isMoving: false,
  });
  const simStateR = useRef<WiperStateSim>({
    phase: 0,
    progress: 0,
    isMoving: false,
  });

  // Keep latest positions in ref for RAF loop
  const positionsRef = useRef<{ L: WiperPosition; R: WiperPosition }>({
    L: wiperPosL,
    R: wiperPosR,
  });

  useEffect(() => {
    positionsRef.current = { L: wiperPosL, R: wiperPosR };
  }, [wiperPosL, wiperPosR]);

  useEffect(() => {
    let animFrameId: number;
    let lastTimestamp = performance.now();

    const updateWiperSide = (
      state: WiperStateSim,
      pos: WiperPosition,
      dt: number,
      now: number,
    ): { progress: number; isMoving: boolean } => {
      if (pos === "PARK") {
        if (state.progress > 0.005) {
          // Complete remaining return stroke to park
          const cycleTime = 800; // smooth return
          const dPhase = (dt / cycleTime) * (2 * Math.PI);
          state.phase = (state.phase + dPhase) % (2 * Math.PI);
          // Standard sinusoidal motion
          state.progress = 0.5 - 0.5 * Math.cos(state.phase);

          // Once near park, snap to 0 and halt
          if (state.progress < 0.01 && state.phase > Math.PI) {
            state.progress = 0;
            state.phase = 0;
            state.isMoving = false;
          } else {
            state.isMoving = true;
          }
        } else {
          state.progress = 0;
          state.phase = 0;
          state.isMoving = false;
        }
      } else if (pos === "LOW") {
        const dPhase = (dt / PERIOD_LOW) * (2 * Math.PI);
        state.phase = (state.phase + dPhase) % (2 * Math.PI);
        state.progress = 0.5 - 0.5 * Math.cos(state.phase);
        state.isMoving = true;
      } else if (pos === "HIGH") {
        const dPhase = (dt / PERIOD_HIGH) * (2 * Math.PI);
        state.phase = (state.phase + dPhase) % (2 * Math.PI);
        state.progress = 0.5 - 0.5 * Math.cos(state.phase);
        state.isMoving = true;
      } else if (pos === "INT") {
        const cycleProgress = now % PERIOD_INT_CYCLE;
        if (cycleProgress < PERIOD_INT_SWEEP) {
          const intPhase =
            (cycleProgress / PERIOD_INT_SWEEP) * (2 * Math.PI);
          state.phase = intPhase;
          state.progress = 0.5 - 0.5 * Math.cos(intPhase);
          state.isMoving = true;
        } else {
          state.phase = 0;
          state.progress = 0;
          state.isMoving = false;
        }
      }

      return { progress: state.progress, isMoving: state.isMoving };
    };

    const frame = (now: number) => {
      const dt = Math.min(now - lastTimestamp, 100); // clamp delta
      lastTimestamp = now;

      const { L: posL, R: posR } = positionsRef.current;

      const resL = updateWiperSide(simStateL.current, posL, dt, now);
      const resR = updateWiperSide(simStateR.current, posR, dt, now);

      // --- Left Wiper (Captain) ---
      // At park (progress=0), arm is at 152.2° and relAngle is 0° (both arms in a straight line flush with window arista)
      const armAngleL = PARK_ANGLE_L + resL.progress * SWEEP_RANGE_L;
      const relAngleL = resL.progress * MAX_BLADE_ARTICULATION;

      if (armGroupRefL.current) {
        armGroupRefL.current.setAttribute(
          "transform",
          `translate(${PIVOT_L.x} ${PIVOT_L.y}) rotate(${armAngleL})`,
        );
      }
      if (bladeGroupRefL.current) {
        bladeGroupRefL.current.setAttribute(
          "transform",
          `translate(${L_ARM} 0) rotate(${relAngleL})`,
        );
      }
      if (arcRefL.current) {
        arcRefL.current.setAttribute(
          "opacity",
          resL.isMoving || resL.progress > 0 ? "0.85" : "0",
        );
      }

      // --- Right Wiper (First Officer) ---
      // At park (progress=0), arm is at 27.8° and relAngle is 0° (both arms in a straight line flush with window arista)
      const armAngleR = PARK_ANGLE_R + resR.progress * SWEEP_RANGE_R;
      const relAngleR = -resR.progress * MAX_BLADE_ARTICULATION;

      if (armGroupRefR.current) {
        armGroupRefR.current.setAttribute(
          "transform",
          `translate(${PIVOT_R.x} ${PIVOT_R.y}) rotate(${armAngleR})`,
        );
      }
      if (bladeGroupRefR.current) {
        bladeGroupRefR.current.setAttribute(
          "transform",
          `translate(${L_ARM} 0) rotate(${relAngleR})`,
        );
      }
      if (arcRefR.current) {
        arcRefR.current.setAttribute(
          "opacity",
          resR.isMoving || resR.progress > 0 ? "0.85" : "0",
        );
      }

      // Continue loop if any wiper is active or moving
      const needsLoop =
        posL !== "PARK" ||
        posR !== "PARK" ||
        resL.isMoving ||
        resR.isMoving;

      if (needsLoop) {
        animFrameId = requestAnimationFrame(frame);
      }
    };

    // Kick off animation loop if either wiper is active or not at park
    const shouldRun =
      wiperPosL !== "PARK" ||
      wiperPosR !== "PARK" ||
      simStateL.current.progress > 0 ||
      simStateR.current.progress > 0;

    if (shouldRun) {
      animFrameId = requestAnimationFrame(frame);
    } else {
      // Ensure visual position is parked with both arms perfectly colinear and aligned with the window arista
      if (armGroupRefL.current) {
        armGroupRefL.current.setAttribute(
          "transform",
          `translate(${PIVOT_L.x} ${PIVOT_L.y}) rotate(${PARK_ANGLE_L})`,
        );
      }
      if (bladeGroupRefL.current) {
        bladeGroupRefL.current.setAttribute(
          "transform",
          `translate(${L_ARM} 0) rotate(0)`,
        );
      }

      if (armGroupRefR.current) {
        armGroupRefR.current.setAttribute(
          "transform",
          `translate(${PIVOT_R.x} ${PIVOT_R.y}) rotate(${PARK_ANGLE_R})`,
        );
      }
      if (bladeGroupRefR.current) {
        bladeGroupRefR.current.setAttribute(
          "transform",
          `translate(${L_ARM} 0) rotate(0)`,
        );
      }

      if (arcRefL.current) arcRefL.current.setAttribute("opacity", "0");
      if (arcRefR.current) arcRefR.current.setAttribute("opacity", "0");
    }

    return () => {
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
      }
    };
  }, [wiperPosL, wiperPosR]);

  return (
    <g
      id="flight-deck-windshield-wipers"
      aria-label="Limpiaparabrisas de cabina con rango de giro ampliado"
      className="pointer-events-none select-none"
      style={{ pointerEvents: "none" }}
    >
      {/* 
        Capt. Swept Glass Arc Sheen
        Translucent sheen covering the expanded cleaned glass area of L FWD
      */}
      <path
        ref={arcRefL}
        d="M 370.5 55.2 L 378.8 51.0 L 378.2 54.5 L 375.0 57.2 L 371.0 57.5 Z"
        fill="rgba(56, 189, 248, 0.08)"
        stroke="rgba(186, 230, 253, 0.2)"
        strokeWidth="0.1"
        opacity="0"
        style={{
          transition: "opacity 0.25s ease-out",
          pointerEvents: "none",
        }}
      />

      {/* 
        F/O Swept Glass Arc Sheen
        Translucent sheen covering the expanded cleaned glass area of R FWD
      */}
      <path
        ref={arcRefR}
        d="M 389.5 55.2 L 381.2 51.0 L 381.8 54.5 L 385.0 57.2 L 389.0 57.5 Z"
        fill="rgba(56, 189, 248, 0.08)"
        stroke="rgba(186, 230, 253, 0.2)"
        strokeWidth="0.1"
        opacity="0"
        style={{
          transition: "opacity 0.25s ease-out",
          pointerEvents: "none",
        }}
      />

      {/* --- Captain Wiper (L FWD) - Centered at (374.5, 53.0) --- */}
      <g
        ref={armGroupRefL}
        transform={`translate(${PIVOT_L.x} ${PIVOT_L.y}) rotate(${PARK_ANGLE_L})`}
        style={{ pointerEvents: "none" }}
      >
        {/* Base Pivot Hub & Mounting Nut centered on front arista */}
        <circle
          cx="0"
          cy="0"
          r="0.4"
          fill="#1e293b"
          stroke="#64748b"
          strokeWidth="0.12"
        />
        <circle cx="0" cy="0" r="0.12" fill="#cbd5e1" />

        {/* Primary Main Wiper Arm (L_ARM = 2.1) */}
        <line
          x1="0.2"
          y1="0"
          x2={L_ARM}
          y2="0"
          stroke="#0f172a"
          strokeWidth="0.28"
          strokeLinecap="round"
        />
        <line
          x1="0.3"
          y1="0"
          x2={L_ARM - 0.15}
          y2="0"
          stroke="#334155"
          strokeWidth="0.1"
          strokeLinecap="round"
        />

        {/* Articulated Hinge Joint at Tip ("articulado en la punta") */}
        <circle
          cx={L_ARM}
          cy="0"
          r="0.22"
          fill="#1e293b"
          stroke="#94a3b8"
          strokeWidth="0.1"
        />
        <circle cx={L_ARM} cy="0" r="0.08" fill="#e2e8f0" />

        {/* Articulated Blade Arm Assembly - In PARK rotate(0) makes it 100% aligned with the main arm */}
        <g
          ref={bladeGroupRefL}
          transform={`translate(${L_ARM} 0) rotate(0)`}
          style={{ pointerEvents: "none" }}
        >
          {/* Central Rocker Carrier Bracket */}
          <line
            x1="-0.9"
            y1="0"
            x2="0.9"
            y2="0"
            stroke="#334155"
            strokeWidth="0.2"
            strokeLinecap="round"
          />

          {/* Arched Pressure Claws */}
          <line
            x1="-0.8"
            y1="0"
            x2="-0.8"
            y2="0.1"
            stroke="#475569"
            strokeWidth="0.12"
          />
          <line
            x1="0.8"
            y1="0"
            x2="0.8"
            y2="0.1"
            stroke="#475569"
            strokeWidth="0.12"
          />

          {/* Flexible Blade Backing Spine (span 3.8 units) */}
          <line
            x1="-1.8"
            y1="0.1"
            x2="2.0"
            y2="0.1"
            stroke="#1e293b"
            strokeWidth="0.2"
            strokeLinecap="round"
          />

          {/* Rubber Wiper Squeegee Blade */}
          <line
            x1="-1.8"
            y1="0.18"
            x2="2.0"
            y2="0.18"
            stroke="#020617"
            strokeWidth="0.32"
            strokeLinecap="round"
          />

          {/* Chrome Tip End Clips */}
          <circle cx="-1.8" cy="0.14" r="0.08" fill="#cbd5e1" />
          <circle cx="2.0" cy="0.14" r="0.08" fill="#cbd5e1" />
        </g>
      </g>

      {/* --- First Officer Wiper (R FWD) - Centered at (385.5, 53.0) --- */}
      <g
        ref={armGroupRefR}
        transform={`translate(${PIVOT_R.x} ${PIVOT_R.y}) rotate(${PARK_ANGLE_R})`}
        style={{ pointerEvents: "none" }}
      >
        {/* Base Pivot Hub & Mounting Nut centered on front arista */}
        <circle
          cx="0"
          cy="0"
          r="0.4"
          fill="#1e293b"
          stroke="#64748b"
          strokeWidth="0.12"
        />
        <circle cx="0" cy="0" r="0.12" fill="#cbd5e1" />

        {/* Primary Main Wiper Arm (L_ARM = 2.1) */}
        <line
          x1="0.2"
          y1="0"
          x2={L_ARM}
          y2="0"
          stroke="#0f172a"
          strokeWidth="0.28"
          strokeLinecap="round"
        />
        <line
          x1="0.3"
          y1="0"
          x2={L_ARM - 0.15}
          y2="0"
          stroke="#334155"
          strokeWidth="0.1"
          strokeLinecap="round"
        />

        {/* Articulated Hinge Joint at Tip ("articulado en la punta") */}
        <circle
          cx={L_ARM}
          cy="0"
          r="0.22"
          fill="#1e293b"
          stroke="#94a3b8"
          strokeWidth="0.1"
        />
        <circle cx={L_ARM} cy="0" r="0.08" fill="#e2e8f0" />

        {/* Articulated Blade Arm Assembly - In PARK rotate(0) makes it 100% aligned with the main arm */}
        <g
          ref={bladeGroupRefR}
          transform={`translate(${L_ARM} 0) rotate(0)`}
          style={{ pointerEvents: "none" }}
        >
          {/* Central Rocker Carrier Bracket */}
          <line
            x1="-0.9"
            y1="0"
            x2="0.9"
            y2="0"
            stroke="#334155"
            strokeWidth="0.2"
            strokeLinecap="round"
          />

          {/* Arched Pressure Claws */}
          <line
            x1="-0.8"
            y1="0"
            x2="-0.8"
            y2="0.1"
            stroke="#475569"
            strokeWidth="0.12"
          />
          <line
            x1="0.8"
            y1="0"
            x2="0.8"
            y2="0.1"
            stroke="#475569"
            strokeWidth="0.12"
          />

          {/* Flexible Blade Backing Spine (span 3.8 units) */}
          <line
            x1="-1.8"
            y1="0.1"
            x2="2.0"
            y2="0.1"
            stroke="#1e293b"
            strokeWidth="0.2"
            strokeLinecap="round"
          />

          {/* Rubber Wiper Squeegee Blade */}
          <line
            x1="-1.8"
            y1="0.18"
            x2="2.0"
            y2="0.18"
            stroke="#020617"
            strokeWidth="0.32"
            strokeLinecap="round"
          />

          {/* Chrome Tip End Clips */}
          <circle cx="-1.8" cy="0.14" r="0.08" fill="#cbd5e1" />
          <circle cx="2.0" cy="0.14" r="0.08" fill="#cbd5e1" />
        </g>
      </g>
    </g>
  );
}
