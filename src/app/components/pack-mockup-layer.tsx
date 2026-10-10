"use client";

// TEMPORARY visual mockup of the air conditioning packs (3-wheel ACM) drawn
// over the plan view, in the same visual language as PneumaticNetworkLayer.
// Layout follows the 737 AIR-COND / PNEUMATIC reference schematic: both heat
// exchangers sit inside the ram air inlet, the ACM shaft runs fore-aft.
// No simulation logic: colours use illustrative station temperatures.

import { useSyncExternalStore } from "react";
import { PNEUMATIC_NODE } from "../simulation/pneumatic/main-network";
import { usePneumatic } from "../simulation/pneumatic/pneumatic-context";
import { getTemperatureColor } from "../simulation/pneumatic/types";

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

type P = [number, number];

// Illustrative temperatures along the cycle (°C)
const T = {
  bleed: 160,
  hx1Out: 95,
  compOut: 170,
  hx2Out: 40,
  turbineOut: 2,
  ram: 15,
};

// Fore-aft shift of the pack set (packs and mix manifold) so the ram exhaust
// sits just forward of the main gear wheels. The layout constants below keep
// the original positions; the pack valves in the network moved by the same
// amount. The ram inlets stay at the wing root and reach the HX by a duct.
const PACKS_OFFSET_Y = 30;

// Right pack layout (network coordinates before PACKS_OFFSET_Y); the left pack
// mirrors it.
const HX_X = 402;
const HX2_Y = 215.1;
const HX1_Y = 220.1;
// Ram plenum walls around the HX stack
const PLENUM_TOP = HX2_Y - 3.5;
const PLENUM_BOTTOM = HX1_Y + 3.9;
const SHAFT_X = 391;
const TURBINE_Y = 206.5;
const COMPRESSOR_Y = 212.5;
const FAN_Y = 226.5;
const TCV_LANE_X = 386.2;
const MIX: P = [379.5, 196];

// Pack supply → HX1, hot TCV bypass to the turbine outlet, turbine → mix manifold
const BLEED_IN: P[] = [[397, 240], [397, HX1_Y + 1.2], [400, HX1_Y + 1.2]];
const TCV_BYPASS: P[] = [[397, 234], [TCV_LANE_X, 234], [TCV_LANE_X, 202], [SHAFT_X, 202]];
const TURBINE_OUT: P[] = [[SHAFT_X, 204.5], [SHAFT_X, 200.5], [MIX[0] + 2, MIX[1] + 0.6]];

/** Duct drawn like the network links: dark casing + coloured core. */
function Duct({
  points,
  temp,
  inactive = false,
  part = "both",
}: {
  points: P[];
  temp: number;
  inactive?: boolean;
  /** Tees draw every casing first, then every core, so no casing cuts a core. */
  part?: "both" | "casing" | "core";
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
  title,
}: {
  y: number;
  wideAt: "top" | "bottom";
  temp: number;
  title: string;
}) {
  const s = wideAt === "top" ? -1 : 1;
  const outer = `M -2.4 ${2 * s} L 2.4 ${2 * s} L 1 ${-2 * s} L -1 ${-2 * s} Z`;
  const inner = `M -1.85 ${1.6 * s} L 1.85 ${1.6 * s} L 0.7 ${-1.6 * s} L -0.7 ${-1.6 * s} Z`;
  return (
    <g transform={`translate(${SHAFT_X} ${y})`}>
      <title>{title}</title>
      <path d={outer} className="fill-sim-surface stroke-white" strokeWidth="0.45" strokeLinejoin="round" />
      <path d={inner} fill="none" stroke={getTemperatureColor(temp)} strokeWidth="0.32" />
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

function Fan({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <title>Fan de la ACM (aspira ram air a través de los HX)</title>
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

function WaterSeparator({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <title>Separador de agua de alta presión</title>
      <rect x="-2.2" y="-1.4" width="4.4" height="2.8" rx="1.2" className="fill-sim-surface stroke-white" strokeWidth="0.55" />
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
    </g>
  );
}

/** Network modulating-valve symbol. `angle` 0 = horizontal duct. */
function ModulatingValve({
  x,
  y,
  angle = 0,
  title,
}: {
  x: number;
  y: number;
  angle?: number;
  title: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <title>{title}</title>
      <path d="M -2.4 -0.7 A 2.5 2.5 0 0 1 2.4 -0.7 Z" className="fill-sim-surface stroke-white" strokeWidth="0.55" />
      <path d="M -2.4 0.7 A 2.5 2.5 0 0 0 2.4 0.7 Z" className="fill-sim-surface stroke-white" strokeWidth="0.55" />
      <line
        x1="-2.1"
        y1="0"
        x2="2.1"
        y2="0"
        className="stroke-white"
        strokeWidth="0.85"
        strokeLinecap="round"
        transform="rotate(35)"
      />
      <circle r="0.5" className="fill-sim-surface stroke-white" strokeWidth="0.4" />
    </g>
  );
}

// Ram inlet opening in the fuselage skin at the wing root (absolute
// coordinates: the doors are not shifted with the packs).
const OPENING_TOP = 215.4;
const OPENING_BOTTOM = 220.6;
const SKIN_X = 405;

/**
 * Ram air plenum inside the fuselage that holds both heat exchangers, fed by
 * a duct from the inlet opening at the wing root. Drawn in pack coordinates,
 * so the inlet end sits PACKS_OFFSET_Y forward of its absolute position.
 */
function RamPlenum({ ramOff }: { ramOff: boolean }) {
  const top = OPENING_TOP - PACKS_OFFSET_Y;
  const bottom = OPENING_BOTTOM - PACKS_OFFSET_Y;
  const outline = [
    // Inlet scoop, full opening width at the skin
    `M 404.4 ${top} L 399.2 ${top} L 399.2 ${bottom + 1.3}`,
    // Narrower ram duct down to the plenum
    `L 400 ${bottom + 2.8} L 400 ${PLENUM_TOP} L 399.2 ${PLENUM_TOP}`,
    // Plenum around HX2 and HX1
    `L 399.2 ${PLENUM_BOTTOM} L 404.4 ${PLENUM_BOTTOM} L 404.4 ${PLENUM_TOP} L 403.6 ${PLENUM_TOP}`,
    `L 403.6 ${bottom + 2.8} L 404.4 ${bottom + 1.3} L 404.4 ${bottom}`,
  ].join(" ");
  return (
    <g>
      <title>Ram air duct y plenum con HX secundario y primario</title>
      <path d={`${outline} Z`} className="fill-sim-surface" />
      <path
        d={outline}
        className="fill-none stroke-white"
        strokeWidth="0.55"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Duct
        points={[[SKIN_X, (top + bottom) / 2], [401.8, (top + bottom) / 2], [401.8, PLENUM_TOP + 0.8]]}
        temp={T.ram}
        inactive={ramOff}
        part="core"
      />
    </g>
  );
}

/** Network on/off valve symbol on the vertical pack supply duct. */
function PackValve({ open }: { open: boolean }) {
  return (
    <g transform="translate(397 240) rotate(-90)">
      <title>{`Pack valve · ${open ? "Abierta" : "Cerrada"}`}</title>
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

function RamExhaust({ x, y, angle = 0 }: { x: number; y: number; angle?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(1.05)`}>
      <title>Salida de ram air (louvers)</title>
      <rect x="-1.6" y="-1.3" width="3.2" height="2.6" rx="0.4" className="fill-sim-surface stroke-white" strokeWidth="0.45" />
      {[-0.75, -0.15, 0.45, 1.05].map((ly) => (
        <line key={ly} x1="-1" y1={ly - 0.3} x2="1" y2={ly + 0.2} className="stroke-zinc-300" strokeWidth="0.28" />
      ))}
    </g>
  );
}

/** Right pack, in network coordinates. The left pack is its mirror image. */
function RightPack({ side }: { side: "L" | "R" }) {
  const [doorOpen] = useRamDoor(side);
  const { solution, runtimeState } = usePneumatic();

  // Real bleed supply at the pack valve; everything downstream is illustrative.
  const packValveId = side === "R" ? PNEUMATIC_NODE.rPackValve : PNEUMATIC_NODE.lPackValve;
  const supply = solution.nodes[packValveId];
  const packValveOpen = runtimeState.accessories[packValveId]?.open ?? false;
  const packOff = !packValveOpen || !supply?.energized || supply.pressurePsi <= 0;
  const bleedTemp = supply?.temperatureC ?? T.bleed;
  const ramOff = packOff || !doorOpen;

  return (
    <g>
      {/* Hide the current "Pack R" block and the duct above the pack valve */}
      <rect x="381.2" y="202" width="20.2" height="12.6" className="fill-sim-surface" />
      <rect x="381.2" y="214.6" width="18" height="23" className="fill-sim-surface" />

      {/* Ram air: from the bottom of the HX stack straight into the side of the ACM fan... */}
      <Duct
        points={[[HX_X, HX1_Y + 2.5], [HX_X, FAN_Y], [SHAFT_X + 1.8, FAN_Y]]}
        temp={T.ram}
        inactive={ramOff}
      />
      {/* ...then aft to the louvers, across the hot TCV bypass */}
      <Duct points={[[SHAFT_X, FAN_Y + 1.8], [SHAFT_X, 240.6]]} temp={T.ram} inactive={ramOff} />
      <RamExhaust x={SHAFT_X} y={242} />

      {/* Pack supply, TCV bypass and turbine outlet meet at two tees */}
      {(["casing", "core"] as const).map((part) => (
        <g key={part}>
          <Duct points={BLEED_IN} temp={bleedTemp} inactive={packOff} part={part} />
          <Duct points={TCV_BYPASS} temp={bleedTemp} inactive={packOff} part={part} />
          <Duct points={TURBINE_OUT} temp={T.turbineOut} inactive={packOff} part={part} />
        </g>
      ))}
      <Junction x={397} y={234} temp={bleedTemp} inactive={packOff} />
      <Junction x={SHAFT_X} y={202} temp={T.turbineOut} inactive={packOff} />
      {/* HX1 → compressor */}
      <Duct points={[[400, HX1_Y - 1.2], [395, HX1_Y - 1.2], [395, 213.8], [393.3, 213.8]]} temp={T.hx1Out} inactive={packOff} />
      {/* Compressor → HX2 */}
      <Duct points={[[392.3, 211.2], [396.6, 211.2], [396.6, HX2_Y + 1.2], [400, HX2_Y + 1.2]]} temp={T.compOut} inactive={packOff} />
      {/* HX2 → water separator → turbine */}
      <Duct points={[[400, HX2_Y - 1.2], [398.2, HX2_Y - 1.2], [398.2, 205.6]]} temp={T.hx2Out} inactive={packOff} />
      <Duct points={[[393.8, 205.6], [393.1, 205.6]]} temp={T.hx2Out - 5} inactive={packOff} />

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
        className="stroke-zinc-400"
        strokeWidth="0.6"
        strokeLinecap="round"
      />
      <Wheel y={TURBINE_Y} wideAt="top" temp={T.turbineOut} title="Turbina de la ACM" />
      <Wheel y={COMPRESSOR_Y} wideAt="bottom" temp={T.compOut} title="Compresor de la ACM" />
      <Fan x={SHAFT_X} y={FAN_Y} />

      <WaterSeparator x={396} y={205.6} />
      <ModulatingValve x={TCV_LANE_X} y={220.5} angle={90} title="Pack temperature control valve" />
      {/* Pack valve redrawn over the network one so the pack duct joins it cleanly */}
      <PackValve open={packValveOpen} />
    </g>
  );
}

export function PackMockupLayer() {
  return (
    <g data-mockup="packs" transform={`translate(0 ${PACKS_OFFSET_Y})`}>
      <RightPack side="R" />
      <g transform="translate(759 0) scale(-1 1)">
        <RightPack side="L" />
      </g>
      {/* Mix manifold, fed by both turbines */}
      <g transform={`translate(${MIX[0]} ${MIX[1]})`}>
        <title>Mix manifold</title>
        <circle r="4" className="fill-sim-surface stroke-white" strokeWidth="0.55" />
        <circle r="3.3" fill="none" stroke={getTemperatureColor(T.turbineOut)} strokeWidth="0.32" />
      </g>
    </g>
  );
}

/** Ram inlet door on the fuselage skin. Click toggles it (mockup only). */
function RamDoor({ side }: { side: "L" | "R" }) {
  const [open, toggle] = useRamDoor(side);
  const midY = (OPENING_TOP + OPENING_BOTTOM) / 2;
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
      {/* Cut the fuselage skin where the opening is */}
      <rect
        x={SKIN_X - 0.6}
        y={OPENING_TOP}
        width="1.2"
        height={OPENING_BOTTOM - OPENING_TOP}
        className="fill-sim-surface"
      />
      {/* Opening lips */}
      {[OPENING_TOP, OPENING_BOTTOM].map((y) => (
        <line key={y} x1={SKIN_X - 0.6} y1={y} x2={SKIN_X + 0.5} y2={y} className="stroke-white" strokeWidth="0.55" strokeLinecap="round" />
      ))}
      {/* Incoming air */}
      <g
        className="stroke-sky-400 fill-none transition-opacity duration-300"
        opacity={open ? 0.9 : 0}
        strokeWidth="0.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {[407.2, 409].map((x) => (
          <polyline key={x} points={`${x + 0.8},${midY - 0.8} ${x},${midY} ${x + 0.8},${midY + 0.8}`} />
        ))}
      </g>
      {/* Door, hinged at the forward lip, swings outboard when open */}
      <g transform={`translate(${SKIN_X} ${OPENING_TOP})`}>
        <line
          x1="0"
          y1="0"
          x2="0"
          y2={OPENING_BOTTOM - OPENING_TOP}
          className="stroke-white"
          strokeWidth="0.75"
          strokeLinecap="round"
          style={{
            transform: open ? "rotate(-38deg)" : "rotate(0deg)",
            transformOrigin: "0 0",
            transition: "transform 0.45s ease-in-out",
          }}
        />
        <circle r="0.45" className="fill-white" />
      </g>
      {/* Generous hit area */}
      <rect x={SKIN_X - 1.5} y={OPENING_TOP - 1.5} width="7" height="8.5" fill="transparent" />
    </g>
  );
}

/** Drawn after the fuselage outline so the doors can cut the skin. */
export function RamDoorsLayer() {
  return (
    <g data-mockup="ram-doors">
      <RamDoor side="R" />
      <g transform="translate(759 0) scale(-1 1)">
        <RamDoor side="L" />
      </g>
    </g>
  );
}
