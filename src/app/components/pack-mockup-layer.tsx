"use client";

// TEMPORARY visual mockup of the air conditioning packs (3-wheel ACM) drawn
// over the plan view, in the same visual language as PneumaticNetworkLayer.
// Layout follows the 737 AIR-COND / PNEUMATIC reference schematic: both heat
// exchangers sit inside the ram air inlet, the ACM shaft runs fore-aft.
// No simulation logic: colours use illustrative station temperatures.

import { useSyncExternalStore } from "react";
import { PNEUMATIC_NODE } from "../simulation/pneumatic/main-network";
import { usePneumatic } from "../simulation/pneumatic/pneumatic-context";
import { recircFansRunning } from "../simulation/ecs/recirc-fans";
import type { TrimZone } from "../simulation/pneumatic/runtime-state";
import { getTemperatureColor } from "../simulation/pneumatic/types";
import { AC_DIST_BAY_Y, AFT_PRESSURE_BULKHEAD_Y } from "./lower-lobe-layer";
import { VALVE_SCALE } from "./pneumatic-network-layer";

// Mockup-only ram door state, shared by the pack layer and the door layer.
const ramDoorStore: Record<"L" | "R", boolean> = { L: true, R: true };
const ramDoorListeners = new Set<() => void>();
const subscribeRamDoors = (listener: () => void) => {
  ramDoorListeners.add(listener);
  return () => ramDoorListeners.delete(listener);
};
function useRamDoor(side: "L" | "R") {
  const open = useSyncExternalStore(
    subscribeRamDoors,
    () => ramDoorStore[side],
    () => true,
  );
  const toggle = () => {
    ramDoorStore[side] = !ramDoorStore[side];
    ramDoorListeners.forEach((listener) => listener());
  };
  return [open, toggle] as const;
}

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

type P = [number, number];

// Illustrative temperatures along the cycle (°C)
const T = {
  bleed: 160,
  hx1Out: 95,
  compOut: 170,
  hx2Out: 40,
  turbineOut: 2,
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
const HX_X = 401.5;
const HX2_Y = 215.1;
const HX1_Y = 220.1;
// Each HX symbol is a 7.6 x 5.2 rect turned 90° and scaled (0.66, 0.85)
const HX_HALF = { across: 2.6 * 0.85, along: 3.8 * 0.66 };
// Ram plenum walls exactly on the outline of the HX stack, so they overlap
const PLENUM_TOP = HX2_Y - HX_HALF.along;
const PLENUM_BOTTOM = HX1_Y + HX_HALF.along;
const PLENUM_X = { inboard: HX_X - HX_HALF.across, outboard: HX_X + HX_HALF.across };
const SHAFT_X = 394;
const TURBINE_Y = 206.5;
// Compressor level with the HX ports it joins: HX1 outlet below, HX2 inlet above
const COMPRESSOR_Y = (HX2_Y + HX1_Y) / 2;
const FAN_Y = 226.5;
const TCV_LANE_X = SHAFT_X - 4.8;
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
// Vertical water separator on the HX2 outlet lane
const WS_X = 398.2;
const WS_Y = 209;
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
const BLEED_IN: P[] = [[SUPPLY_X, PACK_VALVE_Y], [SUPPLY_X, HX1_Y + 1.2], [400, HX1_Y + 1.2]];
const TCV_TEE_Y = 233.5;
const TCV_BYPASS: P[] = [[SUPPLY_X, TCV_TEE_Y], [TCV_LANE_X, TCV_TEE_Y], [TCV_LANE_X, 202], [SHAFT_X, 202]];
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
// Turbine outlet: aft of the manifold, then into it on the X diagonal.
const TURBINE_OUT_Y = 198;
// Split at the corner, where the left side tees off the flight deck supply:
// with the left pack off, mix manifold air still reaches the flight deck
// through the downstream part.
const TURBINE_OUT_UPSTREAM: P[] = [
  [SHAFT_X, 204.5],
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
  /** Ceiling-level duct: dashed core, drawn over the floor ducts it crosses. */
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
    <g transform={`translate(${x} ${y}) rotate(90) scale(0.66 0.85)`}>
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

function WaterSeparator({ x, y, inactive }: { x: number; y: number; inactive: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(90)`}>
      <title>Separador de agua de alta presión</title>
      <rect x="-2.2" y="-1.4" width="4.4" height="2.8" rx="1.2" className="fill-sim-surface stroke-white" strokeWidth="0.55" />
      {!inactive && (
        <rect
          x="-1.65"
          y="-0.85"
          width="3.3"
          height="1.7"
          rx="0.7"
          fill="none"
          stroke={getTemperatureColor(T.hx2Out)}
          strokeWidth="0.32"
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
  const outletTemp = packOff ? T.mix : T.turbineOut;

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
          <Duct points={TURBINE_OUT_UPSTREAM} temp={T.turbineOut} inactive={packOff} part={part} />
          <Duct points={TURBINE_OUT_DOWNSTREAM} temp={outletTemp} inactive={outletOff} part={part} />
        </g>
      ))}
      <Junction x={SUPPLY_X} y={TCV_TEE_Y} temp={bleedTemp} inactive={packOff} />
      <Junction x={TCV_LANE_X} y={STBY_TCV.topY} temp={bleedTemp} inactive={packOff} />
      <Junction x={TCV_LANE_X} y={STBY_TCV.bottomY} temp={bleedTemp} inactive={packOff} />
      <Junction x={SUPPLY_X} y={TRIM_TAP_Y} temp={bleedTemp} inactive={packOff} />
      <CheckValve x={TRIM_CHECK_X} y={TRIM_TAP_Y} angle={180} title="Check valve de suministro de trim air" />
      <Junction x={SHAFT_X} y={202} temp={T.turbineOut} inactive={packOff} />
      {/* HX1 → compressor and compressor → HX2, straight across at the compressor level */}
      <Duct points={[[400, HX1_Y - 1.2], [SHAFT_X + 2.1, HX1_Y - 1.2]]} temp={T.hx1Out} inactive={packOff} />
      <Duct points={[[SHAFT_X + 1.2, HX2_Y + 1.2], [400, HX2_Y + 1.2]]} temp={T.compOut} inactive={packOff} />
      {/* HX2 → water separator (vertical) → turbine */}
      <Duct points={[[400, HX2_Y - 1.2], [WS_X, HX2_Y - 1.2], [WS_X, WS_Y + 2]]} temp={T.hx2Out} inactive={packOff} />
      <Duct points={[[WS_X, WS_Y - 2], [WS_X, TURBINE_Y - 1], [SHAFT_X + 1.5, TURBINE_Y - 1]]} temp={T.hx2Out - 5} inactive={packOff} />

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
      <Wheel y={TURBINE_Y} wideAt="top" temp={T.turbineOut} inactive={packOff} title="Turbina de la ACM" />
      <Wheel y={COMPRESSOR_Y} wideAt="bottom" temp={T.compOut} inactive={packOff} title="Compresor de la ACM" />
      <Fan x={SHAFT_X} y={FAN_Y} />

      <WaterSeparator x={WS_X} y={WS_Y} inactive={packOff} />
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

/** Air outlet (floor / overhead diffuser): small grille. */
function Diffuser({ x, y, title }: { x: number; y: number; title: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <title>{title}</title>
      <rect x="-1.3" y="-0.8" width="2.6" height="1.6" rx="0.3" className="fill-sim-surface stroke-white" strokeWidth="0.4" />
      {[-0.55, 0, 0.55].map((lx) => (
        <line key={lx} x1={lx} y1="-0.45" x2={lx} y2="0.45" className="stroke-zinc-300" strokeWidth="0.24" strokeLinecap="round" />
      ))}
    </g>
  );
}

/** Pilot foot-warming / windshield defog valve behind the rudder pedals. */
function DualPurposeValve({ x, y, title }: { x: number; y: number; title: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${VALVE_SCALE})`}>
      <title>{title}</title>
      <circle r="1.3" className="fill-sim-surface stroke-white" strokeWidth="0.45" />
      <line x1="-1.2" y1="0" x2="1.2" y2="0" className="stroke-white" strokeWidth="0.55" strokeLinecap="round" />
      <circle r="0.32" className="fill-sim-surface stroke-white" strokeWidth="0.28" />
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
const OVERHEAD_DIFFUSER_X = { left: 365, right: 394 };
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
// Overhead duct towards the aft cabin: off the aft risers' ceiling duct, just
// left of the centerline (which the trim air column takes), to the aft end
// of the cabin.
const OVERHEAD_AFT = { x: CENTERLINE_X - 3, endY: AFT_PRESSURE_BULKHEAD_Y - 6 };

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
  const fdTemp = left.packOff ? T.mix : T.turbineOut;

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

      {/* Flight deck outlets */}
      {(["casing", "core"] as const).map((part) => (
        <g key={part}>
          <Duct
            points={[
              [OVERHEAD_DIFFUSER_X.left, 76.8],
              [OVERHEAD_DIFFUSER_X.left, FD_HEADER_Y],
              [OVERHEAD_DIFFUSER_X.right, FD_HEADER_Y],
              [OVERHEAD_DIFFUSER_X.right, 76.8],
            ]}
            temp={fdTemp}
            inactive={manifoldOff}
            part={part}
          />
          <Duct points={[[PILOT_X.capt, FD_HEADER_Y], [PILOT_X.capt, 66]]} temp={fdTemp} inactive={manifoldOff} part={part} />
          <Duct points={[[PILOT_X.fo, FD_HEADER_Y], [PILOT_X.fo, 66]]} temp={fdTemp} inactive={manifoldOff} part={part} />
        </g>
      ))}
      <Duct points={[FD_TEE, [FD_X, FD_HEADER_Y]]} temp={fdTemp} inactive={manifoldOff} part="core" />
      {[FD_X, PILOT_X.capt, PILOT_X.fo].map((x) => (
        <Junction key={x} x={x} y={FD_HEADER_Y} temp={fdTemp} inactive={manifoldOff} />
      ))}
      <Diffuser x={OVERHEAD_DIFFUSER_X.left} y={76.6} title="Difusor de techo del flight deck (detrás de la ventana No. 3 izq.)" />
      <Diffuser x={OVERHEAD_DIFFUSER_X.right} y={76.6} title="Difusor de techo del flight deck (detrás de la ventana No. 3 der.)" />
      <Diffuser x={PILOT_X.capt} y={71.5} title="Difusor de piso bajo el asiento del Captain" />
      <Diffuser x={PILOT_X.fo} y={71.5} title="Difusor de piso bajo el asiento del First Officer" />
      <DualPurposeValve x={PILOT_X.capt} y={66} title="Válvula de pies / desempañado del Captain (detrás de los pedales)" />
      <DualPurposeValve x={PILOT_X.fo} y={66} title="Válvula de pies / desempañado del First Officer (detrás de los pedales)" />

      {/* Overhead distribution duct at ceiling level, fed by the risers */}
      <Duct
        points={[[MIX_ABS[0], OVERHEAD_FWD_Y], [MIX_ABS[0], FWD_RISER.ceilingY]]}
        temp={T.mix}
        inactive={manifoldOff}
        part="core"
        dashed
      />
      <Duct
        points={[[RISER_X.left, AFT_RISER.ceilingY], [RISER_X.right, AFT_RISER.ceilingY]]}
        temp={T.mix}
        inactive={manifoldOff}
        part="core"
        dashed
      />
      <Duct
        points={[[RISER_X.left, FWD_RISER.ceilingY], [MIX_ABS[0], FWD_RISER.ceilingY]]}
        temp={T.mix}
        inactive={manifoldOff}
        part="core"
        dashed
      />
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
  flightDeckJoinY: 225,
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
 * Overhead duct towards the aft cabin. A separate layer drawn under the
 * pneumatic network, so it stays behind the network's blocks it runs past.
 */
export function OverheadAftDuctLayer() {
  const { manifoldOff } = useMixManifoldSupply();
  return (
    <Duct
      points={[[OVERHEAD_AFT.x, AFT_RISER.ceilingY], [OVERHEAD_AFT.x, OVERHEAD_AFT.endY]]}
      temp={T.mix}
      inactive={manifoldOff}
      part="core"
      dashed
    />
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
        temp={left.packOff ? T.mix : T.turbineOut}
        inactive={manifoldOff}
      />
      <TrimAirJoins />
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
