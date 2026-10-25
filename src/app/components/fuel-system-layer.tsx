"use client";

// Fuel system (FCOM 12.20) in the plan view, in the same visual language as
// the pneumatic network and the fire protection layer. Geometry comes from the
// diagram of ../combustible (diagramas/generar_diagrama.py), drawn in this
// same frame: wing box between the spars, rib 5 / 22 / 25 tank limits
// (estimated), equipment locations from the NG maintenance course (JCT-0151)
// and the FCOM schematic 12.20.5:
//   - main tanks: FWD pump on the front spar, AFT pump on the rear spar, the
//     engine bypass (suction) valve, rib 8 baffle check valves
//   - center tank: L and R pumps on the rear spar (front wall of the main
//     wheel well), crossfeed valve on the rear spar right of the centerline
//   - spar valves on the front spar outboard of each strut, engine fuel
//     shutoff valve and fuel filter on the engine
//   - APU line from the left manifold through the APU fuel shutoff valve (rear
//     spar, left wheel well) to the tailcone, APU bypass valve in tank No. 1
//   - scavenge jet pump on the left front spar, driven by the No. 1 FWD pump
//   - fueling station under the right wing leading edge (receptacle, fueling
//     valves, diffuser to tank No. 2) and the manual defueling valve outboard
//     of engine No. 2
//   - vents to the surge tanks and the NACA scoops, NGS in the pack bay
// Line routes between documented ends are illustrative. Everything here reads
// and writes the fuel context only.

import { useEffect, type RefObject } from "react";
import { useFuel } from "../simulation/fuel/fuel-context";
import { MAIN_PNEUMATIC_SYSTEM, PNEUMATIC_NODE } from "../simulation/pneumatic/main-network";
import { usePneumatic } from "../simulation/pneumatic/pneumatic-context";
import { getTemperatureColor } from "../simulation/pneumatic/types";
import {
  ENGINE_SIDE,
  PUMPS,
  type FuelIndications,
  type FuelSystemState,
  TANK_CAPACITY_KG,
  type CenterPumpId,
  type FeedKind,
  type FeedSide,
  type MotorValveId,
  type NgsStatus,
  type PumpId,
  type TankId,
} from "../simulation/fuel/fuel-system";
import type { EngineId } from "../simulation/fire/fire-protection";
import { FuelingPanel, FUELING_PANEL_SIZE, NgsIndicator, NGS_INDICATOR_SIZE } from "./aircraft-panels";
import {
  AMBER,
  controlProps,
  mirrorX,
  ShutoffValve,
  TinyLabel,
  toPath,
  type P,
} from "./plan-view-glyphs";
import { PlanViewPopover, type PlanView } from "./plan-view-popover";

// ---------------------------------------------------------------------------
// Geometry (metres: s = distance from the centerline, c = aft of the nose)

const U = 13.3;
const SIDE_OF_BODY = 1.88; // rib 1
const RIB5 = 3.4;
const RIB8 = 5.27;
const RIB22 = 14.0;
const RIB25 = 15.7;
const X = (s: number) => 380 + s * U;
const Y = (c: number) => 30 + c * U;
/** Front spar at 15 % and rear spar at 65 % of the local chord. */
const frontSparY = (s: number) => Y(15.88 + 0.501 * Math.max(Math.abs(s) - SIDE_OF_BODY, 0));
const rearSparY = (s: number) => Y(18.42 + 0.382 * Math.max(Math.abs(s) - SIDE_OF_BODY, 0));
/** Left side geometry, mirrored for the right side. */
const onSide = (side: FeedSide, [x, y]: P): P => (side === "left" ? [x, y] : [mirrorX(x), y]);
const r2 = (n: number) => Math.round(n * 100) / 100;
const pt = (x: number, y: number): P => [r2(x), r2(y)];

/** Wing box between the spars from |s0| to |s1| (left wing). */
function wingBox(s0: number, s1: number): P[] {
  const knots = [s0, ...(s0 < SIDE_OF_BODY && SIDE_OF_BODY < s1 ? [SIDE_OF_BODY] : []), s1];
  return [
    ...knots.map((k) => pt(X(-k), frontSparY(k))),
    ...[...knots].reverse().map((k) => pt(X(-k), rearSparY(k))),
  ];
}

const TANK_SHAPES: Record<TankId, P[]> = {
  tank1: wingBox(RIB5, RIB22),
  tank2: wingBox(RIB5, RIB22).map(([x, y]) => pt(mirrorX(x), y)),
  center: [
    pt(X(-RIB5), frontSparY(RIB5)),
    pt(X(-SIDE_OF_BODY), frontSparY(0)),
    pt(X(SIDE_OF_BODY), frontSparY(0)),
    pt(X(RIB5), frontSparY(RIB5)),
    pt(X(RIB5), rearSparY(RIB5)),
    pt(X(SIDE_OF_BODY), rearSparY(0)),
    pt(X(-SIDE_OF_BODY), rearSparY(0)),
    pt(X(-RIB5), rearSparY(RIB5)),
  ],
};
const SURGE_SHAPE = wingBox(RIB22, RIB25);
/** Surge tank label: outboard of the vent line to the NACA scoop, midway between the spars. */
const SURGE_LABEL_S = 15.2;
const surgeLabelAt = (side: FeedSide): P =>
  onSide(side, pt(X(-SURGE_LABEL_S), (frontSparY(SURGE_LABEL_S) + rearSparY(SURGE_LABEL_S)) / 2));

// Feed manifolds: the wing runs at y 272, the center tank run at y 260
const WING_MANIFOLD_Y = 272;
const CENTER_MANIFOLD_Y = 260;
const SPAR_VALVE_S = SIDE_OF_BODY + ((WING_MANIFOLD_Y - 30) / U - 15.88) / 0.501;
const LEFT = {
  sparValve: pt(X(-SPAR_VALVE_S), WING_MANIFOLD_Y),
  fwdPump: pt(X(-4.3), frontSparY(4.3) + 4.4),
  aftPump: pt(X(-4.6), rearSparY(4.6) - 3.3),
  bypass: pt(X(-5.8), 278),
  ctrPump: pt(X(-1.15), rearSparY(0) - 3.2),
  elbowOut: pt(X(-2.8), WING_MANIFOLD_Y),
  elbowIn: pt(X(-2.35), CENTER_MANIFOLD_Y),
  apuTee: pt(X(-3.1), WING_MANIFOLD_Y),
};
const CROSSFEED_VALVE: P = [388, CENTER_MANIFOLD_Y];
const PUMP_AT: Record<PumpId, P> = {
  aft1: LEFT.aftPump,
  fwd1: LEFT.fwdPump,
  ctrL: LEFT.ctrPump,
  ctrR: onSide("right", LEFT.ctrPump),
  fwd2: onSide("right", LEFT.fwdPump),
  aft2: onSide("right", LEFT.aftPump),
};

// Engine supply: spar valve → strut → engine fuel shutoff valve on the engine
const ENGINE_FUEL_LINE_X = 309;
/** Engine fuel shutoff valve on the engine, and the engine fuel filter. */
const ENGINE_VALVE: P = [ENGINE_FUEL_LINE_X, 225];
const ENGINE_FILTER: P = [ENGINE_FUEL_LINE_X, 231.5];
/** Fuel line inside the engine: past the filter to the shutoff valve, then to the nozzles. */
const FILTER_TO_VALVE: P[] = [[ENGINE_FUEL_LINE_X, ENGINE_FILTER[1] - 0.9], [ENGINE_FUEL_LINE_X, ENGINE_VALVE[1] + 1]];
const VALVE_TO_NOZZLES: P[] = [[ENGINE_FUEL_LINE_X, ENGINE_VALVE[1] - 1], [ENGINE_FUEL_LINE_X, 219]];
const ENGINE_LINE: P[] = [
  LEFT.sparValve,
  [LEFT.sparValve[0], 250],
  [ENGINE_FUEL_LINE_X, 244.5],
  [ENGINE_FUEL_LINE_X, ENGINE_VALVE[1] - 2],
];

/** Spar fuel shutoff valve of an engine, shared with the fire layer. */
export const sparValveAt = (engine: EngineId): P => onSide(ENGINE_SIDE[engine], LEFT.sparValve);
/** Engine fuel shutoff valve of an engine, shared with the fire layer. */
export const engineFuelValveAt = (engine: EngineId): P => onSide(ENGINE_SIDE[engine], ENGINE_VALVE);
/** Spar valve to engine supply line, shared with the fire layer. */
export const engineFuelLine = (engine: EngineId): P[] =>
  ENGINE_LINE.map((p) => onSide(ENGINE_SIDE[engine], p));

// APU: left manifold → check → (APU bypass joins) → APU fuel shutoff valve on
// the rear spar → along the left side of the fuselage to the tailcone
/** APU fuel shutoff valve, shared with the fire layer. */
export const APU_FUEL_SHUTOFF_VALVE_AT: P = pt(LEFT.apuTee[0], rearSparY(3.1) + 4);
const APU_CHECK: P = [LEFT.apuTee[0], 274.6];
const APU_BYPASS_IN: P = pt(X(-3.62), 279);
const APU_LINE_X = 364;
/** APU fuel line from the shutoff valve to the APU, shared with the fire layer. */
export const APU_FUEL_LINE: P[] = [
  APU_FUEL_SHUTOFF_VALVE_AT,
  [LEFT.apuTee[0], 294],
  [APU_LINE_X, 306],
  [APU_LINE_X, 488],
  [375.6, 494.6],
  [375.6, 503.6],
];

// Scavenge jet pump on the left front spar, inside tank No. 1: the motive
// flow from the FWD 1 pump enters through the nozzle (inboard end), draws
// center tank fuel in from the side and leaves through the diffuser
// (outboard end) into the tank
const JET_PUMP: P = pt(X(-3.65), 262);
const JET_HALF_LENGTH = 1.08;
const SCAVENGE_INLET: P = [372, 268];
const SCAVENGE_SUCTION: P[] = [
  SCAVENGE_INLET,
  [SCAVENGE_INLET[0], 255],
  [JET_PUMP[0] + 0.6, 255],
  [JET_PUMP[0] + 0.6, JET_PUMP[1] - 0.55],
];
const SCAVENGE_MOTIVE_Y = 265.2;
const SCAVENGE_MOTIVE: P[] = [
  [LEFT.fwdPump[0], SCAVENGE_MOTIVE_Y],
  [JET_PUMP[0] + 2.3, SCAVENGE_MOTIVE_Y],
  [JET_PUMP[0] + 2.3, JET_PUMP[1]],
  [JET_PUMP[0] + JET_HALF_LENGTH, JET_PUMP[1]],
];
const SCAVENGE_OUTLET: P = [JET_PUMP[0] - 2.6, JET_PUMP[1]];

// Fueling station under the right wing leading edge (D6-58325-7: 19.2 m aft
// of the nose, 7.7 m right of the centerline)
const RECEPTACLE: P = pt(X(7.7), Y(19.2));
const FUELING_VALVES_Y = RECEPTACLE[1] + 7;
const FUELING_HEADER_Y = FUELING_VALVES_Y - 3;
const FUELING_VALVE_X: Record<TankId, number> = {
  tank1: RECEPTACLE[0] - 2,
  center: RECEPTACLE[0] + 4.2,
  tank2: RECEPTACLE[0] + 10.4,
};
const TANK2_OUTLET: P = pt(X(9.3), rearSparY(9.3) - 4.5);
const DIFFUSER: P = [TANK2_OUTLET[0] + 3.5, FUELING_VALVES_Y + 6];
function fuelingLine(tank: TankId): P[] {
  const x = FUELING_VALVE_X[tank];
  if (tank === "tank2") {
    return [[x, FUELING_VALVES_Y + 2], [x, FUELING_VALVES_Y + 6], DIFFUSER, TANK2_OUTLET];
  }
  // Center and tank No. 1 lines run inboard aft of the rear spar
  const offset = tank === "center" ? 6 : 8.6;
  const route: P[] = [
    [x, FUELING_VALVES_Y + 2],
    [x, FUELING_VALVES_Y + offset + 4],
    ...[7, 5, SIDE_OF_BODY].map((k) => pt(X(k), rearSparY(k) + offset)),
  ];
  if (tank === "center") {
    return [...route, pt(X(0.5), rearSparY(0) + offset), pt(X(0.5), rearSparY(0) - 1.5)];
  }
  return [
    ...route,
    ...[SIDE_OF_BODY, 5, 8.8].map((k) => pt(X(-k), rearSparY(k) + offset)),
    pt(X(-8.8), rearSparY(8.8) - 4),
  ];
}
// Manual defueling valve on the right front spar, outboard of engine No. 2
const DEFUEL_TEE: P = [onSide("right", LEFT.sparValve)[0] - 5, WING_MANIFOLD_Y];
const DEFUEL_VALVE: P = pt(X(7.15), frontSparY(7.15) + 4);
const DEFUEL_LINE: P[] = [
  DEFUEL_TEE,
  [DEFUEL_TEE[0], DEFUEL_VALVE[1]],
  DEFUEL_VALVE,
  [RECEPTACLE[0], DEFUEL_VALVE[1]],
  [RECEPTACLE[0], RECEPTACLE[1] - 1.4],
];
/** Fueling panel door, beside the receptacle. */
const FUELING_PANEL_AT: P = [RECEPTACLE[0] + 6.4, RECEPTACLE[1] - 1.2];

// Vents: tank vent channels under the upper skin to the surge tanks, NACA
// scoop at 14.7 m (D6-58325-7), float valve and drain check at rib 22
function ventRoute(side: FeedSide): P[] {
  return [2.6, RIB5, 8, 12, RIB22 + 0.35].map((k) => onSide(side, pt(X(-k), frontSparY(k) + 1.3)));
}
const ventScoop = (side: FeedSide) => onSide(side, pt(X(-14.7), Y(22.96)));
const ventFloatValve = (side: FeedSide) => onSide(side, pt(X(-RIB22), frontSparY(RIB22) + 5));
const surgeDrainCheck = (side: FeedSide) => onSide(side, pt(X(-RIB22), rearSparY(RIB22) - 3));

const TEMP_SENSOR: P = pt(X(-6.4), rearSparY(6.4) - 2.6);
const TEMP_STEPS = [15, 35, 50, -20, -45];

/**
 * NGS air separation module in the left pack bay, under the center tank: the
 * same point as the NGS of the pneumatic network, whose block it replaces
 * with this layer on (like the ECS packs replace the "Pack" blocks).
 */
const NGS_POSITION = MAIN_PNEUMATIC_SYSTEM.layout.nodePositions[PNEUMATIC_NODE.nitrogenGeneration];
const NGS_MODULE: P = [NGS_POSITION.x, NGS_POSITION.y];
const NGS_VALVE_POSITION = MAIN_PNEUMATIC_SYSTEM.layout.nodePositions[PNEUMATIC_NODE.ngsShutoffValve];
const NGS_HALF_WIDTH = 3;
/** NEA outlet into the center tank. */
const NEA_PORT: P = [NGS_MODULE[0], NGS_MODULE[1] + 6];
/** NGS operability indicator, next to the APU ground control panel (P28). */
export const NGS_INDICATOR_AT: P = [397.6, 296.6];

// Wing sweep at mid chord, for the tank labels
const LABEL_ANGLE = (Math.atan((0.501 + 0.382) / 2) * 180) / Math.PI;
const TANK_LABEL: Record<TankId, { at: P; angle: number; name: string }> = {
  tank1: { at: pt(X(-10.8), (frontSparY(10.8) + rearSparY(10.8)) / 2), angle: -LABEL_ANGLE, name: "TANK 1" },
  center: { at: [380, 248.6], angle: 0, name: "CENTER" },
  tank2: { at: pt(X(10.8), (frontSparY(10.8) + rearSparY(10.8)) / 2), angle: LABEL_ANGLE, name: "TANK 2" },
};
const QUANTITY_STEP_KG: Record<TankId, number> = { tank1: 250, center: 1000, tank2: 250 };

// ---------------------------------------------------------------------------
// Colours

/** Fuel feed: the FCOM schematic's magenta. */
const FUEL = "#e879f9";
const REFUEL = "#60a5fa";
const VENT = "#2dd4bf";
const SCAVENGE = "#fb923c";
const NEA = "#4ade80";
const IDLE = "var(--color-sim-line-inactive)";
const FAILED = "#71717a";

const FEED_TEXT: Record<FeedKind, string> = {
  pressure: "CON PRESIÓN DE BOMBAS",
  suction: "ALIMENTACIÓN POR SUCCIÓN",
  none: "sin presión",
};

// ---------------------------------------------------------------------------
// Glyphs

/**
 * Fuel line: dark casing, coloured core (dashed for suction feed), white dashes
 * running along it while fuel flows.
 */
function FuelLine({
  points,
  color = FUEL,
  state,
  flowing = false,
  width = 0.55,
  dash,
  title,
}: {
  points: P[];
  color?: string;
  state: FeedKind | "active";
  flowing?: boolean;
  width?: number;
  dash?: string;
  title?: string;
}) {
  const d = toPath(points);
  const live = state !== "none";
  return (
    <g className="fill-none [stroke-linecap:round] [stroke-linejoin:round]">
      {title && <title>{title}</title>}
      <path d={d} className="stroke-sim-bg" strokeWidth={width + 0.7} />
      <path
        d={d}
        stroke={live ? color : IDLE}
        strokeWidth={live ? width : width * 0.7}
        strokeDasharray={state === "suction" ? "0.9 0.6" : dash}
        opacity={live ? 1 : 0.55}
      />
      {flowing && (
        <path d={d} stroke="#ffffff" strokeWidth={width * 0.5} strokeDasharray="0.5 1.3" opacity="0.85">
          <animate attributeName="stroke-dashoffset" from="1.8" to="0" dur="0.5s" repeatCount="indefinite" />
        </path>
      )}
    </g>
  );
}

/** Centrifugal AC pump: circle with the triangle pointing to its discharge. */
function PumpGlyph({ state, angle = 0 }: { state: "operating" | "off" | "low" | "failed"; angle?: number }) {
  const stroke = state === "failed" ? FAILED : state === "low" ? AMBER : "#ffffff";
  return (
    <g transform={`rotate(${angle})`}>
      <circle
        r="1.3"
        className="fill-sim-surface"
        stroke={stroke}
        strokeWidth="0.28"
        strokeDasharray={state === "failed" ? "0.5 0.35" : undefined}
      />
      <path
        d="M -0.55 -0.75 L 0.85 0 L -0.55 0.75 Z"
        fill={state === "operating" ? FUEL : state === "failed" ? FAILED : "#a1a1aa"}
      />
      {state === "failed" && <path d="M -0.8 -0.8 L 0.8 0.8 M -0.8 0.8 L 0.8 -0.8" stroke={FAILED} strokeWidth="0.2" />}
    </g>
  );
}

/** Check valve: box with the flow arrow (allowed direction along +x). */
function CheckValveGlyph({ x, y, angle }: { x: number; y: number; angle: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(0.32)`} className="pointer-events-none">
      <rect x="-2.8" y="-1.9" width="5.6" height="3.8" rx="0.5" className="fill-sim-surface stroke-white" strokeWidth="0.6" />
      <rect x="-2" y="-0.6" width="2" height="1.2" className="fill-white" />
      <polygon points="0,-1.4 2,0 0,1.4" className="fill-white" />
    </g>
  );
}

/** Fueling valve: solenoid operated (override plunger), bow tie with an S. */
function SolenoidValveGlyph({ open }: { open: boolean }) {
  const color = open ? REFUEL : "#ffffff";
  return (
    <g transform="scale(0.32)">
      <path
        d="M -2.2 -1.7 L 0 0 L -2.2 1.7 Z M 2.2 -1.7 L 0 0 L 2.2 1.7 Z"
        className="fill-sim-surface"
        stroke={color}
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
      <line x1="0" y1="0" x2="0" y2="-2.3" stroke={color} strokeWidth="0.4" />
      <circle cy="-3.4" r="1.1" className="fill-sim-surface" stroke={color} strokeWidth="0.45" />
      <text y="-2.8" fontSize="1.6" fontWeight="bold" fill={color} textAnchor="middle">
        S
      </text>
    </g>
  );
}

function JetPumpGlyph({ active }: { active: boolean }) {
  return (
    <g transform="scale(0.36)">
      <path
        d="M -3 -1.8 L -0.6 -0.6 L 0.6 -0.6 L 3 -1.6 L 3 1.6 L 0.6 0.6 L -0.6 0.6 L -3 1.8 Z"
        className="fill-sim-surface"
        stroke={active ? SCAVENGE : "#a1a1aa"}
        strokeWidth="0.55"
        strokeLinejoin="round"
      />
      <line x1="-2.2" y1="0" x2="0.4" y2="0" stroke={active ? SCAVENGE : "#a1a1aa"} strokeWidth="0.45" />
    </g>
  );
}

/** Fuel filter: square with a mesh; amber when contaminated. */
function FilterGlyph({ clogged }: { clogged: boolean }) {
  const color = clogged ? AMBER : "#ffffff";
  return (
    <g>
      <rect x="-0.9" y="-0.9" width="1.8" height="1.8" rx="0.2" className="fill-sim-surface" stroke={color} strokeWidth="0.24" />
      <path d="M -0.9 0.9 L 0.9 -0.9 M -0.9 0 L 0 -0.9 M 0 0.9 L 0.9 0" stroke={color} strokeWidth="0.14" />
    </g>
  );
}

function TankPort({ at, color }: { at: P; color: string }) {
  return <circle cx={at[0]} cy={at[1]} r="0.42" className="fill-sim-surface" stroke={color} strokeWidth="0.2" />;
}

// ---------------------------------------------------------------------------
// Tanks

function TankShape({ tank }: { tank: TankId }) {
  const { state } = useFuel();
  const fraction = state.quantityKg[tank] / TANK_CAPACITY_KG[tank];
  return (
    <polygon
      points={TANK_SHAPES[tank].map((p) => p.join(",")).join(" ")}
      fill={FUEL}
      fillOpacity={0.05 + 0.2 * fraction}
      stroke={FUEL}
      strokeOpacity={0.45}
      strokeWidth="0.3"
      className="pointer-events-none"
    />
  );
}

/** Tank structure: tank end ribs, rib 8 baffle check valves, spars, surge tanks. */
function TankStructure() {
  return (
    <g className="pointer-events-none">
      {(["left", "right"] as const).map((side) => (
        <g key={side}>
          <polygon
            points={SURGE_SHAPE.map((p) => onSide(side, p).join(",")).join(" ")}
            className="fill-zinc-500/10 stroke-zinc-500"
            strokeWidth="0.25"
          />
          {[RIB5, RIB22, RIB25].map((k) => {
            const [x] = onSide(side, [X(-k), 0]);
            return <line key={k} x1={x} y1={frontSparY(k)} x2={x} y2={rearSparY(k)} className="stroke-zinc-400" strokeWidth="0.32" />;
          })}
          <line
            x1={onSide(side, [X(-RIB8), 0])[0]}
            y1={frontSparY(RIB8)}
            x2={onSide(side, [X(-RIB8), 0])[0]}
            y2={rearSparY(RIB8)}
            className="stroke-zinc-500"
            strokeWidth="0.22"
            strokeDasharray="0.7 0.45"
          />
          {[frontSparY, rearSparY].map((spar, i) => (
            <line
              key={i}
              x1={onSide(side, [X(-SIDE_OF_BODY), 0])[0]}
              y1={spar(SIDE_OF_BODY)}
              x2={onSide(side, [X(-RIB25), 0])[0]}
              y2={spar(RIB25)}
              className="stroke-zinc-500"
              strokeWidth="0.18"
            />
          ))}
          {/* Centred in the surge tank, along the wing sweep */}
          <g transform={`translate(${surgeLabelAt(side).join(" ")}) rotate(${side === "left" ? -LABEL_ANGLE : LABEL_ANGLE})`}>
            <TinyLabel x={0} y={0} className="fill-zinc-500">
              SURGE
            </TinyLabel>
          </g>
        </g>
      ))}
    </g>
  );
}

/** Rib 8 baffle check valves and the surge tank float / drain valves (static). */
function TankValves() {
  return (
    <g>
      {(["left", "right"] as const).map((side) => {
        const [x] = onSide(side, [X(-RIB8), 0]);
        const midY = (frontSparY(RIB8) + rearSparY(RIB8)) / 2 + 3;
        const [fx, fy] = ventFloatValve(side);
        const [dx, dy] = surgeDrainCheck(side);
        return (
          <g key={side}>
            <g transform={`translate(${x} ${midY})`}>
              <title>Rib 8: baffle check valves (el combustible pasa sólo hacia adentro, a las bombas)</title>
              <circle r="1.1" fill="transparent" />
              <path
                d={side === "left" ? "M -0.4 -0.6 L 0.4 0 L -0.4 0.6" : "M 0.4 -0.6 L -0.4 0 L 0.4 0.6"}
                className="fill-none stroke-zinc-400"
                strokeWidth="0.22"
              />
            </g>
            <g transform={`translate(${fx} ${fy})`}>
              <title>{`Fuel vent float valve · rib 22 · tanque ${side === "left" ? "1" : "2"} ↔ surge tank`}</title>
              <circle r="0.7" className="fill-sim-surface" stroke={VENT} strokeWidth="0.2" />
              <circle cy="0.15" r="0.28" fill={VENT} />
            </g>
            <g>
              <title>{`Surge tank drain check valve · rib 22 · surge tank → tanque ${side === "left" ? "1" : "2"}`}</title>
              <CheckValveGlyph x={dx} y={dy} angle={side === "left" ? 0 : 180} />
            </g>
          </g>
        );
      })}
    </g>
  );
}

/** Quantity readout and − / + buttons (injects a fuel load, like the other faults). */
function TankLabel({ tank }: { tank: TankId }) {
  const { state, dispatch } = useFuel();
  const { at, angle, name } = TANK_LABEL[tank];
  const kg = state.quantityKg[tank];
  const step = QUANTITY_STEP_KG[tank];
  const button = (sign: -1 | 1, x: number) => (
    <g
      transform={`translate(${x} 0)`}
      {...controlProps(`${sign > 0 ? "Agregar" : "Quitar"} ${step} kg en ${name}`, () =>
        dispatch({ type: "setQuantity", tank, kg: kg + sign * step }),
      )}
    >
      <title>{`${sign > 0 ? "Cargar" : "Quitar"} ${step} kg (atajo del simulador, como inyectar una falla)`}</title>
      <circle r="0.95" className="fill-sim-surface stroke-zinc-400 transition-colors group-hover:stroke-white" strokeWidth="0.2" />
      <path d={sign > 0 ? "M -0.5 0 H 0.5 M 0 -0.5 V 0.5" : "M -0.5 0 H 0.5"} className="stroke-zinc-200" strokeWidth="0.2" />
    </g>
  );
  return (
    <g transform={`translate(${at[0]} ${at[1]}) rotate(${angle})`}>
      <title>{`${name}: ${Math.round(kg)} kg de ${TANK_CAPACITY_KG[tank]} kg utilizables (FCOM 12.20.4)`}</title>
      <text y="-0.35" textAnchor="middle" fontSize="1.15" fontWeight="bold" className="pointer-events-none fill-zinc-300 font-sim-sans tracking-wide">
        {name}
      </text>
      <text y="1.05" textAnchor="middle" fontSize="1.05" className="pointer-events-none fill-zinc-400 font-sim-sans tabular-nums">
        {`${Math.round(kg)} kg`}
      </text>
      {button(-1, -6.2)}
      {button(1, 6.2)}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Feed network

function useFeedState() {
  const { state, indications } = useFuel();
  const pressure = (side: FeedSide) =>
    indications.engines[side === "left" ? "eng1" : "eng2"].feed.kind === "pressure" ||
    (side === "left" && indications.apu.feed.kind === "pressure");
  // Pumps actually delivering fuel: to a running consumer or a ground transfer
  const delivering = new Set<PumpId>([
    ...(["eng1", "eng2"] as const).flatMap((engine) => (state.running[engine] ? indications.engines[engine].feed.pumps : [])),
    ...(state.running.apu ? indications.apu.feed.pumps : []),
    // Ground transfer through the manual defueling valve
    ...(Object.values(indications.fueling.valveOpen).some(Boolean) ? indications.fueling.transferFeed.pumps : []),
  ]);
  const sideKind = (side: FeedSide): FeedKind => {
    if (pressure(side)) return "pressure";
    const engine: EngineId = side === "left" ? "eng1" : "eng2";
    const suction =
      (state.running[engine] && indications.engines[engine].feed.kind === "suction") ||
      (side === "left" && state.running.apu && indications.apu.feed.kind === "suction");
    return suction ? "suction" : "none";
  };
  return { state, indications, delivering, sideKind };
}

/**
 * The feed manifold as one line from the left spar valve to the right one
 * through the crossfeed valve, with the points where fuel enters (pump
 * discharges, suction bypass) or leaves (engines, APU, defueling line).
 */
type ManifoldNode = { id: string; side: FeedSide; at: P };
const MANIFOLD_NODES: ManifoldNode[] = (() => {
  const side = (s: FeedSide): ManifoldNode[] => {
    const n = s === "left" ? 1 : 2;
    const on = (p: P) => onSide(s, p);
    const nodes: (ManifoldNode | null)[] = [
      { id: `spar${n}`, side: s, at: on(LEFT.sparValve) },
      s === "right" ? { id: "defuel", side: s, at: DEFUEL_TEE } : null,
      { id: `bypass${n}`, side: s, at: on([LEFT.bypass[0], WING_MANIFOLD_Y]) },
      { id: `aft${n}`, side: s, at: [PUMP_AT[`aft${n}` as PumpId][0], WING_MANIFOLD_Y] },
      { id: `fwd${n}`, side: s, at: [PUMP_AT[`fwd${n}` as PumpId][0], WING_MANIFOLD_Y] },
      s === "left" ? { id: "apu", side: s, at: LEFT.apuTee } : null,
      { id: `elbowOut${n}`, side: s, at: on(LEFT.elbowOut) },
      { id: `elbowIn${n}`, side: s, at: on(LEFT.elbowIn) },
      { id: s === "left" ? "ctrL" : "ctrR", side: s, at: [PUMP_AT[s === "left" ? "ctrL" : "ctrR"][0], CENTER_MANIFOLD_Y] },
    ];
    return nodes.filter((node): node is ManifoldNode => node !== null);
  };
  // Outboard to inboard on the left, the crossfeed, inboard to outboard on the right
  return [...side("left"), { id: "crossfeed", side: "left", at: CROSSFEED_VALVE }, ...side("right").reverse()];
})();
const MANIFOLD_INDEX = new Map(MANIFOLD_NODES.map((node, i) => [node.id, i]));

/**
 * Net fuel flow in each manifold segment (segment i joins nodes i and i + 1):
 * positive toward the right spar valve, negative toward the left one.
 */
function manifoldSegmentFlows(state: FuelSystemState, indications: FuelIndications): number[] {
  const flows = MANIFOLD_NODES.slice(1).map(() => 0);
  const route = (sources: string[], consumer: string) => {
    const to = MANIFOLD_INDEX.get(consumer)!;
    for (const source of sources) {
      const from = MANIFOLD_INDEX.get(source)!;
      const sign = to > from ? 1 : -1;
      for (let i = Math.min(from, to); i < Math.max(from, to); i++) flows[i] += sign / sources.length;
    }
  };
  for (const engine of ["eng1", "eng2"] as const) {
    if (!state.running[engine]) continue;
    const { feed } = indications.engines[engine];
    const n = engine === "eng1" ? 1 : 2;
    if (feed.kind === "pressure") route(feed.pumps, `spar${n}`);
    else if (feed.kind === "suction") route([`bypass${n}`], `spar${n}`);
  }
  // The APU suction feed has its own line from tank No. 1
  if (state.running.apu && indications.apu.feed.kind === "pressure") route(indications.apu.feed.pumps, "apu");
  const { transferFeed, valveOpen } = indications.fueling;
  if (transferFeed.kind === "pressure" && Object.values(valveOpen).some(Boolean)) route(transferFeed.pumps, "defuel");
  return flows;
}

function ManifoldLines() {
  const { state, indications, delivering, sideKind } = useFeedState();
  const flows = manifoldSegmentFlows(state, indications);
  return (
    <g data-fuel-zone="manifolds">
      {flows.map((flow, i) => {
        const a = MANIFOLD_NODES[i];
        const b = MANIFOLD_NODES[i + 1];
        // A segment belongs to the side of its outboard end (the crossfeed joins the left line)
        const side = b.id === "crossfeed" ? a.side : b.side;
        const kind = sideKind(side);
        return (
          <FuelLine
            key={`${a.id}-${b.id}`}
            points={flow < 0 ? [b.at, a.at] : [a.at, b.at]}
            state={kind}
            flowing={Math.abs(flow) > 1e-9}
            width={0.7}
            title={`Manifold de alimentación ${side === "left" ? "izquierdo (motor 1)" : "derecho (motor 2)"} · ${FEED_TEXT[kind]}`}
          />
        );
      })}
      {(["left", "right"] as const).map((side) => {
        const engine: EngineId = side === "left" ? "eng1" : "eng2";
        const feed = indications.engines[engine].feed;
        const s = (p: P) => onSide(side, p);
        const bypassFlow = state.running[engine] && feed.kind === "suction";
        return (
          <g key={side}>
            {/* Pumps → check valve → manifold */}
            {(side === "left" ? (["fwd1", "aft1", "ctrL"] as const) : (["fwd2", "aft2", "ctrR"] as const)).map((pump) => {
              const at = PUMP_AT[pump];
              const manifoldY = PUMPS[pump].tank === "center" ? CENTER_MANIFOLD_Y : WING_MANIFOLD_Y;
              const operating = indications.pumps[pump].operating;
              return (
                <FuelLine
                  key={pump}
                  points={[at, [at[0], manifoldY]]}
                  state={operating ? "pressure" : "none"}
                  flowing={delivering.has(pump)}
                  title={`Descarga de la bomba ${PUMPS[pump].label} (con check valve)`}
                />
              );
            })}
            {/* Engine bypass valve: suction feed from the main tank */}
            <FuelLine
              points={[s([LEFT.bypass[0], LEFT.bypass[1] + 6.5]), s([LEFT.bypass[0], WING_MANIFOLD_Y])]}
              state={bypassFlow ? "suction" : "none"}
              flowing={bypassFlow}
              dash="0.9 0.6"
              width={0.45}
              title={`Línea de succión · engine bypass valve del tanque ${side === "left" ? "1" : "2"}`}
            />
            <TankPort at={s([LEFT.bypass[0], LEFT.bypass[1] + 6.5])} color={bypassFlow ? FUEL : IDLE} />
            <g>
              <title>{`Engine bypass valve · tanque ${side === "left" ? "1" : "2"} (alimentación por succión cuando no hay presión de bombas)`}</title>
              <CheckValveGlyph x={s(LEFT.bypass)[0]} y={LEFT.bypass[1]} angle={-90} />
            </g>
            {(side === "left" ? (["fwd1", "aft1", "ctrL"] as const) : (["fwd2", "aft2", "ctrR"] as const)).map((pump) => {
              const at = PUMP_AT[pump];
              const manifoldY = PUMPS[pump].tank === "center" ? CENTER_MANIFOLD_Y : WING_MANIFOLD_Y;
              const up = manifoldY < at[1];
              return <CheckValveGlyph key={pump} x={at[0]} y={(at[1] + manifoldY) / 2 + (up ? 0 : 0.6)} angle={up ? -90 : 90} />;
            })}
          </g>
        );
      })}
    </g>
  );
}

function PumpControl({ pump }: { pump: PumpId }) {
  const { state, indications, dispatch } = useFuel();
  const [x, y] = PUMP_AT[pump];
  const failed = state.pumpFailed[pump];
  const { operating, lowPressureLit } = indications.pumps[pump];
  const isCenter = PUMPS[pump].tank === "center";
  const autoOff = isCenter && state.centerPumpAutoOff[pump as CenterPumpId];
  const glyph = failed ? "failed" : operating ? "operating" : lowPressureLit ? "low" : "off";
  const status = failed
    ? "FALLADA"
    : operating
      ? "FUNCIONANDO"
      : autoOff
        ? "APAGADA AUTOMÁTICAMENTE por baja presión (poner el switch en OFF para resetear)"
        : !state.pumpSwitches[pump]
          ? "switch en OFF"
          : "SIN COMBUSTIBLE EN LA ENTRADA (baja presión)";
  const discharge = PUMPS[pump].tank === "center" ? -90 : pump.startsWith("fwd") ? 90 : -90;
  return (
    <g
      transform={`translate(${x} ${y})`}
      data-sensor-id={`fuel-pump-${pump}`}
      {...controlProps(`Bomba de combustible ${PUMPS[pump].label}: ${status}`, () =>
        dispatch({ type: "setPumpFailed", pump, failed: !failed }),
      )}
    >
      <title>{`Bomba de combustible ${PUMPS[pump].label} · ${isCenter ? "tanque central, larguero trasero (pared del hueco del tren)" : `tanque ${PUMPS[pump].tank === "tank1" ? "1" : "2"}, larguero ${pump.startsWith("fwd") ? "delantero" : "trasero"}`}
CA, centrífuga${isCenter ? ", mayor presión que las de los tanques principales" : ""}
Estado: ${status}${lowPressureLit ? " · luz LOW PRESSURE encendida" : ""}
(Clic para ${failed ? "reparar" : "simular la falla de la bomba"})`}</title>
      <circle r="1.8" fill="transparent" />
      <circle r="1.65" fill="none" stroke="#ffffff" strokeWidth="0.22" strokeDasharray="0.6 0.45" className="opacity-0 transition-opacity group-hover:opacity-80" />
      <PumpGlyph state={glyph} angle={discharge} />
    </g>
  );
}

function MotorValve({
  valve,
  at,
  angle,
  name,
  note,
}: {
  valve: MotorValveId;
  at: P;
  angle: number;
  name: string;
  note: string;
}) {
  const { state, dispatch } = useFuel();
  const open = state.valveOpen[valve];
  const stuck = state.valveStuck[valve];
  return (
    <g
      data-sensor-id={`fuel-valve-${valve}`}
      {...controlProps(`${name}: ${open ? "abierta" : "cerrada"}${stuck ? ", trabada" : ""}`, () =>
        dispatch({ type: "setValveStuck", valve, stuck: !stuck }),
      )}
    >
      <circle cx={at[0]} cy={at[1]} r="1.6" fill="transparent" />
      {stuck && <circle cx={at[0]} cy={at[1]} r="1.45" fill="none" stroke={AMBER} strokeWidth="0.22" strokeDasharray="0.5 0.35" />}
      <ShutoffValve
        x={at[0]}
        y={at[1]}
        angle={angle}
        open={open}
        title={`${name} · ${note}
Estado: ${open ? "ABIERTA" : "CERRADA"}${stuck ? " · TRABADA (no sigue su comando: luz brillante)" : ""}
(Clic para ${stuck ? "destrabarla" : "simular que se traba en su posición actual"})`}
      />
    </g>
  );
}

function EngineSupply({ engine }: { engine: EngineId }) {
  const { state, indications, dispatch } = useFuel();
  const side = ENGINE_SIDE[engine];
  const n = engine === "eng1" ? 1 : 2;
  const s = (p: P) => onSide(side, p);
  const sparOpen = state.valveOpen[engine === "eng1" ? "spar1" : "spar2"];
  const lights = indications.engines[engine];
  const supply: FeedKind = sparOpen ? lights.feed.kind : "none";
  const clogged = state.filterClogged[engine];
  const [vx, vy] = s(ENGINE_VALVE);
  const [fx, fy] = s(ENGINE_FILTER);
  return (
    <g data-fuel-zone={engine}>
      {/* Spar valve → strut → engine pump and heat exchangers → filter */}
      <FuelLine
        points={[...engineFuelLine(engine).slice(0, -1), s([ENGINE_FUEL_LINE_X, ENGINE_FILTER[1] + 0.9])]}
        state={supply}
        flowing={state.running[engine]}
        width={0.6}
        title={`Línea de combustible al motor ${n} (spar valve → pilón → bomba del motor e intercambiadores → filtro)`}
      />
      <FuelLine
        points={FILTER_TO_VALVE.map(s)}
        state={supply}
        flowing={state.running[engine]}
        width={0.6}
        title={`Motor ${n}: filtro → HMU (engine fuel shutoff valve)`}
      />
      <FuelLine
        points={VALVE_TO_NOZZLES.map(s)}
        state={lights.engineValveOpen ? "pressure" : "none"}
        flowing={state.running[engine]}
        width={0.5}
        title={`Motor ${n}: HMU → inyectores`}
      />
      <MotorValve
        valve={engine === "eng1" ? "spar1" : "spar2"}
        at={sparValveAt(engine)}
        angle={-90}
        name={`Spar fuel shutoff valve · motor ${n}`}
        note="larguero delantero, afuera del pilón; motor DC (hot battery bus); se abre con start lever en IDLE y fire switch adentro"
      />
      <ShutoffValve
        x={vx}
        y={vy}
        open={lights.engineValveOpen}
        title={`Engine fuel shutoff valve · motor ${n} (en el motor; actuada por combustible, controlada por solenoide)
Estado: ${lights.engineValveOpen ? "ABIERTA" : "CERRADA"}${lights.engineValveLight === "bright" ? " · comandada abierta pero el motor no gira (luz brillante)" : ""}`}
      />
      <g
        transform={`translate(${fx} ${fy})`}
        data-sensor-id={`fuel-filter-${engine}`}
        {...controlProps(`Filtro de combustible del motor ${n}: ${clogged ? "contaminado" : "normal"}`, () =>
          dispatch({ type: "setFilterClogged", engine, clogged: !clogged }),
        )}
      >
        <title>{`Filtro de combustible · motor ${n}
Estado: ${clogged ? "CONTAMINADO · bypass inminente (luz FILTER BYPASS)" : "normal"}
(Clic para ${clogged ? "limpiarlo" : "simular un filtro contaminado"})`}</title>
        <rect x="-1.4" y="-1.4" width="2.8" height="2.8" fill="transparent" />
        <FilterGlyph clogged={clogged} />
      </g>
      <TinyLabel x={s([LEFT.sparValve[0] - 1.6, 0])[0]} y={LEFT.sparValve[1] - 1.7} anchor={side === "left" ? "end" : "start"}>
        SPAR
      </TinyLabel>
    </g>
  );
}

function CrossfeedValve() {
  return (
    <MotorValve
      valve="crossfeed"
      at={CROSSFEED_VALVE}
      angle={0}
      name="Crossfeed valve"
      note="larguero trasero, a la derecha del eje; motor DC (battery bus); une los manifolds de los motores 1 y 2"
    />
  );
}

function ApuSupply() {
  const { state, indications } = useFuel();
  const feed = indications.apu.feed;
  const sovOpen = state.valveOpen.apu;
  const running = state.running.apu;
  const bypass = running && feed.kind === "suction";
  return (
    <g data-fuel-zone="apu">
      <FuelLine
        points={[LEFT.apuTee, APU_FUEL_SHUTOFF_VALVE_AT]}
        state={feed.kind === "pressure" ? "pressure" : bypass ? "suction" : "none"}
        flowing={running}
        width={0.5}
        title="Línea del APU desde el lado izquierdo del manifold"
      />
      <FuelLine
        points={[APU_BYPASS_IN, [LEFT.apuTee[0], APU_BYPASS_IN[1]]]}
        state={bypass ? "suction" : "none"}
        flowing={bypass}
        width={0.4}
        title="Línea de succión del APU desde el tanque 1 (APU bypass valve)"
      />
      <TankPort at={APU_BYPASS_IN} color={bypass ? FUEL : IDLE} />
      <FuelLine
        points={APU_FUEL_LINE}
        state={sovOpen && feed.kind !== "none" ? feed.kind : "none"}
        flowing={running}
        width={0.45}
        title="Línea de combustible al APU (con camisa, por el costado izquierdo del fuselaje; recorrido ilustrativo)"
      />
      <CheckValveGlyph x={APU_CHECK[0]} y={APU_CHECK[1]} angle={90} />
      <g>
        <title>APU bypass valve · succión desde el tanque 1 cuando no hay presión de bombas</title>
        <CheckValveGlyph x={(APU_BYPASS_IN[0] + LEFT.apuTee[0]) / 2} y={APU_BYPASS_IN[1]} angle={0} />
      </g>
      <MotorValve
        valve="apu"
        at={APU_FUEL_SHUTOFF_VALVE_AT}
        angle={-90}
        name="APU fuel shutoff valve"
        note="larguero trasero, hueco del tren izquierdo; motor DC; abre con el APU andando, la cierran el fire switch del APU y la manija del P28"
      />
      <TinyLabel x={APU_FUEL_SHUTOFF_VALVE_AT[0] - 1.8} y={APU_FUEL_SHUTOFF_VALVE_AT[1]} anchor="end">
        APU
      </TinyLabel>
    </g>
  );
}

function Scavenge() {
  const { indications, state } = useFuel();
  const active = indications.scavengeActive;
  return (
    <g data-fuel-zone="scavenge">
      <title>{`Center tank fuel scavenge jet pump · larguero delantero izquierdo
La mueve el caudal de la bomba FWD del tanque 1 (tobera): aspira el remanente del central y lo descarga en el tanque 1
Empieza con el tanque 1 a la mitad (≈ 1990 kg) y sigue el resto del vuelo
Estado: ${active ? "TRANSFIRIENDO" : state.scavengeLatched ? "armado (falta la bomba FWD 1 o combustible en el central)" : "inactivo"}`}</title>
      <FuelLine points={SCAVENGE_MOTIVE} color={SCAVENGE} state={active ? "active" : "none"} flowing={active} width={0.35} dash="0.8 0.5" />
      <FuelLine points={SCAVENGE_SUCTION} color={SCAVENGE} state={active ? "active" : "none"} flowing={active} width={0.4} dash="0.8 0.5" />
      <TankPort at={SCAVENGE_INLET} color={active ? SCAVENGE : IDLE} />
      <FuelLine
        points={[[JET_PUMP[0] - JET_HALF_LENGTH, JET_PUMP[1]], SCAVENGE_OUTLET]}
        color={SCAVENGE}
        state={active ? "active" : "none"}
        flowing={active}
        width={0.4}
      />
      <TankPort at={SCAVENGE_OUTLET} color={active ? SCAVENGE : IDLE} />
      {/* Nozzle on the inboard end, diffuser opening outboard */}
      <g transform={`translate(${JET_PUMP[0]} ${JET_PUMP[1]}) rotate(180)`}>
        <JetPumpGlyph active={active} />
      </g>
    </g>
  );
}

function FuelingStation({ onOpenPanel }: { onOpenPanel: () => void }) {
  const { state, indications, dispatch } = useFuel();
  const { fueling } = indications;
  const truck = state.fuelTruckConnected;
  const transfer = fueling.transferFeed.kind === "pressure" && (["tank1", "center", "tank2"] as const).some((t) => fueling.valveOpen[t]);
  const headerLive = (truck && (["tank1", "center", "tank2"] as const).some((t) => fueling.valveOpen[t])) || transfer;
  const defuelOpen = state.manualDefuelValveOpen;
  return (
    <g data-fuel-zone="fueling">
      {/* Receptacle → header → three fueling valves */}
      <FuelLine
        points={[RECEPTACLE, [RECEPTACLE[0], FUELING_HEADER_Y]]}
        color={REFUEL}
        state={truck || transfer ? "active" : "none"}
        flowing={headerLive}
        width={0.45}
      />
      {/* Header: from the receptacle out to the fueling valves */}
      {(
        [
          [RECEPTACLE[0], "tank1", ["tank1"]],
          [RECEPTACLE[0], "center", ["center", "tank2"]],
          [FUELING_VALVE_X.center, "tank2", ["tank2"]],
        ] as const
      ).map(([from, to, feeding]) => (
        <FuelLine
          key={to}
          points={[[from, FUELING_HEADER_Y], [FUELING_VALVE_X[to], FUELING_HEADER_Y]]}
          color={REFUEL}
          state={truck || transfer ? "active" : "none"}
          flowing={headerLive && feeding.some((tank) => fueling.valveOpen[tank])}
          width={0.45}
          title="Manifold de la estación de carga"
        />
      ))}
      {(["tank1", "center", "tank2"] as const).map((tank) => {
        const open = fueling.valveOpen[tank];
        const x = FUELING_VALVE_X[tank];
        return (
          <g key={tank}>
            <FuelLine points={[[x, FUELING_HEADER_Y], [x, FUELING_VALVES_Y + 2]]} color={REFUEL} state={open ? "active" : "none"} flowing={open} width={0.45} />
            <FuelLine
              points={fuelingLine(tank)}
              color={REFUEL}
              state={open ? "active" : "none"}
              flowing={open}
              width={0.45}
              title={`Línea de carga al ${tank === "center" ? "tanque central" : `tanque ${tank === "tank1" ? "1" : "2"}`}${tank === "tank2" ? " (con difusor)" : " (recorrido ilustrativo)"}`}
            />
            <g transform={`translate(${x} ${FUELING_VALVES_Y})`}>
              <title>{`Fueling valve · ${tank === "center" ? "tanque central" : `tanque ${tank === "tank1" ? "1" : "2"}`} (solenoide, con override manual)
Estado: ${open ? "ABIERTA · cargando" : "CERRADA"}${state.fuelingValveSwitches[tank] ? " · switch OPEN" : ""}
Se cierra sola con el tanque lleno (float switch)`}</title>
              <SolenoidValveGlyph open={open} />
            </g>
          </g>
        );
      })}
      <rect x={DIFFUSER[0] - 0.7} y={DIFFUSER[1] - 0.55} width="1.4" height="1.1" className="fill-sim-surface" stroke={REFUEL} strokeWidth="0.2">
        <title>Difusor de la línea de carga del tanque 2 (iguala el llenado con el tanque 1)</title>
      </rect>

      {/* Manual defueling valve: right manifold ↔ fueling station */}
      <FuelLine
        points={DEFUEL_LINE}
        color={REFUEL}
        state={defuelOpen ? "active" : "none"}
        flowing={transfer}
        width={0.4}
        dash="1 0.5"
        title="Línea de defueling / transferencia (manifold derecho ↔ estación de carga)"
      />
      <g
        data-sensor-id="fuel-defuel-valve"
        {...controlProps(`Manual defueling valve: ${defuelOpen ? "abierta" : "cerrada"}`, () =>
          dispatch({ type: "setManualDefuelValve", open: !defuelOpen }),
        )}
      >
        <circle cx={DEFUEL_VALVE[0]} cy={DEFUEL_VALVE[1]} r="1.7" fill="transparent" />
        <ShutoffValve
          x={DEFUEL_VALVE[0]}
          y={DEFUEL_VALVE[1]}
          angle={0}
          open={defuelOpen}
          title={`Manual defueling valve · larguero delantero derecho, afuera del motor 2
Une el manifold del motor con la estación de carga para defueling y transferencia en tierra
Estado: ${defuelOpen ? "ABIERTA" : "CERRADA"} (clic para ${defuelOpen ? "cerrarla" : "abrirla"})`}
        />
        <path
          d={`M ${DEFUEL_VALVE[0]} ${DEFUEL_VALVE[1] - 0.75} V ${DEFUEL_VALVE[1] - 1.35} M ${DEFUEL_VALVE[0] - 0.45} ${DEFUEL_VALVE[1] - 1.35} H ${DEFUEL_VALVE[0] + 0.45}`}
          className="stroke-white pointer-events-none"
          strokeWidth="0.2"
          strokeLinecap="round"
        />
      </g>

      {/* Receptacle and the panel door (opens the P15 panel) */}
      <circle cx={RECEPTACLE[0]} cy={RECEPTACLE[1]} r="0.75" fill={truck ? REFUEL : "#a1a1aa"} className="stroke-sim-bg" strokeWidth="0.2">
        <title>{`Fueling receptacle (carga a presión por un solo punto) · ${truck ? "manguera del camión CONECTADA" : "sin manguera (conectala con FUEL TRUCK)"}`}</title>
      </circle>
      <g
        transform={`translate(${FUELING_PANEL_AT[0]} ${FUELING_PANEL_AT[1]})`}
        data-sensor-id="fueling-panel"
        {...controlProps("Abrir el panel de carga de combustible (P15)", onOpenPanel)}
      >
        <title>{`Test gages and fueling panel (P15) · borde de ataque del ala derecha
Al abrir la puerta se energiza el panel
(Clic para abrir el panel)`}</title>
        <rect x="-2.3" y="-1.6" width="4.6" height="3.2" fill="transparent" />
        <rect x="-1.9" y="-1.2" width="3.8" height="2.4" rx="0.3" className="fill-sim-surface stroke-white transition-colors group-hover:stroke-sim-accent" strokeWidth="0.3" />
        {(["tank2", "center", "tank1"] as const).map((tank, i) => (
          <circle key={tank} cx={-1.1 + i * 1.1} cy="0" r="0.32" fill={fueling.valveLightLit[tank] ? "#3b6bff" : "#3f3f46"} />
        ))}
        <TinyLabel x={0} y={-1.85} className="fill-zinc-300">
          P15
        </TinyLabel>
      </g>
    </g>
  );
}

function Vents() {
  return (
    <g data-fuel-zone="vents" className="pointer-events-none">
      {(["left", "right"] as const).map((side) => {
        const route = ventRoute(side);
        const last = route[route.length - 1];
        const [sx, sy] = ventScoop(side);
        return (
          <g key={side}>
            <FuelLine points={route} color={VENT} state="active" width={0.3} dash="0.5 0.45" />
            <FuelLine points={[last, [sx, sy - 1.2]]} color={VENT} state="active" width={0.3} dash="0.5 0.45" />
            <TankPort at={route[0]} color={VENT} />
            <g transform={`translate(${sx} ${sy})`}>
              <path d="M -0.9 0 L 0 -0.9 L 0.9 0 L 0.45 0.8 L -0.45 0.8 Z" fill={VENT} fillOpacity="0.2" stroke={VENT} strokeWidth="0.2" strokeLinejoin="round" />
            </g>
          </g>
        );
      })}
    </g>
  );
}

/** Vent scoops with their tooltips (the vent lines themselves are not interactive). */
function VentScoops() {
  return (
    <g>
      {(["left", "right"] as const).map((side) => {
        const [sx, sy] = ventScoop(side);
        return (
          <circle key={side} cx={sx} cy={sy} r="1.2" fill="transparent">
            <title>{`Venteo del surge tank ${side === "left" ? "izquierdo" : "derecho"}: toma NACA, flame arrestor y válvula de alivio en la misma tapa del intradós (14,7 m del eje)
Los canales de venteo van bajo el extradós desde cada tanque (el central a ambos surge tanks)`}</title>
          </circle>
        );
      })}
    </g>
  );
}

function TempSensor() {
  const { state, dispatch } = useFuel();
  const t = state.fuelTempC;
  const next = TEMP_STEPS[(TEMP_STEPS.indexOf(t) + 1) % TEMP_STEPS.length] ?? TEMP_STEPS[0];
  const outOfLimits = t > 49 || t < -43;
  return (
    <g
      transform={`translate(${TEMP_SENSOR[0]} ${TEMP_SENSOR[1]})`}
      data-sensor-id="fuel-temp-sensor"
      {...controlProps(`Sensor de temperatura de combustible: ${t} °C`, () => dispatch({ type: "setFuelTemp", celsius: next }))}
    >
      <title>{`Sensor de temperatura de combustible · tanque 1, larguero trasero (el único del avión)
Temperatura: ${t} °C${outOfLimits ? " · FUERA DE LÍMITES (máx. 49 °C, mín. −43 °C, FCOM L.10.9)" : ""}
(Clic para pasar a ${next} °C)`}</title>
      <circle r="1.2" fill="transparent" />
      <circle r="0.85" className="fill-sim-surface" stroke={outOfLimits ? AMBER : "#ffffff"} strokeWidth="0.22" />
      <text y="0.05" textAnchor="middle" dominantBaseline="middle" fontSize="1" fontWeight="bold" className="pointer-events-none fill-white font-sim-sans">
        T
      </text>
    </g>
  );
}

const NGS_CYCLE: NgsStatus[] = ["operational", "degraded", "inoperative"];
const NGS_TEXT: Record<NgsStatus, string> = {
  operational: "OPERATIONAL",
  degraded: "DEGRADED",
  inoperative: "INOPERATIVE",
};

/**
 * Bleed duct from the NGS shutoff valve of the pneumatic network into the
 * module, drawn like the network ducts (the network hides its own last stretch
 * and the NGS block while this layer is on).
 */
function NgsBleedInlet() {
  const { solution, runtimeState } = usePneumatic();
  const valveId = PNEUMATIC_NODE.ngsShutoffValve;
  const supply = solution.nodes[valveId];
  const open = runtimeState.accessories[valveId]?.open ?? false;
  const active = open && supply.energized && supply.pressurePsi > 0;
  // Under the network: its valve symbol covers the start
  const d = toPath([[NGS_VALVE_POSITION.x, NGS_VALVE_POSITION.y], [NGS_MODULE[0] - NGS_HALF_WIDTH, NGS_MODULE[1]]]);
  return (
    <g className="pointer-events-none fill-none [stroke-linecap:round]">
      <path d={d} className="stroke-sim-bg" strokeWidth="2.25" />
      <path
        d={d}
        strokeWidth="0.85"
        className={active ? undefined : "stroke-sim-line-inactive"}
        stroke={active ? getTemperatureColor(supply.temperatureC) : undefined}
      />
    </g>
  );
}

function NgsModule() {
  const { state, dispatch } = useFuel();
  const next = NGS_CYCLE[(NGS_CYCLE.indexOf(state.ngsStatus) + 1) % NGS_CYCLE.length];
  const [x, y] = NGS_MODULE;
  return (
    <g data-fuel-zone="ngs">
      <FuelLine points={[[x, y + 1.3], NEA_PORT]} color={NEA} state="none" width={0.35} dash="0.8 0.5" />
      <TankPort at={NEA_PORT} color={IDLE} />
      <g
        transform={`translate(${x} ${y})`}
        data-sensor-id="fuel-ngs"
        {...controlProps(`Nitrogen generation system: ${NGS_TEXT[state.ngsStatus]}`, () =>
          dispatch({ type: "setNgsStatus", status: next }),
        )}
      >
        <title>{`Nitrogen generation system (NGS) · módulo de separación de aire en la bahía de packs izquierda, bajo el tanque central
Convierte aire de sangrado del ducto izquierdo en aire enriquecido en nitrógeno (NEA) para el tanque central
En tierra está apagado y su shutoff valve cerrada (sólo funciona en vuelo o en modo test, FCOM 12.20.1)
Indicador: ${NGS_TEXT[state.ngsStatus]} (clic para pasar a ${NGS_TEXT[next]})`}</title>
        <rect x={-NGS_HALF_WIDTH} y="-1.3" width={NGS_HALF_WIDTH * 2} height="2.6" rx="0.4" className="fill-sim-surface transition-colors group-hover:stroke-white" stroke={NEA} strokeWidth="0.25" />
        <text textAnchor="middle" dominantBaseline="middle" y="0.05" fontSize="1.05" fontWeight="bold" fill={NEA} className="pointer-events-none font-sim-sans">
          NGS
        </text>
      </g>
    </g>
  );
}

function NgsIndicatorMarker({ onOpen }: { onOpen: () => void }) {
  const { state } = useFuel();
  const color = state.ngsStatus === "operational" ? "#22c55e" : state.ngsStatus === "degraded" ? "#3b6bff" : AMBER;
  return (
    <g
      transform={`translate(${NGS_INDICATOR_AT[0]} ${NGS_INDICATOR_AT[1]})`}
      data-sensor-id="ngs-indicator"
      {...controlProps("Abrir el indicador del NGS", onOpen)}
    >
      <title>{`Indicador de operabilidad del NGS · hueco del tren principal derecho, junto al panel P28
Luz: ${NGS_TEXT[state.ngsStatus]}
(Clic para abrir el indicador)`}</title>
      <rect x="-1.9" y="-1.6" width="3.8" height="3.2" fill="transparent" />
      <rect x="-1.5" y="-1" width="3" height="2" rx="0.3" className="fill-sim-surface stroke-white transition-colors group-hover:stroke-sim-accent" strokeWidth="0.25" />
      <circle r="0.45" fill={color} />
      <TinyLabel x={-1.9} y={0} anchor="end" className="fill-zinc-300">
        NGS
      </TinyLabel>
    </g>
  );
}

// ---------------------------------------------------------------------------
// Layers

/** Tank contents and structure, vents and refuel lines: under the other layers. */
export function FuelSystemUnderLayer({ bleedShown }: { bleedShown: boolean }) {
  return (
    <g data-layer="fuel-under" className="select-none">
      {bleedShown && <NgsBleedInlet />}
      <TankShape tank="tank1" />
      <TankShape tank="center" />
      <TankShape tank="tank2" />
      <TankStructure />
      <Vents />
    </g>
  );
}

/** Lines, pumps, valves and controls: drawn on top of everything. */
export function FuelSystemLayer({
  onOpenFuelingPanel,
  onOpenNgsIndicator,
}: {
  onOpenFuelingPanel: () => void;
  onOpenNgsIndicator: () => void;
}) {
  return (
    <g data-layer="fuel" className="select-none" aria-label="Sistema de combustible">
      <TankValves />
      <VentScoops />
      <FuelingStation onOpenPanel={onOpenFuelingPanel} />
      <Scavenge />
      <ManifoldLines />
      <ApuSupply />
      <EngineSupply engine="eng1" />
      <EngineSupply engine="eng2" />
      <CrossfeedValve />
      {(Object.keys(PUMP_AT) as PumpId[]).map((pump) => (
        <PumpControl key={pump} pump={pump} />
      ))}
      <TempSensor />
      <NgsModule />
      <NgsIndicatorMarker onOpen={onOpenNgsIndicator} />
      <TankLabel tank="tank1" />
      <TankLabel tank="center" />
      <TankLabel tank="tank2" />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Popovers

/** P15 opened from its door: opening the door powers the panel (FCOM 12.10.8). */
export function FuelingPanelPopover({
  svgRef,
  view,
  onClose,
}: {
  svgRef: RefObject<SVGSVGElement | null>;
  view: PlanView;
  onClose: () => void;
}) {
  return (
    <PlanViewPopover
      svgRef={svgRef}
      view={view}
      anchor={FUELING_PANEL_AT}
      anchorHalfWidth={2.3}
      title="TEST GAGES & FUELING · P15"
      location="R WING LEADING EDGE"
      ariaLabel="Test gages and fueling panel (P15)"
      closeLabel="Cerrar el panel de carga"
      size={FUELING_PANEL_SIZE}
      onClose={onClose}
    >
      <FuelingDoor />
      <FuelingPanel />
    </PlanViewPopover>
  );
}

/** The fueling panel door is open while its popover is: that powers the panel. */
function FuelingDoor() {
  const { dispatch } = useFuel();
  useEffect(() => {
    dispatch({ type: "setFuelingDoor", open: true });
    return () => dispatch({ type: "setFuelingDoor", open: false });
  }, [dispatch]);
  return null;
}

export function NgsIndicatorPopover({
  svgRef,
  view,
  onClose,
}: {
  svgRef: RefObject<SVGSVGElement | null>;
  view: PlanView;
  onClose: () => void;
}) {
  return (
    <PlanViewPopover
      svgRef={svgRef}
      view={view}
      anchor={NGS_INDICATOR_AT}
      anchorHalfWidth={1.9}
      title="NGS INDICATOR"
      location="R MAIN WHEEL WELL"
      ariaLabel="Nitrogen generation system indicator"
      closeLabel="Cerrar el indicador del NGS"
      size={NGS_INDICATOR_SIZE}
      onClose={onClose}
    >
      <NgsIndicator />
    </PlanViewPopover>
  );
}

// ---------------------------------------------------------------------------
// Legend

export type FuelLegendKind =
  | "feed"
  | "suction"
  | "refuel"
  | "scavenge"
  | "vent"
  | "pump"
  | "check"
  | "fueling-valve"
  | "jet-pump"
  | "filter"
  | "tank";

export const FUEL_LEGEND: { kind: FuelLegendKind; label: string }[] = [
  { kind: "tank", label: "FUEL TANK" },
  { kind: "feed", label: "FUEL FEED" },
  { kind: "suction", label: "SUCTION FEED" },
  { kind: "refuel", label: "REFUEL" },
  { kind: "scavenge", label: "SCAVENGE" },
  { kind: "vent", label: "VENT" },
  { kind: "pump", label: "AC PUMP" },
  { kind: "check", label: "FUEL CHECK" },
  { kind: "fueling-valve", label: "FUELING VALVE" },
  { kind: "jet-pump", label: "JET PUMP" },
  { kind: "filter", label: "FUEL FILTER" },
];

export function FuelLegendIcon({ kind }: { kind: FuelLegendKind }) {
  const line = (color: string, dash?: string) => (
    <path d="M -3 0 H 3" stroke={color} strokeWidth="0.7" strokeDasharray={dash} strokeLinecap="round" />
  );
  return (
    <svg className="h-4 w-5 shrink-0 overflow-visible" viewBox="-3.5 -2.5 7 5" aria-hidden="true">
      {kind === "feed" && line(FUEL)}
      {kind === "suction" && line(FUEL, "0.9 0.6")}
      {kind === "refuel" && line(REFUEL)}
      {kind === "scavenge" && line(SCAVENGE, "0.8 0.5")}
      {kind === "vent" && line(VENT, "0.5 0.45")}
      {kind === "pump" && (
        <g transform="scale(1.3)">
          <PumpGlyph state="operating" />
        </g>
      )}
      {kind === "check" && <CheckValveGlyph x={0} y={0} angle={0} />}
      {kind === "fueling-valve" && (
        <g transform="translate(0 1) scale(1.3)">
          <SolenoidValveGlyph open={false} />
        </g>
      )}
      {kind === "jet-pump" && (
        <g transform="scale(1.4)">
          <JetPumpGlyph active />
        </g>
      )}
      {kind === "filter" && (
        <g transform="scale(1.4)">
          <FilterGlyph clogged={false} />
        </g>
      )}
      {kind === "tank" && <rect x="-2.6" y="-1.6" width="5.2" height="3.2" rx="0.3" fill={FUEL} fillOpacity="0.25" stroke={FUEL} strokeOpacity="0.6" strokeWidth="0.3" />}
    </svg>
  );
}
