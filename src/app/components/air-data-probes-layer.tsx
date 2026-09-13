"use client";

import React, { useState } from "react";
import {
  ProbeId,
  usePneumatic,
} from "../simulation/pneumatic/pneumatic-context";

interface ProbeDef {
  id: ProbeId;
  name: string;
  type: "pitot" | "tat" | "vane" | "elevPitot";
  x: number;
  y: number;
  side: "L" | "R";
  circuit: "A" | "B";
}

const AIR_DATA_PROBES: ProbeDef[] = [
  // --- Forward Fuselage: Left (Captain / System A) ---
  {
    id: "captPitot",
    name: "CAPT PITOT PROBE",
    type: "pitot",
    x: 372.2,
    y: 38.0,
    side: "L",
    circuit: "A",
  },
  {
    id: "tempProbe",
    name: "TAT PROBE (TOTAL AIR TEMP)",
    type: "tat",
    x: 368.5,
    y: 49.0,
    side: "L",
    circuit: "A",
  },
  {
    id: "lAlphaVane",
    name: "ALPHA VANE (LEFT AOA)",
    type: "vane",
    x: 363.8,
    y: 64.0,
    side: "L",
    circuit: "A",
  },

  // --- Forward Fuselage: Right (First Officer / System B) ---
  {
    id: "foPitot",
    name: "F/O PITOT PROBE",
    type: "pitot",
    x: 387.8,
    y: 38.0,
    side: "R",
    circuit: "B",
  },
  {
    id: "auxPitot",
    name: "AUXILIARY PITOT PROBE",
    type: "pitot",
    x: 391.5,
    y: 49.0,
    side: "R",
    circuit: "B",
  },
  {
    id: "rAlphaVane",
    name: "ALPHA VANE (RIGHT AOA)",
    type: "vane",
    x: 396.2,
    y: 64.0,
    side: "R",
    circuit: "B",
  },

  // --- Vertical Stabilizer: Elevator Pitot Probes ---
  {
    id: "lElevPitot",
    name: "L ELEVATOR PITOT PROBE",
    type: "elevPitot",
    x: 378.5,
    y: 495.0,
    side: "L",
    circuit: "A",
  },
  {
    id: "rElevPitot",
    name: "R ELEVATOR PITOT PROBE",
    type: "elevPitot",
    x: 381.5,
    y: 495.0,
    side: "R",
    circuit: "B",
  },
];

export function AirDataProbesLayer() {
  const { isProbeHeated, toggleProbeFailure } = usePneumatic();
  const [hoveredProbeId, setHoveredProbeId] = useState<ProbeId | null>(null);

  const handleProbeClick = (id: ProbeId, e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    toggleProbeFailure(id);
  };

  const hoveredProbe = AIR_DATA_PROBES.find((p) => p.id === hoveredProbeId);
  void hoveredProbe;

  return (
    <g
      id="air-data-probes-layer"
      data-interactive="true"
      aria-label="Sondas exteriores de datos de aire y calefacción de pitot"
      style={{ pointerEvents: "auto" }}
    >
      <defs>
        {/* Eliminate browser focus ring/bounding-box rectangle when probe is clicked/selected */}
        <style>{`
          #air-data-probes-layer g:focus,
          #air-data-probes-layer *:focus,
          #air-data-probes-layer g:focus-visible,
          #air-data-probes-layer *:focus-visible {
            outline: none !important;
            box-shadow: none !important;
          }
        `}</style>
        {/* Glow filter for unheated/fault probe indicator */}
        <filter id="probe-fault-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {AIR_DATA_PROBES.map((probe) => {
        const heated = isProbeHeated(probe.id);
        const isHovered = hoveredProbeId === probe.id;
        const isLeft = probe.side === "L";
        const sign = isLeft ? -1 : 1;

        // Visual coloring
        const strokeColor = heated
          ? isHovered
            ? "#e2e8f0"
            : "#94a3b8"
          : isHovered
            ? "#ff3b30"
            : "#ffaa00";
        const fillColor = heated
          ? isHovered
            ? "#1e293b"
            : "#0f172a"
          : isHovered
            ? "#7f1d1d"
            : "#451a03";

        return (
          <g
            key={probe.id}
            id={`probe-glyph-${probe.id}`}
            data-interactive="true"
            data-probe-id={probe.id}
            role="button"
            tabIndex={-1}
            aria-label={`${probe.name} (Sistema ${probe.circuit})`}
            className="cursor-pointer outline-none focus:outline-none focus:ring-0 select-none"
            style={{ pointerEvents: "all", outline: "none" }}
            onMouseEnter={() => setHoveredProbeId(probe.id)}
            onMouseLeave={() => setHoveredProbeId(null)}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={(e) => handleProbeClick(probe.id, e)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleProbeClick(probe.id, e);
              }
            }}
          >
            {/* Generous invisible circular hitbox for effortless clicking */}
            <circle
              cx={probe.x}
              cy={probe.y}
              r={4.5}
              fill="transparent"
              stroke="transparent"
              style={{ pointerEvents: "all", cursor: "pointer" }}
            />

            {/* Visual Glyphs according to probe type */}
            {probe.type === "pitot" && (
              <g filter={!heated ? "url(#probe-fault-glow)" : undefined}>
                {/* Base skin flange */}
                <ellipse
                  cx={probe.x}
                  cy={probe.y}
                  rx={0.6}
                  ry={1.0}
                  fill={strokeColor}
                  opacity={0.7}
                />
                {/* Pylon mast extending outward */}
                <line
                  x1={probe.x}
                  y1={probe.y}
                  x2={probe.x + sign * 1.5}
                  y2={probe.y - 0.2}
                  stroke={strokeColor}
                  strokeWidth={0.34}
                  strokeLinecap="round"
                />
                {/* Forward-facing pitot tube */}
                <line
                  x1={probe.x + sign * 1.5}
                  y1={probe.y + 0.4}
                  x2={probe.x + sign * 1.5}
                  y2={probe.y - 2.2}
                  stroke={strokeColor}
                  strokeWidth={0.42}
                  strokeLinecap="round"
                />
                {/* Pitot tip dynamic pressure aperture */}
                <circle
                  cx={probe.x + sign * 1.5}
                  cy={probe.y - 2.2}
                  r={0.16}
                  fill={heated ? "#0f172a" : "#ffaa00"}
                />
              </g>
            )}

            {probe.type === "tat" && (
              <g filter={!heated ? "url(#probe-fault-glow)" : undefined}>
                {/* Base mounting pad */}
                <ellipse
                  cx={probe.x}
                  cy={probe.y}
                  rx={0.6}
                  ry={0.9}
                  fill={strokeColor}
                  opacity={0.7}
                />
                {/* Aerodynamic strut */}
                <line
                  x1={probe.x}
                  y1={probe.y}
                  x2={probe.x + sign * 1.4}
                  y2={probe.y}
                  stroke={strokeColor}
                  strokeWidth={0.32}
                  strokeLinecap="round"
                />
                {/* Forward aspirator scoop barrel */}
                <rect
                  x={isLeft ? probe.x - 1.8 : probe.x + 0.9}
                  y={probe.y - 1.2}
                  width={0.9}
                  height={1.8}
                  rx={0.3}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={0.28}
                />
                {/* Throat inlet */}
                <circle
                  cx={probe.x + sign * 1.35}
                  cy={probe.y - 1.2}
                  r={0.14}
                  fill={heated ? "#0f172a" : "#ffaa00"}
                />
              </g>
            )}

            {probe.type === "vane" && (
              <g filter={!heated ? "url(#probe-fault-glow)" : undefined}>
                {/* Circular base bezel */}
                <circle
                  cx={probe.x}
                  cy={probe.y}
                  r={0.65}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={0.24}
                />
                {/* Trapezoidal aerodynamic AoA vane blade protruding outwards */}
                <polygon
                  points={`
                    ${probe.x},${probe.y - 0.7}
                    ${probe.x + sign * 1.9},${probe.y - 0.35}
                    ${probe.x + sign * 1.9},${probe.y + 0.35}
                    ${probe.x},${probe.y + 0.7}
                  `}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={0.24}
                  strokeLinejoin="round"
                />
                {/* Center pivot hub */}
                <circle
                  cx={probe.x}
                  cy={probe.y}
                  r={0.22}
                  fill={heated ? "#0f172a" : "#ffaa00"}
                />
              </g>
            )}

            {probe.type === "elevPitot" && (
              <g filter={!heated ? "url(#probe-fault-glow)" : undefined}>
                {/* Oval mounting base plate on vertical fin skin */}
                <ellipse
                  cx={probe.x}
                  cy={probe.y}
                  rx={0.5}
                  ry={0.9}
                  fill={strokeColor}
                  opacity={0.65}
                />
                {/* Curved elbow mast */}
                <path
                  d={`M ${probe.x} ${probe.y} Q ${probe.x + sign * 1.4} ${probe.y} ${probe.x + sign * 1.4} ${probe.y - 1.0} L ${probe.x + sign * 1.4} ${probe.y - 2.2}`}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={0.38}
                  strokeLinecap="round"
                />
                {/* Tip aperture */}
                <circle
                  cx={probe.x + sign * 1.4}
                  cy={probe.y - 2.2}
                  r={0.16}
                  fill={heated ? "#0f172a" : "#ffaa00"}
                />
              </g>
            )}
          </g>
        );
      })}

      {/* Interactive Tooltip on Hover */}
      {/*
      {hoveredProbe && (
        <g
          transform={`translate(${hoveredProbe.x} ${
            hoveredProbe.y > 400 ? hoveredProbe.y - 12 : hoveredProbe.y - 8
          })`}
          className="pointer-events-none transition-opacity duration-150"
        >
          {(() => {
            const isHeated = isProbeHeated(hoveredProbe.id);
            const statusText = isHeated
              ? "CALEFACCIÓN ACTIVA (OK)"
              : "¡FALLA / SIN CALOR! (Clic para simular falla)";
            const circuitText = `Sistema ${hoveredProbe.circuit}`;
            const headerText = `${hoveredProbe.name} (${circuitText})`;

            return (
              <g>
                <rect
                  x="-75"
                  y="-12"
                  width="150"
                  height="17"
                  rx="3"
                  fill="rgba(15, 20, 25, 0.96)"
                  stroke={isHeated ? "#38bdf8" : "#ffaa00"}
                  strokeWidth="0.8"
                  filter="drop-shadow(0 2px 5px rgba(0,0,0,0.7))"
                />
                <text
                  x="0"
                  y="-3"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontFamily="Arial, sans-serif"
                  fontSize="4.2"
                  fontWeight="bold"
                  letterSpacing="0.04em"
                >
                  {headerText}
                </text>
                <text
                  x="0"
                  y="2.8"
                  textAnchor="middle"
                  fill={isHeated ? "#38bdf8" : "#ffaa00"}
                  fontFamily="Arial, sans-serif"
                  fontSize="3.6"
                  fontWeight="bold"
                >
                  {statusText}
                </text>
              </g>
            );
          })()}
        </g>
      )}
      */}
    </g>
  );
}
