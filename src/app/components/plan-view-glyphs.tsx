"use client";

// Glyphs and helpers shared by the system layers of the plan view (fire
// protection, fuel), in the same visual language as the pneumatic network.

import type { ReactNode } from "react";
import { VALVE_SCALE } from "./pneumatic-network-layer";

export type P = [number, number];

// Alert colours shared with the overheat sensors and the network
export const AMBER = "#ffb300";
export const RED = "#ef4444";

export const CENTERLINE_X = 380;
export const mirrorX = (x: number) => 2 * CENTERLINE_X - x;
export const toPath = (points: P[], close = false) =>
  points.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ") + (close ? " Z" : "");

/** Props that make an SVG group a clickable control, like the overheat sensors. */
export function controlProps(label: string, onActivate: () => void) {
  const activate = (event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onActivate();
  };
  return {
    role: "button",
    tabIndex: 0,
    "aria-label": label,
    "data-interactive": "true",
    className: "group cursor-pointer focus:outline-none",
    onPointerDown: (event: React.PointerEvent) => event.stopPropagation(),
    onMouseDown: (event: React.MouseEvent) => event.stopPropagation(),
    onPointerUp: (event: React.PointerEvent) => event.stopPropagation(),
    onClick: activate,
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") activate(event);
    },
  } as const;
}

/** Network on/off valve symbol, closed with the bar across. */
export function ShutoffValve({
  x,
  y,
  angle = -90,
  open,
  title,
}: {
  x: number;
  y: number;
  angle?: number;
  open: boolean;
  title: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${VALVE_SCALE})`}>
      <title>{title}</title>
      <circle r="2.2" className="fill-sim-surface stroke-white" strokeWidth="0.55" />
      <line
        x1="-2.1"
        y1="0"
        x2="2.1"
        y2="0"
        className={open ? "stroke-white" : "stroke-zinc-400"}
        strokeWidth="0.85"
        strokeLinecap="round"
        style={{
          transform: open ? "rotate(0deg)" : "rotate(90deg)",
          transformOrigin: "0 0",
          transition: "transform 0.25s ease-in-out",
        }}
      />
      <circle r="0.5" className="fill-sim-surface stroke-white" strokeWidth="0.35" />
    </g>
  );
}

export function TinyLabel({
  x,
  y,
  anchor = "middle",
  children,
  className = "fill-zinc-400",
}: {
  x: number;
  y: number;
  anchor?: "start" | "middle" | "end";
  children: ReactNode;
  className?: string;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      dominantBaseline="middle"
      fontSize="1.05"
      className={`${className} pointer-events-none font-sim-sans tracking-wide`}
    >
      {children}
    </text>
  );
}

/** Status tag (generator trip, reverser disabled, APU auto shutdown). */
export function StatusTag({
  x,
  y,
  anchor,
  tone = "neutral",
  title,
  children,
}: {
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  tone?: "neutral" | "alert";
  title: string;
  children: string;
}) {
  const width = children.length * 0.78 + 1.2;
  const left = anchor === "start" ? x : anchor === "end" ? x - width : x - width / 2;
  return (
    <g>
      <title>{title}</title>
      <rect
        x={left}
        y={y - 0.85}
        width={width}
        height="1.7"
        rx="0.4"
        className="fill-sim-surface"
        stroke={tone === "alert" ? RED : "#a1a1aa"}
        strokeWidth="0.22"
      />
      <text
        x={left + width / 2}
        y={y + 0.05}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="1.05"
        fontWeight="bold"
        fill={tone === "alert" ? "#fca5a5" : "#e4e4e7"}
        className="font-sim-sans tracking-wide"
      >
        {children}
      </text>
    </g>
  );
}
