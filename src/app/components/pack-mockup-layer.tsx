"use client";

// TEMPORARY visual mockup of the air conditioning packs (3-wheel ACM) drawn
// over the plan view, in the same visual language as PneumaticNetworkLayer.
// Layout follows the 737 AIR-COND / PNEUMATIC reference schematic: both heat
// exchangers sit inside the ram air inlet, the ACM shaft runs fore-aft.
// No simulation logic: colours use illustrative station temperatures.

import { type ReactNode, useId, useSyncExternalStore } from "react";
import { PNEUMATIC_NODE } from "../simulation/pneumatic/main-network";
import { usePneumatic } from "../simulation/pneumatic/pneumatic-context";
import { recircFansRunning } from "../simulation/ecs/recirc-fans";
import { useOutflowValve } from "../simulation/ecs/outflow-valve-store";
import { useRamDoor } from "../simulation/ecs/ram-door-store";
import { PACK_TRIP_SENSORS, PACK_TRIP_STAGES, type PackTripStage } from "../simulation/ecs/pack-trip";
import type { TrimZone } from "../simulation/pneumatic/runtime-state";
import { getTemperatureColor } from "../simulation/pneumatic/types";
import { AC_DIST_BAY_Y, AFT_PRESSURE_BULKHEAD_Y, AFT_CARGO_Y } from "./lower-lobe-layer";
import { VALVE_SCALE } from "./pneumatic-network-layer";
import { ProbeGlyph } from "./overheat-sensors-layer";

// Mockup-only ground conditioned air connection, shared by the pack layer
// and the distribution ducts it feeds.
let groundCartConnected = false;
const groundCartListeners = new Set<() => void>();
const subscribeGroundCart = (listener: () => void) => {
  groundCartListeners.add(listener);
  return () => groundCartListeners.delete(listener);
};
export function useGroundCart() {
  const connected = useSyncExternalStore(
    subscribeGroundCart,
    () => groundCartConnected,
    () => false,
  );
  const toggle = () => {
    groundCartConnected = !groundCartConnected;
    groundCartListeners.forEach((listener) => listener());
  };
  return [connected, toggle] as const;
}

// Mockup-only flight deck outlets the crew opens and closes by hand. Closing
// one only stops the air leaving it: the ducts feeding it stay as they are.
const FD_OUTLET_KINDS = ["ceiling", "gasper", "defog", "foot"] as const;
type FdOutletKind = (typeof FD_OUTLET_KINDS)[number];
type FdOutlet = `${FdOutletKind}${"L" | "R"}`;
const fdOutletStore = Object.fromEntries(
  FD_OUTLET_KINDS.flatMap((kind) => [`${kind}L`, `${kind}R`]).map((outlet) => [outlet, true]),
) as Record<FdOutlet, boolean>;
const fdOutletListeners = new Set<() => void>();
const subscribeFdOutlets = (listener: () => void) => {
  fdOutletListeners.add(listener);
  return () => fdOutletListeners.delete(listener);
};
function useFdOutlet(outlet: FdOutlet) {
  const open = useSyncExternalStore(
    subscribeFdOutlets,
    () => fdOutletStore[outlet],
    () => true,
  );
  const toggle = () => {
    fdOutletStore[outlet] = !fdOutletStore[outlet];
    fdOutletListeners.forEach((listener) => listener());
  };
  return [open, toggle] as const;
}

type P = [number, number];

// Illustrative temperatures along the cycle (°C)
const T = {
  bleed: 160,
  hx1Out: 95,
  compOut: 170,
  hx2Out: 40,
  // High pressure water extraction loop: reheater hot pass → condenser hot
  // pass → water extractors → reheater cold pass → turbine
  reheaterHotOut: 30,
  condenserHotOut: 14,
  turbineIn: 26,
  // Turbine exhaust before it cools the condenser (kept above 0, which the
  // colour scale shows as no air)
  turbineExhaust: 1,
  // Pack discharge, after the condenser cold pass and the TCV bypass
  packOut: 5,
  ram: 15,
  // Ram air leaving the heat exchangers, warmed by the bleed air it cooled
  ramExhaust: 90,
  mix: 12,
  groundCart: 8,
  cabin: 24,
};

// Fore-aft shift of the pack set (packs and mix manifold) so the ram exhaust
// sits just forward of the main gear wheels. The layout constants below keep
// the original positions; the pack valves in the network moved by the same
// amount. The ram inlets stay at the wing root and reach the HX by a duct.
const PACKS_OFFSET_Y = 30;

// Right pack layout (network coordinates before PACKS_OFFSET_Y); the left pack
// mirrors it.
const HX_X = 401.8;
const HX2_Y = 219.5;
const HX1_Y = 224.5;
// Each HX symbol is a 7.6 x 5.2 rect turned 90° and scaled (along, across)
const HX_SCALE = { along: 0.66, across: 0.75 };
const HX_HALF = { across: 2.6 * HX_SCALE.across, along: 3.8 * HX_SCALE.along };
// Ram plenum walls exactly on the outline of the HX stack, so they overlap
const PLENUM_TOP = HX2_Y - HX_HALF.along;
const PLENUM_BOTTOM = HX1_Y + HX_HALF.along;
const PLENUM_X = { inboard: HX_X - HX_HALF.across, outboard: HX_X + HX_HALF.across };
// Where ducts start inside the HX symbols, so they leave through its inboard face
const HX_PORT_X = HX_X - 1.5;
const SHAFT_X = 394;
// ACM aft (Turbine – Compressor – Fan), so the high pressure water extraction
// loop fits forward of the turbine on the shaft axis.
const TURBINE_Y = 217.6;
// Compressor just aft of the HX ports it joins: HX1 outlet below, HX2 inlet above
const COMPRESSOR_Y = 222.6;
const FAN_Y = 229.4;
const TCV_LANE_X = SHAFT_X - 5.2;
const TCV_Y = 222.5;
// Standby pack temperature control valve (FCOM 2.31 pack schematic): in
// parallel with the TCV, on a loop just inboard of its lane.
const STBY_TCV = { laneX: TCV_LANE_X - 3.5, topY: 219, bottomY: 229, valveY: 226.3 };
const STBY_TCV_LOOP: P[] = [
  [TCV_LANE_X, STBY_TCV.topY],
  [STBY_TCV.laneX, STBY_TCV.topY],
  [STBY_TCV.laneX, STBY_TCV.bottomY],
  [TCV_LANE_X, STBY_TCV.bottomY],
];
// High pressure water extraction loop (737NG pack schematic). The condenser
// sits on the turbine axis, between two water extractors; the reheater
// outboard of it, above the HX plenum.
const CONDENSER = { x: SHAFT_X, y: 208.7, w: 3.6, h: 3.6 };
const WATER_EXTRACTOR = { w: 3.6, h: 1.5, topY: CONDENSER.y - 3.55, bottomY: CONDENSER.y + 3.55 };
// The reheater spans both water extractors, so each one drains straight
// across into its condenser-side face.
const REHEATER = { x: 398.4, y: CONDENSER.y, w: 3.2, h: 9.2 };
const REHEATER_EDGE = {
  top: REHEATER.y - REHEATER.h / 2,
  bottom: REHEATER.y + REHEATER.h / 2,
  inboard: REHEATER.x - REHEATER.w / 2,
};
const CONDENSER_EDGE = { inboard: CONDENSER.x - CONDENSER.w / 2, outboard: CONDENSER.x + CONDENSER.w / 2 };
// Condenser hot outlet lane, inboard, feeding both water extractors
const WE_FEED_X = 390.9;
// Reheater aft face: HX2 outlet in (leaving the HX2 through its inboard face)
// and, beside it on the condenser side, the turbine supply out, which drops
// into the side of the turbine.
const REHEATER_HOT_IN_X = REHEATER.x + 0.6;
const REHEATER_TURBINE_OUT_X = REHEATER.x - 1;
const TURBINE_INLET_Y = TURBINE_Y - 1.3;
// Pack overheat sensors, one per stage of the cooling cycle, each sticking out
// of its duct (`angle` 0 = outboard): compressor → HX2 (forward, under the
// turbine supply), the turbine supply (inboard, over the turbine), and the
// pack discharge between the TCV bypass tee and the pack check valve.
const PACK_TRIP_SENSOR_AT: Record<PackTripStage, { x: number; y: number; angle: number }> = {
  compressorDischarge: { x: 397.2, y: HX2_Y + 1.2, angle: -90 },
  turbineInlet: { x: REHEATER_TURBINE_OUT_X, y: 214.5, angle: 180 },
  packDischarge: { x: SHAFT_X, y: 200.5, angle: 0 },
};
// Airplane centerline (the fuselage walls are at x = 355 and 405); the left
// pack and everything mirrored is drawn about it.
const CENTERLINE_X = 380;
const MIRROR_TRANSFORM = `translate(${2 * CENTERLINE_X} 0) scale(-1 1)`;
const MIX: P = [CENTERLINE_X, 185.3];

// Pack supply lane, up from the pack valve (rPackValve in the network, before
// PACKS_OFFSET_Y); outboard of the ACM so the ram exhaust drops straight aft.
const SUPPLY_X = 398;
const PACK_VALVE_Y = 241;
// Ram air exhaust louvers beside the pack valve, centered on it, between the
// trim air tap ahead and the crossfeed behind
const RAM_EXHAUST = { y: PACK_VALVE_Y, length: 4.2 };

// Pack supply → HX1, hot TCV bypass to the turbine outlet, turbine → mix manifold
const BLEED_IN: P[] = [[SUPPLY_X, PACK_VALVE_Y], [SUPPLY_X, HX1_Y + 1.2], [HX_PORT_X, HX1_Y + 1.2]];
const TCV_TEE_Y = 234.3;
// The TCV bypass joins the pack discharge forward of the condenser
const TCV_JOIN_Y = 202.9;
const TCV_BYPASS: P[] = [[SUPPLY_X, TCV_TEE_Y], [TCV_LANE_X, TCV_TEE_Y], [TCV_LANE_X, TCV_JOIN_Y], [SHAFT_X, TCV_JOIN_Y]];
// Trim air supply: tapped off each pack supply downstream of the pack valve,
// through a check valve, joining the other side on the airplane centerline.
const TRIM_TAP_Y = 236.5;
const TRIM_CHECK_X = 385.5;
const TRIM_TAP: P[] = [[SUPPLY_X, TRIM_TAP_Y], [MIX[0], TRIM_TAP_Y]];
const MIX_R = 3.0;
// Point on the mix manifold edge (just inside it) at `deg`, counterclockwise
// from outboard right; ducts end there so the manifold covers their tips.
function onMix([cx, cy]: P, deg: number): P {
  const rad = (deg * Math.PI) / 180;
  const r = MIX_R - 0.4;
  return [cx + r * Math.cos(rad), cy - r * Math.sin(rad)];
}
/** Point at height `y` on the ray from the mix manifold centre at `deg`. */
function mixRayAtY([cx, cy]: P, deg: number, y: number): P {
  const rad = (deg * Math.PI) / 180;
  return [cx + ((cy - y) * Math.cos(rad)) / Math.sin(rad), y];
}
// Pack inlets (aft) and aft riser outlets (forward) meet the manifold on a
// narrow X, this many degrees from the horizontal; the sides stay free.
const MIX_X_DEG = 68;
// Pack outlet: aft of the manifold, then into it on the X diagonal. Its tee
// (and the flight deck trim join just forward of it) stays aft of the pack
// bay line, leaving room on the run up from the condenser for the pack
// discharge sensor and the pack check valve.
const TURBINE_OUT_Y = 194.6;
const PACK_CHECK_Y = 197.5;
// Split at the corner, where the left side tees off the flight deck supply:
// with the left pack off, mix manifold air still reaches the flight deck
// through the downstream part.
const TURBINE_OUT_UPSTREAM: P[] = [
  [SHAFT_X, TCV_JOIN_Y],
  [SHAFT_X, TURBINE_OUT_Y],
];
const TURBINE_OUT_DOWNSTREAM: P[] = [
  [SHAFT_X, TURBINE_OUT_Y],
  mixRayAtY(MIX, -MIX_X_DEG, TURBINE_OUT_Y),
  onMix(MIX, -MIX_X_DEG),
];

/** Duct drawn like the network links: dark casing + coloured core. */
function Duct({
  points,
  temp,
  inactive = false,
  part = "both",
  dashed = false,
}: {
  points: P[];
  temp: number;
  inactive?: boolean;
  /** Tees draw every casing first, then every core, so no casing cuts a core. */
  part?: "both" | "casing" | "core";
  /** Ceiling-level duct: dashed core, drawn under the floor ducts it crosses. */
  dashed?: boolean;
}) {
  const d = points.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
  return (
    <g className="fill-none [stroke-linecap:round] [stroke-linejoin:round]">
      {part !== "core" && <path className="stroke-sim-bg" d={d} strokeWidth="2.25" />}
      {part !== "casing" && (
        <path
          d={d}
          className={inactive ? "stroke-sim-line-inactive" : undefined}
          stroke={inactive ? undefined : getTemperatureColor(temp)}
          strokeWidth="0.85"
          strokeDasharray={dashed ? "1.4 1" : undefined}
        />
      )}
    </g>
  );
}

/** Junction dot, like the network junction nodes. */
function Junction({ x, y, temp, inactive }: { x: number; y: number; temp: number; inactive: boolean }) {
  return (
    <circle
      cx={x}
      cy={y}
      r="0.9"
      className={inactive ? "fill-sim-line-inactive" : undefined}
      fill={inactive ? undefined : getTemperatureColor(temp)}
    />
  );
}

/** Same drawing as the network precooler symbol, scaled down. */
function HeatExchanger({ x, y, title }: { x: number; y: number; title: string }) {
  // Rotated 90° and sized so two ducts fit side by side on its inboard face.
  return (
    <g transform={`translate(${x} ${y}) rotate(90) scale(${HX_SCALE.along} ${HX_SCALE.across})`}>
      <title>{title}</title>
      <rect
        x="-3.8"
        y="-2.6"
        width="7.6"
        height="5.2"
        rx="0.5"
        className="fill-sim-surface stroke-white"
        strokeWidth="0.55"
      />
      <g className="stroke-zinc-300" opacity={0.85} strokeWidth="0.32" strokeLinecap="round">
        <line x1="-3.4" y1="-1.3" x2="-2.1" y2="-2.4" />
        <line x1="-3.4" y1="0.5" x2="0.0" y2="-2.4" />
        <line x1="-3.4" y1="2.3" x2="2.1" y2="-2.4" />
        <line x1="-1.3" y1="2.4" x2="3.4" y2="-1.5" />
        <line x1="0.8" y1="2.4" x2="3.4" y2="0.3" />
        <line x1="2.9" y1="2.4" x2="3.4" y2="2.0" />
        <line x1="-3.4" y1="1.3" x2="-2.1" y2="2.4" />
        <line x1="-3.4" y1="-0.5" x2="0.0" y2="2.4" />
        <line x1="-3.4" y1="-2.3" x2="2.1" y2="2.4" />
        <line x1="-1.3" y1="-2.4" x2="3.4" y2="1.5" />
        <line x1="0.8" y1="-2.4" x2="3.4" y2="-0.3" />
        <line x1="2.9" y1="-2.4" x2="3.4" y2="-2.0" />
      </g>
      <circle cx="-3.1" cy="-1.9" r="0.25" className="fill-white" />
      <circle cx="3.1" cy="-1.9" r="0.25" className="fill-white" />
      <circle cx="-3.1" cy="1.9" r="0.25" className="fill-white" />
      <circle cx="3.1" cy="1.9" r="0.25" className="fill-white" />
    </g>
  );
}

/**
 * Compressor / turbine wheel on the fore-aft shaft, styled like the starter
 * turbine: dark body, white outline, coloured inner contour when flowing.
 */
function Wheel({
  y,
  wideAt,
  temp,
  inactive,
  title,
}: {
  y: number;
  wideAt: "top" | "bottom";
  temp: number;
  /** No flow: the coloured inner contour is not drawn. */
  inactive: boolean;
  title: string;
}) {
  const s = wideAt === "top" ? -1 : 1;
  const outer = `M -2.4 ${2 * s} L 2.4 ${2 * s} L 1 ${-2 * s} L -1 ${-2 * s} Z`;
  const inner = `M -1.85 ${1.6 * s} L 1.85 ${1.6 * s} L 0.7 ${-1.6 * s} L -0.7 ${-1.6 * s} Z`;
  return (
    <g transform={`translate(${SHAFT_X} ${y})`}>
      <title>{title}</title>
      <path d={outer} className="fill-sim-surface stroke-white" strokeWidth="0.45" strokeLinejoin="round" />
      {!inactive && <path d={inner} fill="none" stroke={getTemperatureColor(temp)} strokeWidth="0.32" />}
      {[-1.2, 0, 1.2].map((bx) => (
        <line
          key={bx}
          x1={bx * 0.6}
          y1={-1.3}
          x2={bx}
          y2={1.3}
          className="stroke-zinc-300"
          strokeWidth="0.25"
          strokeLinecap="round"
        />
      ))}
    </g>
  );
}

function Fan({
  x,
  y,
  title = "Fan de la ACM (aspira ram air a través de los HX)",
}: {
  x: number;
  y: number;
  title?: string;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <title>{title}</title>
      <circle r="1.8" className="fill-sim-surface stroke-white" strokeWidth="0.55" />
      {[0, 60, 120].map((angle) => (
        <line
          key={angle}
          x1="-1.4"
          y1="0"
          x2="1.4"
          y2="0"
          className="stroke-zinc-300"
          strokeWidth="0.32"
          strokeLinecap="round"
          transform={`rotate(${angle})`}
        />
      ))}
      <circle r="0.45" className="fill-sim-surface stroke-white" strokeWidth="0.32" />
    </g>
  );
}

/**
 * Compact air-to-air heat exchanger of the water extraction loop (condenser,
 * reheater): hatched core like the HX symbol, `w` across and `h` along.
 */
function LoopHeatExchanger({ x, y, w, h, title }: { x: number; y: number; w: number; h: number; title: string }) {
  const clipId = `loop-hx-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const hatch: [number, number, number, number][] = [];
  for (let c = -h; c < w + h; c += 1.2) {
    hatch.push([c, 0, c + h, h], [c, 0, c - h, h]);
  }
  return (
    <g transform={`translate(${x - w / 2} ${y - h / 2})`}>
      <title>{title}</title>
      <clipPath id={clipId}>
        <rect width={w} height={h} rx="0.4" />
      </clipPath>
      <rect width={w} height={h} rx="0.4" className="fill-sim-surface" />
      <g clipPath={`url(#${clipId})`} className="stroke-zinc-300" opacity={0.85} strokeWidth="0.22" strokeLinecap="round">
        {hatch.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
        ))}
      </g>
      <rect width={w} height={h} rx="0.4" className="fill-none stroke-white" strokeWidth="0.45" />
    </g>
  );
}

/** Water extractor on the condenser hot outlet, flat across the turbine axis. */
function WaterExtractor({ y, inactive, title }: { y: number; inactive: boolean; title: string }) {
  const { w, h } = WATER_EXTRACTOR;
  return (
    <g transform={`translate(${SHAFT_X} ${y})`}>
      <title>{title}</title>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} className="fill-sim-surface stroke-white" strokeWidth="0.45" />
      {!inactive && (
        <rect
          x={-w / 2 + 0.45}
          y={-h / 2 + 0.4}
          width={w - 0.9}
          height={h - 0.8}
          rx={(h - 0.8) / 2}
          fill="none"
          stroke={getTemperatureColor(T.condenserHotOut)}
          strokeWidth="0.28"
        />
      )}
    </g>
  );
}

/** Network modulating-valve symbol. `angle` 0 = horizontal duct. */
function ModulatingValve({
  x,
  y,
  angle = 0,
  open = true,
  onToggle,
  title,
}: {
  x: number;
  y: number;
  angle?: number;
  open?: boolean;
  /** Makes the valve clickable, like the network's manual valves. */
  onToggle?: () => void;
  title: string;
}) {
  const interactive = Boolean(onToggle);
  return (
    <g
      transform={`translate(${x} ${y}) rotate(${angle}) scale(${VALVE_SCALE})`}
      className={interactive ? "group cursor-pointer select-none focus:outline-none" : undefined}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={interactive ? open : undefined}
      aria-label={interactive ? `${title}: ${open ? "abierta" : "cerrada"}. Clic para alternar.` : undefined}
      onPointerDown={interactive ? (e) => e.stopPropagation() : undefined}
      onClick={
        interactive
          ? (e) => {
              e.stopPropagation();
              onToggle?.();
            }
          : undefined
      }
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onToggle?.();
              }
            }
          : undefined
      }
    >
      <title>
        {interactive ? `${title} · ${open ? "ABIERTA" : "CERRADA"} (clic para ${open ? "cerrar" : "abrir"})` : title}
      </title>
      {interactive && (
        <>
          <circle
            r="3.8"
            fill="none"
            stroke="#ffffff"
            strokeWidth="0.4"
            strokeDasharray="1 0.8"
            className="opacity-0 transition-opacity duration-150 group-hover:opacity-85"
          />
          <circle r="5.5" fill="transparent" />
        </>
      )}
      <path d="M -2.4 -0.7 A 2.5 2.5 0 0 1 2.4 -0.7 Z" className="fill-sim-surface stroke-white" strokeWidth="0.55" />
      <path d="M -2.4 0.7 A 2.5 2.5 0 0 0 2.4 0.7 Z" className="fill-sim-surface stroke-white" strokeWidth="0.55" />
      {/* Butterfly vane, as in the network: white and angled when open, gray across the duct when closed */}
      <line
        x1="-2.1"
        y1="0"
        x2="2.1"
        y2="0"
        className={open ? "stroke-white" : "stroke-zinc-400"}
        strokeWidth="0.85"
        strokeLinecap="round"
        style={{
          transform: open ? "rotate(35deg)" : "rotate(90deg)",
          transformOrigin: "0 0",
          transition: "transform 0.25s ease-in-out",
        }}
      />
      <circle r="0.5" className="fill-sim-surface stroke-white" strokeWidth="0.4" />
    </g>
  );
}

// Ram air inlet at the wing root (absolute coordinates: the inlets are not
// shifted with the packs): a narrow nose just aft of the AC distribution
// bay's aft line, each side one smooth curve (concave forward, convex aft) out to the
// width of the HX stack, closed by straight edges at the nose, the
// inflection and aft, with the deflector plate inside. A plain ram air duct
// runs from the aft edge to the HX plenum.
const RAM_INLET = {
  // Just aft of the bay line: half its stroke (0.175) + half the inlet's (0.275)
  noseY: AC_DIST_BAY_Y.aft + 0.45,
  aftY: 229.9,
  noseHalfWidth: 0.65,
  inboardX: PLENUM_X.inboard,
  outboardX: PLENUM_X.outboard,
};
// Deflector plate: forward when the door is closed, aft when open. Its half
// width fits the inlet at the closed position; open, it stretches to fit.
const RAM_PLATE = { closedY: 226.8, openY: 228.5, halfWidth: 1.4, openStretch: 1.25 };

/**
 * Ram air plenum around both heat exchangers, fed by a plain duct from the
 * inlet housing at the wing root. Drawn in pack coordinates, so the inlet sits
 * PACKS_OFFSET_Y forward of its absolute position.
 */
function RamPlenum({ ramOff }: { ramOff: boolean }) {
  const inletAftY = RAM_INLET.aftY - PACKS_OFFSET_Y;
  return (
    <g>
      <title>Ram air duct y plenum con HX secundario y primario</title>
      <Duct points={[[HX_X, inletAftY], [HX_X, PLENUM_TOP]]} temp={T.ram} inactive={ramOff} />
      <rect
        x={PLENUM_X.inboard}
        y={PLENUM_TOP}
        width={PLENUM_X.outboard - PLENUM_X.inboard}
        height={PLENUM_BOTTOM - PLENUM_TOP}
        className="fill-sim-surface stroke-white"
        strokeWidth="0.55"
      />
    </g>
  );
}

/** Network check valve symbol; the arrow points downstream at `angle` 0. */
function CheckValve({ x, y, angle = 0, title }: { x: number; y: number; angle?: number; title: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${VALVE_SCALE})`}>
      <title>{title}</title>
      <rect x="-2.8" y="-1.9" width="5.6" height="3.8" rx="0.5" className="fill-sim-surface stroke-white" strokeWidth="0.55" />
      <rect x="-2.0" y="-0.6" width="2.0" height="1.2" className="fill-zinc-200" />
      <polygon points="0,-1.4 2.0,0 0,1.4" className="fill-zinc-200" />
    </g>
  );
}

/**
 * Pack overheat sensor: the same probe as the network's sensors, sticking out
 * of its duct at `angle` (0 = outboard). Click toggles an overheat, which
 * trips the pack off.
 */
function PackTripSensor({ side, stage }: { side: "L" | "R"; stage: PackTripStage }) {
  const { packTripSensors, togglePackTripSensor } = usePneumatic();
  const sensor = PACK_TRIP_SENSORS.find((s) => s.side === side && s.stage === stage)!;
  const { x, y, angle } = PACK_TRIP_SENSOR_AT[stage];
  const tripped = Boolean(packTripSensors[sensor.id]);
  const toggle = (event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
    togglePackTripSensor(sensor.id);
  };

  return (
    <g
      transform={`translate(${x} ${y}) rotate(${angle - 90})`}
      role="button"
      tabIndex={0}
      aria-pressed={tripped}
      aria-label={`Sensor de sobretemperatura del pack ${side}: ${sensor.name}. ${tripped ? "Sobretemperatura activa" : "Normal"}`}
      data-interactive="true"
      className="group cursor-pointer focus:outline-none"
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onClick={toggle}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") toggle(event);
      }}
    >
      <title>
        {`Sensor de sobretemperatura · pack ${side} · ${sensor.name}
Luz de cabina asociada: PACK (${side === "L" ? "IZQUIERDA" : "DERECHA"})
Estado: ${tripped ? "SOBRETEMPERATURA · pack valve cerrada" : "NORMAL"}
(Clic para ${tripped ? "enfriar; la luz se apaga con TRIP RESET" : "simular una sobretemperatura y disparar el pack"})`}
      </title>
      <rect x="-1.6" y="-0.3" width="3.2" height="3.4" fill="transparent" />
      <ProbeGlyph isTripped={tripped} />
    </g>
  );
}

/** Recirculation HEPA filter, pleated, in line on a horizontal duct (narrow along it). */
function HepaFilter({ x, y, title }: { x: number; y: number; title: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <title>{title}</title>
      <rect x="-0.75" y="-1.6" width="1.5" height="3.2" rx="0.25" className="fill-sim-surface stroke-white" strokeWidth="0.4" />
      <path
        d="M -0.3 -1.2 L 0.3 -0.6 L -0.3 0 L 0.3 0.6 L -0.3 1.2"
        className="fill-none stroke-zinc-300"
        strokeWidth="0.22"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

/** Recirculation fan in line on a horizontal duct: narrow casing, propeller seen side-on. */
function RecircFan({ x, y, running, title }: { x: number; y: number; running: boolean; title: string }) {
  const bladeClass = running ? "stroke-white" : "stroke-zinc-500";
  return (
    <g transform={`translate(${x} ${y})`}>
      <title>{`${title} · ${running ? "FUNCIONANDO" : "DETENIDO"}`}</title>
      <rect x="-1" y="-1.6" width="2" height="3.2" rx="0.4" className="fill-sim-surface stroke-white" strokeWidth="0.4" />
      {[-0.7, 0.7].map((by) => (
        <ellipse
          key={by}
          cx="0"
          cy={by}
          rx="0.3"
          ry="0.62"
          transform={`rotate(25 0 ${by})`}
          className={`fill-none ${bladeClass}`}
          strokeWidth="0.22"
        />
      ))}
      <circle r="0.25" className={running ? "fill-white" : "fill-zinc-500"} />
    </g>
  );
}

/** Network on/off valve symbol; `angle` -90 sits on a vertical duct. */
function ShutoffValve({
  x,
  y,
  angle = -90,
  open,
  name,
}: {
  x: number;
  y: number;
  angle?: number;
  open: boolean;
  name: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${VALVE_SCALE})`}>
      <title>{`${name} · ${open ? "Abierta" : "Cerrada"}`}</title>
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

function RamExhaust({
  x,
  y,
  angle = 0,
  scale = 1.05,
  length = 2.6,
  title = "Salida de ram air (louvers)",
}: {
  x: number;
  y: number;
  angle?: number;
  scale?: number;
  /** Fore-aft length before scaling. */
  length?: number;
  title?: string;
}) {
  // Three slats, evenly spaced along the grille
  const slats = [1, 2, 3].map((i) => -length / 2 + (length * i) / 4);
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}>
      <title>{title}</title>
      <rect x="-1.6" y={-length / 2} width="3.2" height={length} rx="0.4" className="fill-sim-surface stroke-white" strokeWidth="0.45" />
      {slats.map((sy) => (
        <line key={sy} x1="-1" y1={sy} x2="1" y2={sy} className="stroke-zinc-300" strokeWidth="0.28" strokeLinecap="round" />
      ))}
    </g>
  );
}

/** Real bleed supply at the pack valve; everything downstream is illustrative. */
function usePackSupply(side: "L" | "R") {
  const { solution, runtimeState } = usePneumatic();
  const packValveId = side === "R" ? PNEUMATIC_NODE.rPackValve : PNEUMATIC_NODE.lPackValve;
  const supply = solution.nodes[packValveId];
  const packValveOpen = runtimeState.accessories[packValveId]?.open ?? false;
  const packOff = !packValveOpen || !supply?.energized || supply.pressurePsi <= 0;
  return { packValveOpen, packOff, bleedTemp: supply?.temperatureC ?? T.bleed };
}

/** Right pack, in network coordinates. The left pack is its mirror image. */
function RightPack({ side }: { side: "L" | "R" }) {
  const [doorOpen] = useRamDoor(side);
  const { packValveOpen, packOff, bleedTemp } = usePackSupply(side);
  const { manifoldOff } = useMixManifoldSupply();
  const ramOff = packOff || !doorOpen;
  // Left side: the flight deck tee keeps the duct to the manifold flowing
  const outletOff = side === "L" ? manifoldOff : packOff;
  const outletTemp = packOff ? T.mix : T.packOut;

  return (
    <g>
      {/* Ram air: from the bottom of the HX stack straight into the side of the ACM fan... */}
      <Duct
        points={[[HX_X, HX1_Y + 2.5], [HX_X, FAN_Y], [SHAFT_X + 1.8, FAN_Y]]}
        temp={T.ramExhaust}
        inactive={ramOff}
      />
      {/* ...then straight aft to the louvers, across the hot TCV bypass and trim tap */}
      <Duct
        points={[[SHAFT_X, FAN_Y + 1.8], [SHAFT_X, RAM_EXHAUST.y - (RAM_EXHAUST.length * 1.05) / 2]]}
        temp={T.ramExhaust}
        inactive={ramOff}
      />
      <RamExhaust x={SHAFT_X} y={RAM_EXHAUST.y} length={RAM_EXHAUST.length} />

      {/* Pack supply, TCV bypass and turbine outlet meet at two tees */}
      {(["casing", "core"] as const).map((part) => (
        <g key={part}>
          <Duct points={BLEED_IN} temp={bleedTemp} inactive={packOff} part={part} />
          <Duct points={TRIM_TAP} temp={bleedTemp} inactive={packOff} part={part} />
          <Duct points={TCV_BYPASS} temp={bleedTemp} inactive={packOff} part={part} />
          <Duct points={STBY_TCV_LOOP} temp={bleedTemp} inactive={packOff} part={part} />
          <Duct points={[[SHAFT_X, CONDENSER.y], [SHAFT_X, TCV_JOIN_Y]]} temp={T.packOut} inactive={packOff} part={part} />
          <Duct points={TURBINE_OUT_UPSTREAM} temp={T.packOut} inactive={packOff} part={part} />
          <Duct points={TURBINE_OUT_DOWNSTREAM} temp={outletTemp} inactive={outletOff} part={part} />
        </g>
      ))}
      <Junction x={SUPPLY_X} y={TCV_TEE_Y} temp={bleedTemp} inactive={packOff} />
      <Junction x={TCV_LANE_X} y={STBY_TCV.topY} temp={bleedTemp} inactive={packOff} />
      <Junction x={TCV_LANE_X} y={STBY_TCV.bottomY} temp={bleedTemp} inactive={packOff} />
      <Junction x={SUPPLY_X} y={TRIM_TAP_Y} temp={bleedTemp} inactive={packOff} />
      <CheckValve x={TRIM_CHECK_X} y={TRIM_TAP_Y} angle={180} title="Check valve de suministro de trim air" />
      <Junction x={SHAFT_X} y={TCV_JOIN_Y} temp={T.packOut} inactive={packOff} />
      <CheckValve x={SHAFT_X} y={PACK_CHECK_Y} angle={-90} title={`Check valve de salida del pack ${side} al mix manifold`} />
      {/* HX1 → compressor and compressor → HX2, straight across at the compressor level */}
      <Duct points={[[HX_PORT_X, HX1_Y - 1.2], [SHAFT_X + 2.1, HX1_Y - 1.2]]} temp={T.hx1Out} inactive={packOff} />
      <Duct points={[[SHAFT_X + 0.9, HX2_Y + 1.2], [HX_PORT_X, HX2_Y + 1.2]]} temp={T.compOut} inactive={packOff} />

      {/* Water extraction loop, hot side: HX2 → reheater → condenser → both water extractors */}
      <Duct
        points={[[HX_PORT_X, HX2_Y - 1.2], [REHEATER_HOT_IN_X, HX2_Y - 1.2], [REHEATER_HOT_IN_X, REHEATER_EDGE.bottom - 0.3]]}
        temp={T.hx2Out}
        inactive={packOff}
      />
      <Duct
        points={[[REHEATER_EDGE.inboard + 0.3, CONDENSER.y], [CONDENSER_EDGE.outboard - 0.3, CONDENSER.y]]}
        temp={T.reheaterHotOut}
        inactive={packOff}
      />
      {(["casing", "core"] as const).map((part) => (
        <g key={part}>
          <Duct
            points={[[CONDENSER_EDGE.inboard + 0.3, CONDENSER.y], [WE_FEED_X, CONDENSER.y]]}
            temp={T.condenserHotOut}
            inactive={packOff}
            part={part}
          />
          <Duct
            points={[
              [SHAFT_X, WATER_EXTRACTOR.topY],
              [WE_FEED_X, WATER_EXTRACTOR.topY],
              [WE_FEED_X, WATER_EXTRACTOR.bottomY],
              [SHAFT_X, WATER_EXTRACTOR.bottomY],
            ]}
            temp={T.condenserHotOut}
            inactive={packOff}
            part={part}
          />
        </g>
      ))}
      <Junction x={WE_FEED_X} y={CONDENSER.y} temp={T.condenserHotOut} inactive={packOff} />
      {/* Reheater cold pass → turbine */}
      <Duct
        points={[
          [REHEATER_TURBINE_OUT_X, REHEATER_EDGE.bottom - 0.3],
          [REHEATER_TURBINE_OUT_X, TURBINE_INLET_Y],
          [SHAFT_X + 1.6, TURBINE_INLET_Y],
        ]}
        temp={T.turbineIn}
        inactive={packOff}
      />
      {/* Both water extractors drain straight across into the reheater cold pass */}
      {[WATER_EXTRACTOR.topY, WATER_EXTRACTOR.bottomY].map((y) => (
        <Duct key={y} points={[[SHAFT_X, y], [REHEATER_EDGE.inboard + 0.3, y]]} temp={T.condenserHotOut} inactive={packOff} />
      ))}
      {/* Cold side: turbine exhaust straight forward into the condenser, which
          discharges forward to the TCV bypass tee (drawn with the tees above) */}
      <Duct points={[[SHAFT_X, TURBINE_Y - 2], [SHAFT_X, CONDENSER.y]]} temp={T.turbineExhaust} inactive={packOff} />

      {/* Ram plenum with both heat exchangers stacked inside */}
      <RamPlenum ramOff={ramOff} />
      <HeatExchanger x={HX_X} y={HX2_Y} title="HX secundario (HX2)" />
      <HeatExchanger x={HX_X} y={HX1_Y} title="HX primario (HX1)" />

      {/* ACM: shaft parallel to the fuselage, Turbine (fwd) – Compressor – Fan (aft) */}
      <line
        x1={SHAFT_X}
        y1={TURBINE_Y - 2}
        x2={SHAFT_X}
        y2={FAN_Y}
        className="stroke-white"
        strokeWidth="0.6"
        strokeLinecap="round"
      />
      <Wheel y={TURBINE_Y} wideAt="top" temp={T.turbineExhaust} inactive={packOff} title="Turbina de la ACM" />
      <Wheel y={COMPRESSOR_Y} wideAt="bottom" temp={T.compOut} inactive={packOff} title="Compresor de la ACM" />
      <Fan x={SHAFT_X} y={FAN_Y} />

      <LoopHeatExchanger {...CONDENSER} title="Condenser (paso caliente: aire del reheater · paso frío: escape de la turbina)" />
      <LoopHeatExchanger {...REHEATER} title="Reheater (paso caliente: aire del HX2 · paso frío: aire seco hacia la turbina)" />
      <WaterExtractor y={WATER_EXTRACTOR.topY} inactive={packOff} title="Water extractor delantero" />
      <WaterExtractor y={WATER_EXTRACTOR.bottomY} inactive={packOff} title="Water extractor trasero" />
      {PACK_TRIP_STAGES.map((stage) => (
        <PackTripSensor key={stage} side={side} stage={stage} />
      ))}
      <ModulatingValve x={TCV_LANE_X} y={TCV_Y} angle={90} title="Pack temperature control valve" />
      <ModulatingValve
        x={STBY_TCV.laneX}
        y={STBY_TCV.valveY}
        angle={90}
        title="Standby pack temperature control valve"
      />
      {/* Pack valve: the only pneumatic element shown in the ECS view */}
      <ShutoffValve x={SUPPLY_X} y={PACK_VALVE_Y} open={packValveOpen} name="Pack valve" />
    </g>
  );
}

/**
 * Clickable wrapper for outlets the crew opens and closes by hand, like the
 * manual valves: a dashed outline on hover, toggled by click or keyboard.
 */
function OutletToggle({
  open,
  onToggle,
  name,
  hoverOutline,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  name: string;
  hoverOutline: ReactNode;
  children: ReactNode;
}) {
  return (
    <g
      className="group cursor-pointer select-none focus:outline-none"
      role="button"
      tabIndex={0}
      aria-pressed={open}
      aria-label={`${name}: ${open ? "abierto" : "cerrado"}. Clic para alternar.`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      <title>{`${name} · ${open ? "ABIERTO" : "CERRADO"} (clic para ${open ? "cerrar" : "abrir"})`}</title>
      <g
        className="fill-transparent stroke-white opacity-0 transition-opacity duration-150 group-hover:opacity-85"
        strokeWidth="0.2"
        strokeDasharray="0.5 0.4"
      >
        {hoverOutline}
      </g>
      {children}
    </g>
  );
}

/** Inner lines of an outlet: temperature coloured while air flows through it. */
function outletLineProps(temp: number, flowing: boolean) {
  return flowing ? { stroke: getTemperatureColor(temp) } : { className: "stroke-zinc-500" };
}

/** Air outlet (floor / ceiling diffuser): small grille, one slat per 0.55 of width. */
function Diffuser({
  x,
  y,
  width = 2.6,
  temp,
  flowing,
}: {
  x: number;
  y: number;
  width?: number;
  temp: number;
  flowing: boolean;
}) {
  const slats = Math.max(1, Math.round((width - 1) / 0.55));
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-width / 2} y="-0.8" width={width} height="1.6" rx="0.3" className="fill-sim-surface stroke-white" strokeWidth="0.4" />
      {Array.from({ length: slats }, (_, i) => (i - (slats - 1) / 2) * 0.55).map((lx) => (
        <line key={lx} x1={lx} y1="-0.45" x2={lx} y2="0.45" {...outletLineProps(temp, flowing)} strokeWidth="0.24" strokeLinecap="round" />
      ))}
    </g>
  );
}

/** Gasper: swivelling eyeball outlet. */
function Gasper({ x, y, temp, flowing }: { x: number; y: number; temp: number; flowing: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="0.95" className="fill-sim-surface stroke-white" strokeWidth="0.4" />
      <circle r="0.4" fill="none" {...outletLineProps(temp, flowing)} strokeWidth="0.26" />
    </g>
  );
}

/** Placement of a nozzle drawn along the segment from `from` to `to`. */
function nozzleFrame(from: P, to: P) {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const angle = (Math.atan2(to[1] - from[1], to[0] - from[0]) * 180) / Math.PI;
  return { length, transform: `translate(${(from[0] + to[0]) / 2} ${(from[1] + to[1]) / 2}) rotate(${angle})` };
}

/** Hover outline around a defog nozzle. */
function DefogNozzleOutline({ from, to }: { from: P; to: P }) {
  const { length, transform } = nozzleFrame(from, to);
  return <rect transform={transform} x={-length / 2 - 0.6} y="-1.2" width={length + 1.2} height="2.4" rx="1" />;
}

/** Windshield defog outlet: long slotted nozzle along the windshield base. */
function DefogNozzle({ from, to, temp, flowing }: { from: P; to: P; temp: number; flowing: boolean }) {
  const { length, transform } = nozzleFrame(from, to);
  const slots = Math.floor((length - 0.8) / 0.7);
  return (
    <g transform={transform}>
      <rect x={-length / 2} y="-0.6" width={length} height="1.2" rx="0.5" className="fill-sim-surface stroke-white" strokeWidth="0.4" />
      {Array.from({ length: slots }, (_, i) => (i - (slots - 1) / 2) * 0.7).map((lx) => (
        <line key={lx} x1={lx} y1="-0.3" x2={lx} y2="0.3" {...outletLineProps(temp, flowing)} strokeWidth="0.22" strokeLinecap="round" />
      ))}
    </g>
  );
}

/**
 * Sidewall riser: vertical duct from the floor duct up to the ceiling duct.
 * Either end can face forward; the chevron sits at the ceiling end, pointing
 * towards it.
 */
function Riser({ x, floorY, ceilingY, title }: { x: number; floorY: number; ceilingY: number; title: string }) {
  const top = Math.min(floorY, ceilingY);
  const bottom = Math.max(floorY, ceilingY);
  // +1: chevron at the top pointing forward; -1: at the bottom pointing aft
  const dir = ceilingY < floorY ? 1 : -1;
  const tipY = dir > 0 ? top + 0.6 : bottom - 0.6;
  const baseY = tipY + dir * 0.8;
  return (
    <g>
      <title>{title}</title>
      <rect
        x={x - 1.1}
        y={top - 1.1}
        width="2.2"
        height={bottom - top + 2.2}
        rx="1.1"
        className="fill-sim-surface stroke-white"
        strokeWidth="0.45"
      />
      <path
        d={`M ${x - 0.6} ${baseY} L ${x} ${tipY} L ${x + 0.6} ${baseY}`}
        className="fill-none stroke-zinc-300"
        strokeWidth="0.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

// Distribution towards the forward fuselage (FCOM 2.31 Air Conditioning
// Distribution), in absolute coordinates.
const MIX_ABS: P = [MIX[0], MIX[1] + PACKS_OFFSET_Y];
const FD_HEADER_Y = 78.5;
// Flight deck supply: straight on forward from the left turbine outlet,
// upstream of the mix manifold
const FD_TEE: P = [2 * CENTERLINE_X - SHAFT_X, TURBINE_OUT_Y + PACKS_OFFSET_Y];
const FD_X = FD_TEE[0];
const PILOT_X = { capt: 372, fo: 387 };
// Flight deck ceiling: a short vertical duct up the wall at each end of the
// header, each feeding a ceiling grille inboard of it.
const FD_WALL_DUCT = { dx: 16.5, floorY: FD_HEADER_Y, ceilingY: 75.5 };
const FD_CEILING_GRILLE = { dx: 11.5, width: 4 };
// Ahead of each pilot the column tees into a gasper
// outboard, the windshield defog nozzle and the foot grille inboard.
const FD_OUTLET_TEE_Y = 62.2;
const FD_OUTLETS = { gasperX: 369.8, defogX: 373.9, footX: 377, footY: 58 };
// Defog nozzle just inside the base (forward edge) of the left windshield,
// from its outboard to its inboard end.
const DEFOG_NOZZLE: [P, P] = [
  [371.44, 55.54],
  [378.16, 51.92],
];
// The defog feed ends on the nozzle's centreline
const DEFOG_FEED_END_Y =
  DEFOG_NOZZLE[0][1] +
  ((FD_OUTLETS.defogX - DEFOG_NOZZLE[0][0]) / (DEFOG_NOZZLE[1][0] - DEFOG_NOZZLE[0][0])) *
    (DEFOG_NOZZLE[1][1] - DEFOG_NOZZLE[0][1]);
/** Captain side x mirrored onto the first officer side. */
const mirror = (x: number) => 2 * CENTERLINE_X - x;
const SIDES = [
  { label: "izq.", sx: (x: number) => x, side: "L" },
  { label: "der.", sx: mirror, side: "R" },
] as const;

/**
 * Hand-operated flight deck outlet: clickable, with its inner lines coloured
 * while air leaves it (supply on and outlet open).
 */
function FdOutletControl({
  outlet,
  name,
  supplied,
  hoverOutline,
  children,
}: {
  outlet: FdOutlet;
  name: string;
  supplied: boolean;
  hoverOutline: ReactNode;
  children: (flowing: boolean) => ReactNode;
}) {
  const [open, toggle] = useFdOutlet(outlet);
  return (
    <OutletToggle open={open} onToggle={toggle} name={name} hoverOutline={hoverOutline}>
      {children(supplied && open)}
    </OutletToggle>
  );
}
// Sidewall risers against the wall: the forward left one just forward of the
// AC distribution bay, and the aft pair just forward of the mix manifold, one
// cabin window aft of it.
const RISER_X = { left: 358, right: 2 * CENTERLINE_X - 358 };
// Aft risers: air comes in at the forward end (floor duct from the mix
// manifold) and leaves at the aft end (ceiling duct).
// The risers' ends stay just inside the AC distribution bay lines: half the
// capsule (1.1) + its outline and the bay line (0.4) + a 0.4 gap.
const RISER_END_INSET = 1.9;
const AFT_RISER = { floorY: 215.1, ceilingY: AC_DIST_BAY_Y.aft - RISER_END_INSET };
const FWD_RISER = { floorY: 206.9, ceilingY: AC_DIST_BAY_Y.fwd + RISER_END_INSET };
// Each riser has its own feed from the mix manifold, running outboard to the
// wall and then along it into the riser. The aft risers' feeds are symmetric:
// up the X diagonals, along this line forward of the manifold, then aft into
// the top of each riser. The forward left riser's leaves the upper left of
// the manifold, crosses the aft left feed, runs along a line just forward of
// it and enters the bottom of the riser.
const AFT_RISER_FEED_Y = 211.3;
const FWD_RISER_FEED = { y: 209, cornerX: 370, entryDeg: 158 };
// Recirculation enters the manifold sides at its centre
const RECIRC_Y = MIX[1] + PACKS_OFFSET_Y;
// Recirculation on each side of the mix manifold, outward from it and
// inboard of the flight deck supply: check valve, HEPA filter, recirculation
// fan (distance from the centre).
const RECIRC_DX = { check: 5.8, filter: 8.9, fan: 11.5 };
const OVERHEAD_FWD_Y = 100;
// Two overhead ducts at ceiling level, one each side of the centerline, run
// forward and aft of the risers' ceiling ducts to the ends of the cabin. Each
// one feeds branches outboard, each ending in a T along the cabin towards the
// sidewall outlets.
const OVERHEAD_X = { left: CENTERLINE_X - 2.5, right: CENTERLINE_X + 2.5 };
const OVERHEAD_AFT_END_Y = AFT_PRESSURE_BULKHEAD_Y - 6;
const OVERHEAD_BRANCH = { length: 7, pitch: 8, teeHalf: 1.5 };

/** Branch positions along an overhead duct, inset from both ends. */
function branchYs(from: number, to: number): number[] {
  const count = Math.floor((to - from) / OVERHEAD_BRANCH.pitch);
  const start = from + (to - from - count * OVERHEAD_BRANCH.pitch) / 2;
  return Array.from({ length: count + 1 }, (_, i) => start + i * OVERHEAD_BRANCH.pitch);
}

/**
 * Pair of overhead ducts between two stations, with their branches from
 * `branchFrom` on (aft ducts: none over the packs and the network blocks aft of them).
 */
function OverheadDucts({
  from,
  to,
  branchFrom = from,
  inactive,
}: {
  from: number;
  to: number;
  branchFrom?: number;
  inactive: boolean;
}) {
  const ys = branchYs(branchFrom + 2, to - 2);
  return (
    <g>
      {([
        [OVERHEAD_X.left, -1],
        [OVERHEAD_X.right, 1],
      ] as const).map(([x, out]) => (
        <g key={x}>
          {ys.map((y) => {
            const endX = x + out * OVERHEAD_BRANCH.length;
            return (
              <g key={y}>
                <Duct points={[[x, y], [endX, y]]} temp={T.mix} inactive={inactive} part="core" dashed />
                <Duct
                  points={[[endX, y - OVERHEAD_BRANCH.teeHalf], [endX, y + OVERHEAD_BRANCH.teeHalf]]}
                  temp={T.mix}
                  inactive={inactive}
                  part="core"
                  dashed
                />
              </g>
            );
          })}
          <Duct points={[[x, from], [x, to]]} temp={T.mix} inactive={inactive} part="core" dashed />
        </g>
      ))}
    </g>
  );
}

/**
 * Flight deck supply from the left pack and forward cabin supply from the mix
 * manifold through the sidewall risers and the overhead duct.
 */
/** Recirculation fans and whether the mix manifold receives any air. */
function useMixManifoldSupply() {
  const left = usePackSupply("L");
  const right = usePackSupply("R");
  const { switches } = usePneumatic();
  // No flight condition selector yet: the fans follow their ground logic.
  const fans = recircFansRunning({
    lSwitchAuto: switches.lRecircFan,
    rSwitchAuto: switches.rRecircFan,
    lPack: switches.lPack,
    rPack: switches.rPack,
    lPackOperating: !left.packOff,
    rPackOperating: !right.packOff,
    inFlight: false,
  });
  const [groundCart] = useGroundCart();
  // The mix manifold is fed by any running pack, recirculation fan or the
  // ground conditioned air connection.
  const manifoldOff = left.packOff && right.packOff && !fans.left && !fans.right && !groundCart;
  return { left, fans, manifoldOff };
}

function ForwardDistribution() {
  const { left, fans, manifoldOff } = useMixManifoldSupply();
  const fdTemp = left.packOff ? T.mix : T.packOut;

  return (
    <g>
      {/* Forward cabin: one mix manifold outlet per riser. Aft left riser, on the X diagonal... */}
      <Duct
        points={[
          [RISER_X.left, AFT_RISER.floorY],
          [RISER_X.left, AFT_RISER_FEED_Y],
          mixRayAtY(MIX_ABS, 180 - MIX_X_DEG, AFT_RISER_FEED_Y),
          onMix(MIX_ABS, 180 - MIX_X_DEG),
        ]}
        temp={T.mix}
        inactive={manifoldOff}
      />
      {/* ...forward left riser, crossing the aft left feed... */}
      <Duct
        points={[
          [RISER_X.left, FWD_RISER.floorY],
          [RISER_X.left, FWD_RISER_FEED.y],
          [FWD_RISER_FEED.cornerX, FWD_RISER_FEED.y],
          onMix(MIX_ABS, FWD_RISER_FEED.entryDeg),
        ]}
        temp={T.mix}
        inactive={manifoldOff}
      />
      {/* ...and right riser, on the X diagonal */}
      <Duct
        points={[
          [RISER_X.right, AFT_RISER.floorY],
          [RISER_X.right, AFT_RISER_FEED_Y],
          mixRayAtY(MIX_ABS, MIX_X_DEG, AFT_RISER_FEED_Y),
          onMix(MIX_ABS, MIX_X_DEG),
        ]}
        temp={T.mix}
        inactive={manifoldOff}
      />
      {/* Recirculation: fan → HEPA filter → check valve → mix manifold, on each side */}
      {([
        ["L", -1],
        ["R", 1],
      ] as const).map(([side, dir]) => {
        const at = (dx: number) => MIX_ABS[0] + dir * dx;
        const running = side === "L" ? fans.left : fans.right;
        return (
          <g key={side}>
            <Duct points={[[at(2), RECIRC_Y], [at(RECIRC_DX.fan), RECIRC_Y]]} temp={T.cabin} inactive={!running} />
            <CheckValve
              x={at(RECIRC_DX.check)}
              y={RECIRC_Y}
              angle={dir > 0 ? 180 : 0}
              title={`${side} recirculation check valve`}
            />
            <HepaFilter x={at(RECIRC_DX.filter)} y={RECIRC_Y} title={`${side} recirculation HEPA filter`} />
            <RecircFan x={at(RECIRC_DX.fan)} y={RECIRC_Y} running={running} title={`${side} recirculation fan`} />
          </g>
        );
      })}

      {/* Flight deck supply from the left pack outlet, upstream of the mix manifold */}
      <Duct points={[FD_TEE, [FD_X, FD_HEADER_Y]]} temp={fdTemp} inactive={manifoldOff} part="casing" />

      {/* Flight deck outlets: header out to the wall ducts, pilot columns up to their outlet tees */}
      {(["casing", "core"] as const).map((part) => (
        <g key={part}>
          <Duct
            points={[[CENTERLINE_X - FD_WALL_DUCT.dx, FD_HEADER_Y], [CENTERLINE_X + FD_WALL_DUCT.dx, FD_HEADER_Y]]}
            temp={fdTemp}
            inactive={manifoldOff}
            part={part}
          />
          {SIDES.map(({ label, sx }) => (
            <g key={label}>
              <Duct
                points={[[sx(PILOT_X.capt), FD_HEADER_Y], [sx(PILOT_X.capt), FD_OUTLET_TEE_Y]]}
                temp={fdTemp}
                inactive={manifoldOff}
                part={part}
              />
              <Duct
                points={[
                  [sx(FD_OUTLETS.gasperX), FD_OUTLET_TEE_Y],
                  [sx(FD_OUTLETS.footX), FD_OUTLET_TEE_Y],
                  [sx(FD_OUTLETS.footX), FD_OUTLETS.footY],
                ]}
                temp={fdTemp}
                inactive={manifoldOff}
                part={part}
              />
              <Duct
                points={[[sx(FD_OUTLETS.defogX), FD_OUTLET_TEE_Y], [sx(FD_OUTLETS.defogX), DEFOG_FEED_END_Y]]}
                temp={fdTemp}
                inactive={manifoldOff}
                part={part}
              />
            </g>
          ))}
        </g>
      ))}
      <Duct points={[FD_TEE, [FD_X, FD_HEADER_Y]]} temp={fdTemp} inactive={manifoldOff} part="core" />
      {[FD_X, PILOT_X.capt, PILOT_X.fo].map((x) => (
        <Junction key={x} x={x} y={FD_HEADER_Y} temp={fdTemp} inactive={manifoldOff} />
      ))}
      {SIDES.map(({ label, sx, side }) => (
        <g key={label}>
          <Junction x={sx(PILOT_X.capt)} y={FD_OUTLET_TEE_Y} temp={fdTemp} inactive={manifoldOff} />
          <Junction x={sx(FD_OUTLETS.defogX)} y={FD_OUTLET_TEE_Y} temp={fdTemp} inactive={manifoldOff} />
          <Riser
            x={sx(CENTERLINE_X - FD_WALL_DUCT.dx)}
            floorY={FD_WALL_DUCT.floorY}
            ceilingY={FD_WALL_DUCT.ceilingY}
            title={`Conducto vertical de pared del flight deck ${label}`}
          />
          <FdOutletControl
            outlet={`ceiling${side}`}
            name={`Rejilla de techo del flight deck ${label}`}
            supplied={!manifoldOff}
            hoverOutline={
              <rect
                x={sx(CENTERLINE_X - FD_CEILING_GRILLE.dx) - FD_CEILING_GRILLE.width / 2 - 0.6}
                y={FD_WALL_DUCT.ceilingY - 1.4}
                width={FD_CEILING_GRILLE.width + 1.2}
                height="2.8"
                rx="0.6"
              />
            }
          >
            {(flowing) => (
              <Diffuser
                x={sx(CENTERLINE_X - FD_CEILING_GRILLE.dx)}
                y={FD_WALL_DUCT.ceilingY}
                width={FD_CEILING_GRILLE.width}
                temp={fdTemp}
                flowing={flowing}
              />
            )}
          </FdOutletControl>
          <FdOutletControl
            outlet={`defog${side}`}
            name={`Desempañador del parabrisas ${label} (base del parabrisas No. 1)`}
            supplied={!manifoldOff}
            hoverOutline={
              <DefogNozzleOutline
                from={[sx(DEFOG_NOZZLE[0][0]), DEFOG_NOZZLE[0][1]]}
                to={[sx(DEFOG_NOZZLE[1][0]), DEFOG_NOZZLE[1][1]]}
              />
            }
          >
            {(flowing) => (
              <DefogNozzle
                from={[sx(DEFOG_NOZZLE[0][0]), DEFOG_NOZZLE[0][1]]}
                to={[sx(DEFOG_NOZZLE[1][0]), DEFOG_NOZZLE[1][1]]}
                temp={fdTemp}
                flowing={flowing}
              />
            )}
          </FdOutletControl>
          <FdOutletControl
            outlet={`gasper${side}`}
            name={`Gasper (ojo orientable) ${label}`}
            supplied={!manifoldOff}
            hoverOutline={<circle cx={sx(FD_OUTLETS.gasperX)} cy={FD_OUTLET_TEE_Y} r="1.6" />}
          >
            {(flowing) => <Gasper x={sx(FD_OUTLETS.gasperX)} y={FD_OUTLET_TEE_Y} temp={fdTemp} flowing={flowing} />}
          </FdOutletControl>
          <FdOutletControl
            outlet={`foot${side}`}
            name={`Rejilla de pies ${label}`}
            supplied={!manifoldOff}
            hoverOutline={<rect x={sx(FD_OUTLETS.footX) - 1.9} y={FD_OUTLETS.footY - 1.4} width="3.8" height="2.8" rx="0.6" />}
          >
            {(flowing) => <Diffuser x={sx(FD_OUTLETS.footX)} y={FD_OUTLETS.footY} temp={fdTemp} flowing={flowing} />}
          </FdOutletControl>
        </g>
      ))}

      <Riser x={RISER_X.left} {...AFT_RISER} title="Sidewall riser izquierdo trasero (FWD CAB)" />
      <Riser x={RISER_X.right} {...AFT_RISER} title="Sidewall riser derecho (FWD CAB)" />
      <Riser x={RISER_X.left} {...FWD_RISER} title="Sidewall riser izquierdo delantero (FWD CAB)" />
    </g>
  );
}

// Trim air (FCOM 2.31): the supply from both packs feeds the trim air pressure
// regulator and shutoff valve on the centerline, then one trim air modulating
// valve per zone. Drawn first, so every other duct passes over it.
// The zone valves sit centred on the airplane centerline: AFT CAB in the
// middle runs straight up it, flight deck to the left, FWD CAB to the right.
const TRIM_VALVE_SPACING = 6;
const TRIM = {
  prsovY: 245,
  headerY: 240,
  valveY: 234.3,
  x: {
    flightDeck: MIX_ABS[0] - TRIM_VALVE_SPACING,
    aftCab: MIX_ABS[0],
    fwdCab: MIX_ABS[0] + TRIM_VALVE_SPACING,
  },
  flightDeckJoinY: 222.6,
  // FWD CAB crosses forward of the mix manifold, then drops into the forward riser feed
  fwdCabCrossY: 206,
  fwdCabJoinX: 368.5,
  // AFT CAB runs up the centerline under the mix manifold, then a T just
  // forward of it drops into both aft riser feeds
  aftCabSplitY: AFT_RISER_FEED_Y - 2.8,
  aftCabJoinDx: 3.8,
};

function trimJoins() {
  return {
    flightDeck: [FD_X, TRIM.flightDeckJoinY] as P,
    fwdCab: [TRIM.fwdCabJoinX, FWD_RISER_FEED.y] as P,
    aftCabLeft: [MIX_ABS[0] - TRIM.aftCabJoinDx, AFT_RISER_FEED_Y] as P,
    aftCabRight: [MIX_ABS[0] + TRIM.aftCabJoinDx, AFT_RISER_FEED_Y] as P,
  };
}

const TRIM_ZONES: { zone: TrimZone; label: string }[] = [
  { zone: "flightDeck", label: "flight deck" },
  { zone: "aftCab", label: "AFT CAB" },
  { zone: "fwdCab", label: "FWD CAB" },
];

function TrimAir() {
  const left = usePackSupply("L");
  const right = usePackSupply("R");
  const { switches, trimValves, toggleTrimValve } = usePneumatic();
  const supplyOff = left.packOff && right.packOff;
  // The TRIM AIR switch drives the pressure regulator and shutoff valve.
  const prsovOpen = switches.trimAir;
  const headerOff = supplyOff || !prsovOpen;
  const temp = left.packOff ? right.bleedTemp : left.bleedTemp;
  const cx = MIX_ABS[0];
  const joins = trimJoins();

  // Supply side: from the centerline tap up to the PRSOV
  const supply: P[] = [[cx, TRIM_TAP_Y + PACKS_OFFSET_Y], [cx, TRIM.prsovY]];
  // Downstream of the PRSOV: the zone valve header
  const header: P[][] = [
    [[cx, TRIM.prsovY], [cx, TRIM.headerY]],
    [[TRIM.x.flightDeck, TRIM.headerY], [TRIM.x.fwdCab, TRIM.headerY]],
    ...TRIM_ZONES.map(({ zone }): P[] => [[TRIM.x[zone], TRIM.headerY], [TRIM.x[zone], TRIM.valveY]]),
  ];
  // Downstream of each zone modulating valve
  const zoneRoutes: Record<TrimZone, P[][]> = {
    // Flight deck: into the flight deck supply
    flightDeck: [[[TRIM.x.flightDeck, TRIM.valveY], [TRIM.x.flightDeck, TRIM.flightDeckJoinY], joins.flightDeck]],
    // FWD CAB: up the right of the mix manifold, across forward of it into the forward riser feed
    fwdCab: [
      [
        [TRIM.x.fwdCab, TRIM.valveY],
        [TRIM.x.fwdCab, TRIM.fwdCabCrossY],
        [joins.fwdCab[0], TRIM.fwdCabCrossY],
        joins.fwdCab,
      ],
    ],
    // AFT CAB: straight up the centerline under the mix manifold, then to both aft riser feeds
    aftCab: [
      [[TRIM.x.aftCab, TRIM.valveY], [TRIM.x.aftCab, TRIM.aftCabSplitY]],
      [joins.aftCabLeft, [joins.aftCabLeft[0], TRIM.aftCabSplitY], [joins.aftCabRight[0], TRIM.aftCabSplitY], joins.aftCabRight],
    ],
  };
  const segments: { points: P[]; off: boolean }[] = [
    { points: supply, off: supplyOff },
    ...header.map((points) => ({ points, off: headerOff })),
    ...TRIM_ZONES.flatMap(({ zone }) =>
      zoneRoutes[zone].map((points) => ({ points, off: headerOff || !trimValves[zone] })),
    ),
  ];

  return (
    <g>
      {(["casing", "core"] as const).map((part) => (
        <g key={part}>
          {segments.map(({ points, off }, index) => (
            <Duct key={index} points={points} temp={temp} inactive={off} part={part} />
          ))}
        </g>
      ))}
      <Junction x={cx} y={TRIM.headerY} temp={temp} inactive={headerOff} />
      <Junction x={cx} y={TRIM.aftCabSplitY} temp={temp} inactive={headerOff || !trimValves.aftCab} />
      <ShutoffValve x={cx} y={TRIM.prsovY} open={prsovOpen} name="Trim air pressure regulator and shutoff valve" />
      {TRIM_ZONES.map(({ zone, label }) => (
        <ModulatingValve
          key={zone}
          x={TRIM.x[zone]}
          y={TRIM.valveY}
          angle={90}
          open={trimValves[zone]}
          onToggle={() => toggleTrimValve(zone)}
          title={`Trim air modulating valve · ${label}`}
        />
      ))}
    </g>
  );
}

/**
 * Ceiling-level ducts: the risers' ceiling ducts and the overhead ducts with
 * their branches. Secondary, so a separate layer drawn under the pneumatic
 * network and every other duct.
 */
export function OverheadDuctLayer() {
  const { left, manifoldOff } = useMixManifoldSupply();
  const fdTemp = left.packOff ? T.mix : T.packOut;
  return (
    <g>
      {/* Flight deck: each wall duct to its ceiling grille */}
      {SIDES.map(({ label, sx }) => (
        <Duct
          key={label}
          points={[
            [sx(CENTERLINE_X - FD_WALL_DUCT.dx), FD_WALL_DUCT.ceilingY],
            [sx(CENTERLINE_X - FD_CEILING_GRILLE.dx), FD_WALL_DUCT.ceilingY],
          ]}
          temp={fdTemp}
          inactive={manifoldOff}
          part="core"
          dashed
        />
      ))}
      <OverheadDucts from={OVERHEAD_FWD_Y} to={FWD_RISER.ceilingY} inactive={manifoldOff} />
      <Duct
        points={[[RISER_X.left, AFT_RISER.ceilingY], [RISER_X.right, AFT_RISER.ceilingY]]}
        temp={T.mix}
        inactive={manifoldOff}
        part="core"
        dashed
      />
      <Duct
        points={[[RISER_X.left, FWD_RISER.ceilingY], [OVERHEAD_X.right, FWD_RISER.ceilingY]]}
        temp={T.mix}
        inactive={manifoldOff}
        part="core"
        dashed
      />
      <OverheadDucts
        from={AFT_RISER.ceilingY}
        to={OVERHEAD_AFT_END_Y}
        branchFrom={AFT_CARGO_Y}
        inactive={manifoldOff}
      />
    </g>
  );
}

/** Where trim air joins the distribution ducts, drawn over them. */
function TrimAirJoins() {
  const { manifoldOff } = useMixManifoldSupply();
  const joins = trimJoins();
  return (
    <g>
      <Junction x={joins.flightDeck[0]} y={joins.flightDeck[1]} temp={T.mix} inactive={manifoldOff} />
      <Junction x={joins.fwdCab[0]} y={joins.fwdCab[1]} temp={T.mix} inactive={manifoldOff} />
      <Junction x={joins.aftCabLeft[0]} y={joins.aftCabLeft[1]} temp={T.mix} inactive={manifoldOff} />
      <Junction x={joins.aftCabRight[0]} y={joins.aftCabRight[1]} temp={T.mix} inactive={manifoldOff} />
    </g>
  );
}

export function PackMockupLayer() {
  const left = usePackSupply("L");
  const right = usePackSupply("R");
  const { manifoldOff } = useMixManifoldSupply();
  return (
    <g data-mockup="packs">
      <TrimAir />
      <ForwardDistribution />
      <g transform={`translate(0 ${PACKS_OFFSET_Y})`}>
        <RightPack side="R" />
        <g transform={MIRROR_TRANSFORM}>
          <RightPack side="L" />
        </g>
        {/* Mix manifold, fed by both turbines */}
        <g transform={`translate(${MIX[0]} ${MIX[1]})`}>
          <title>Mix manifold</title>
          <circle r={MIX_R} className="fill-sim-surface stroke-white" strokeWidth="0.55" />
          {!manifoldOff && (
            <circle r={MIX_R - 0.7} fill="none" stroke={getTemperatureColor(T.mix)} strokeWidth="0.32" />
          )}
          <GroundCartConnection />
        </g>
        {/* Both trim air supplies meet on the centerline */}
        <Junction
          x={MIX[0]}
          y={TRIM_TAP_Y}
          temp={left.packOff ? right.bleedTemp : left.bleedTemp}
          inactive={left.packOff && right.packOff}
        />
      </g>
      <Junction
        x={FD_TEE[0]}
        y={FD_TEE[1]}
        temp={left.packOff ? T.mix : T.packOut}
        inactive={manifoldOff}
      />
      <TrimAirJoins />
      <PressurizationValves />
    </g>
  );
}

// Pressurization (FCOM 2.40 schematic): on the right aft lower lobe, at the
// aft right door and just forward of the aft pressure bulkhead. From the belly
// up the side (so outboard in plan view): a positive pressure relief valve,
// the outflow valve and the other positive pressure relief valve, inboard of
// the door outline. The negative pressure relief door sits on its own a
// little forward of the door, slightly higher up the side.
const OUTFLOW_VALVE = { x: 392, y: AFT_PRESSURE_BULKHEAD_Y - 2.7 };
const RELIEF_VALVE_DX = 2.9;
const NEGATIVE_RELIEF = { x: 394.5, y: AFT_PRESSURE_BULKHEAD_Y - 12.5 };

/**
 * Outflow valve: skin-mounted door in its frame, swung open as far as the
 * pressurization panel drives it, its frame coloured while cabin air leaves
 * through it.
 */
function OutflowValve({ supplied }: { supplied: boolean }) {
  const { position, mode } = useOutflowValve();
  const flowing = supplied && position > 0;
  const percent = Math.round(position * 100);
  return (
    <g transform={`translate(${OUTFLOW_VALVE.x} ${OUTFLOW_VALVE.y})`}>
      <title>{`Outflow valve · ${percent === 0 ? "CERRADA" : `ABIERTA ${percent} %`} · ${mode}${flowing ? "" : " · sin flujo de cabina"}`}</title>
      <rect x="-1.5" y="-1.5" width="3" height="3" rx="0.6" className="fill-sim-surface stroke-white" strokeWidth="0.45" />
      {flowing && (
        <rect x="-0.95" y="-0.95" width="1.9" height="1.9" rx="0.3" fill="none" stroke={getTemperatureColor(T.cabin)} strokeWidth="0.3" />
      )}
      {/* Door hinged on its forward edge, swinging outboard as it opens */}
      <line
        x1="0"
        y1="-1.1"
        x2="0"
        y2="1.1"
        className={position > 0 ? "stroke-white" : "stroke-zinc-400"}
        strokeWidth="0.45"
        strokeLinecap="round"
        transform={`rotate(${-35 * position} 0 -1.1)`}
      />
    </g>
  );
}

/** Positive pressure relief valve: slot with its poppet, closed (relieves above 9.1 psi). */
function PressureReliefValve({ x, title }: { x: number; title: string }) {
  return (
    <g transform={`translate(${x} ${OUTFLOW_VALVE.y})`}>
      <title>{`${title} · CERRADA (alivia a 9,1 psi de presión diferencial)`}</title>
      <rect x="-0.65" y="-1.3" width="1.3" height="2.6" rx="0.65" className="fill-sim-surface stroke-white" strokeWidth="0.4" />
      <circle r="0.32" className="fill-none stroke-zinc-400" strokeWidth="0.24" />
    </g>
  );
}

/**
 * Negative pressure relief valve: a plain skin door the outside air pushes
 * inward when it exceeds cabin pressure. Shown closed.
 */
function NegativeReliefValve() {
  return (
    <g transform={`translate(${NEGATIVE_RELIEF.x} ${NEGATIVE_RELIEF.y})`}>
      <title>Válvula de alivio de presión negativa · CERRADA (compuerta que se empuja hacia adentro si la presión exterior supera a la de cabina)</title>
      <rect x="-1" y="-1.3" width="2" height="2.6" rx="0.3" className="fill-sim-surface stroke-white" strokeWidth="0.4" />
      {/* Chevron pointing inboard: the way the door swings and air comes in */}
      <path d="M 0.2 -0.5 L -0.25 0 L 0.2 0.5" className="fill-none stroke-zinc-400" strokeWidth="0.24" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

function PressurizationValves() {
  const { manifoldOff } = useMixManifoldSupply();
  return (
    <g>
      <NegativeReliefValve />
      <PressureReliefValve x={OUTFLOW_VALVE.x + RELIEF_VALVE_DX} title="Válvula de alivio de presión positiva superior" />
      <OutflowValve supplied={!manifoldOff} />
      <PressureReliefValve x={OUTFLOW_VALVE.x - RELIEF_VALVE_DX} title="Válvula de alivio de presión positiva inferior" />
    </g>
  );
}

/**
 * Ground conditioned air connection: on the belly right under the mix
 * manifold, through its check valve, so in plan view it sits at the manifold
 * centre. Drawn like the network source markers; the cart is connected from
 * the GND COND button in the source controls.
 */
function GroundCartConnection() {
  const [connected] = useGroundCart();
  return (
    <g>
      <title>
        {`Conexión de aire acondicionado de tierra (al mix manifold por su check valve) · ${connected ? `CONECTADA · ${T.groundCart} °C` : "DESCONECTADA"}`}
      </title>
      <circle
        r="1.54"
        fill={connected ? getTemperatureColor(T.groundCart) : "#3f3f46"}
        stroke="#090d16"
        strokeWidth="0.35"
      />
    </g>
  );
}

/** Ram inlet door on the fuselage skin. Click toggles it (mockup only). */
function RamDoor({ side }: { side: "L" | "R" }) {
  const [open, toggle] = useRamDoor(side);
  const { noseY, aftY, noseHalfWidth: n, inboardX, outboardX } = RAM_INLET;
  const cx = (inboardX + outboardX) / 2;
  // Vertical tangents at both ends give one smooth S per side: concave at the
  // nose, convex at the aft corners.
  const midY = (noseY + aftY) / 2;
  const outline = [
    `M ${cx - n} ${noseY} C ${cx - n} ${midY} ${inboardX} ${midY} ${inboardX} ${aftY}`,
    `L ${outboardX} ${aftY} C ${outboardX} ${midY} ${cx + n} ${midY} ${cx + n} ${noseY}`,
  ].join(" ");
  return (
    <g
      className="cursor-pointer"
      role="button"
      aria-pressed={open}
      aria-label={`Ram air inlet door ${side}: ${open ? "abierta" : "cerrada"}`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        toggle();
      }}
    >
      <title>{`Ram air inlet door ${side} · ${open ? "ABIERTA" : "CERRADA"} (clic para ${open ? "cerrar" : "abrir"})`}</title>
      {/* Inlet outline, closed at the nose, with a straight edge across at the inflection... */}
      <path
        d={`${outline} Z`}
        className="fill-sim-surface stroke-white"
        strokeWidth="0.55"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <line
        x1={(cx - n + inboardX) / 2}
        y1={midY}
        x2={(cx + n + outboardX) / 2}
        y2={midY}
        className="stroke-white"
        strokeWidth="0.55"
        strokeLinecap="round"
      />
      {/* ...and the deflector plate inside, sliding between its closed and open positions */}
      <line
        x1={cx - RAM_PLATE.halfWidth}
        y1={RAM_PLATE.closedY}
        x2={cx + RAM_PLATE.halfWidth}
        y2={RAM_PLATE.closedY}
        className="stroke-white"
        strokeWidth="0.6"
        strokeLinecap="round"
        style={{
          transform: `translateY(${open ? RAM_PLATE.openY - RAM_PLATE.closedY : 0}px) scaleX(${open ? RAM_PLATE.openStretch : 1})`,
          transformBox: "fill-box",
          transformOrigin: "center",
          transition: "transform 0.45s ease-in-out",
        }}
      />
      {/* Generous hit area */}
      <rect x={inboardX - 1} y={noseY - 1} width={outboardX - inboardX + 2} height={aftY - noseY + 2} fill="transparent" />
    </g>
  );
}

/** Drawn after the fuselage outline, on top of the plan view. */
export function RamDoorsLayer() {
  return (
    <g data-mockup="ram-doors">
      <RamDoor side="R" />
      <g transform={MIRROR_TRANSFORM}>
        <RamDoor side="L" />
      </g>
    </g>
  );
}
