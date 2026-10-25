"use client";

// Fire protection (FCOM 8.20) in the plan view, in the same visual language
// as the pneumatic network and the ECS mockup. Component locations come from
// the FCOM and the -800/NG sources in docs/fire-sources (NOTAS-investigacion):
//   - engines: two detector loops (A, B) through four assemblies per engine
//     (upper and lower fan case, left and right core); the fire switch closes
//     the engine and spar fuel shutoff valves and the hydraulic shutoff valve
//   - engine bottles: two, upper aft left corner of the left main wheel well,
//     squib 1 of each to ENG 1 and squib 2 to ENG 2, crossed tubing (8.20.3)
//   - APU: one loop with three elements (upper and lower compartment,
//     tailpipe), bottle in the section 48 accessory compartment, fuel shutoff
//     valve and air inlet door (right side of the fuselage, FCOM 7.30)
//   - main wheel well: one loop on the ceiling, no extinguishing
//   - cargo: dual loop smoke detectors in the ceilings (2 pairs fwd, 3 aft),
//     one bottle in the mix bay on the aft bulkhead with FWD and AFT squibs
//     and a discharge nozzle per pair (8.20.7)
//   - lavatories A, D, E: ceiling smoke detector and the heat activated
//     extinguisher under the sink (8.10.9)
// Tubing routes between documented ends are drawn plausibly; they are not
// documented. Everything here reads and writes the fire context only.

import { useEffect, useRef, type RefObject } from "react";
import { useFire } from "../simulation/fire/fire-context";
import {
  CARGO_DETECTOR_PAIRS,
  DISCHARGE_DELAY_MS,
  LAVATORIES,
  SMOKE_DETECTORS,
  type ApuLoopState,
  type BottleId,
  type CargoCompartment,
  type DetectorLoop,
  type DischargeTarget,
  type EngineId,
  type EngineLoopState,
  type LavatoryId,
  type SmokeDetectorState,
} from "../simulation/fire/fire-protection";
import { useFuel } from "../simulation/fuel/fuel-context";
import { usePneumatic } from "../simulation/pneumatic/pneumatic-context";
import {
  AC_DIST_BAY_Y,
  AFT_CARGO_BAY_Y,
  FWD_CARGO_BAY_Y,
  MAIN_WHEEL_WELL_Y,
  stationToY,
} from "./lower-lobe-layer";
import {
  AMBER,
  controlProps,
  mirrorX,
  RED,
  ShutoffValve,
  StatusTag,
  TinyLabel,
  toPath,
  type P,
} from "./plan-view-glyphs";
import { ApuGroundControlPanel, APU_GROUND_CONTROL_PANEL_SIZE } from "./aircraft-panels";
import { PlanViewPopover, type PlanView } from "./plan-view-popover";
import {
  APU_FUEL_LINE,
  APU_FUEL_SHUTOFF_VALVE_AT,
  engineFuelLine,
  engineFuelValveAt,
  sparValveAt,
} from "./fuel-system-layer";

const DETECTOR_COLOR = "#d4d4d8";
const FAILED_COLOR = "#71717a";
// Extinguishing agent: the palette accent, outside both air colour scales
const AGENT = "var(--color-sim-accent)";

/** Left side geometry, mirrored onto the right side for ENG 2. */
const onSide = (engine: EngineId, [x, y]: P): P => (engine === "eng1" ? [x, y] : [mirrorX(x), y]);

const ENGINE_NUMBER: Record<EngineId, 1 | 2> = { eng1: 1, eng2: 2 };

// ---------------------------------------------------------------------------
// Shared glyphs

/** Zone glow, clipped to the airplane outline: amber overheat, red fire. */
function ZoneGlow({
  x,
  y,
  width,
  height,
  level,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  level: "none" | "overheat" | "fire";
}) {
  if (level === "none") return null;
  return (
    <g clipPath="url(#boeing-737-800-clip)" className="pointer-events-none">
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={level === "fire" ? RED : AMBER}
        opacity={level === "fire" ? 0.26 : 0.2}
        className="animate-pulse"
      />
    </g>
  );
}

/** Detector loop line with a wider transparent hit stroke along it. */
function LoopLine({
  d,
  state,
  hitWidth = 0.8,
}: {
  d: string;
  state: EngineLoopState;
  hitWidth?: number;
}) {
  const color =
    state === "fire" ? RED : state === "overheat" ? AMBER : state === "failed" ? FAILED_COLOR : DETECTOR_COLOR;
  return (
    <g className="fill-none [stroke-linecap:round] [stroke-linejoin:round]">
      <path d={d} stroke="transparent" strokeWidth={hitWidth} />
      {/* Hover halo */}
      <path
        d={d}
        stroke={color}
        strokeWidth="0.75"
        className="opacity-0 transition-opacity duration-150 group-hover:opacity-30"
      />
      <path
        d={d}
        stroke={color}
        strokeWidth="0.3"
        strokeDasharray={state === "failed" ? "0.7 0.5" : undefined}
      />
    </g>
  );
}

/**
 * Detector assembly or element straddling its loop(s), `across` the loop
 * direction. `hidden` (dashed) marks one under the engine or APU, which a
 * plan view cannot see.
 */
function DetectorElement({
  x,
  y,
  vertical,
  hidden = false,
  title,
}: {
  x: number;
  y: number;
  vertical: boolean;
  hidden?: boolean;
  title?: string;
}) {
  const [w, h] = vertical ? [0.9, 2.1] : [2.1, 0.9];
  return (
    <rect
      x={x - w / 2}
      y={y - h / 2}
      width={w}
      height={h}
      rx="0.25"
      className="fill-sim-surface stroke-white"
      strokeWidth="0.28"
      strokeDasharray={hidden ? "0.45 0.3" : undefined}
    >
      {title && <title>{title}</title>}
    </rect>
  );
}

/** Flame: the quick "fire in this zone" injection point. */
function FlameGlyph({ burning }: { burning: boolean }) {
  return (
    <g>
      <path
        d="M 0 -1.25 C 0.75 -0.45 1.05 0.15 0.8 0.7 C 0.6 1.15 0.25 1.3 0 1.3 C -0.25 1.3 -0.6 1.15 -0.8 0.7 C -1.05 0.15 -0.45 -0.15 -0.2 -0.75 C -0.05 -0.35 0.1 -0.2 0.25 -0.15 C 0.3 -0.55 0.15 -0.95 0 -1.25 Z"
        fill={burning ? RED : "none"}
        stroke={burning ? "#fecaca" : "#a1a1aa"}
        strokeWidth="0.22"
        strokeLinejoin="round"
        className={burning ? "animate-pulse" : "transition-colors group-hover:stroke-white"}
      />
      {burning && (
        <path
          d="M 0 0.1 C 0.3 0.45 0.35 0.75 0 1.05 C -0.35 0.75 -0.3 0.45 0 0.1 Z"
          fill="#fde68a"
        />
      )}
    </g>
  );
}

function ZoneFireSpot({
  x,
  y,
  burning,
  zone,
  onToggle,
}: {
  x: number;
  y: number;
  burning: boolean;
  zone: string;
  onToggle: () => void;
}) {
  return (
    <g
      transform={`translate(${x} ${y})`}
      {...controlProps(`Fuego en ${zone}: ${burning ? "activo" : "sin fuego"}`, onToggle)}
    >
      <title>{`Fuego en ${zone}
Estado: ${burning ? "FUEGO" : "sin fuego"}
(Clic para ${burning ? "apagar: los detectores vuelven a normal" : "provocar fuego en la zona: todos los detectores sanos lo detectan"})`}</title>
      <circle r="1.9" fill="transparent" />
      <circle
        r="1.6"
        fill="none"
        stroke="#ffffff"
        strokeWidth="0.25"
        strokeDasharray="0.7 0.5"
        className="opacity-0 transition-opacity duration-150 group-hover:opacity-80"
      />
      <FlameGlyph burning={burning} />
    </g>
  );
}

/** Thin service line (fuel, hydraulic) a fire shutoff valve sits on. */
function ServiceLine({ points }: { points: P[] }) {
  return (
    <path
      d={toPath(points)}
      className="fill-none stroke-zinc-500 pointer-events-none"
      strokeWidth="0.35"
      strokeLinecap="round"
    />
  );
}

// ---------------------------------------------------------------------------
// Extinguishing agent: bottles, squibs, tubing, nozzles

/** Shrinks the agent inside a bottle while it discharges (no React state per frame). */
function useDrainAnimation(ref: RefObject<SVGElement | null>, active: boolean, duration: number) {
  useEffect(() => {
    const element = ref.current;
    if (!active || !element) return;
    const animation = element.animate([{ transform: "scale(1)" }, { transform: "scale(0)" }], {
      duration,
      easing: "ease-in",
      fill: "forwards",
    });
    return () => animation.cancel();
  }, [ref, active, duration]);
}

/** Spherical extinguisher bottle; the agent inside drains while discharging. */
function ExtinguisherBottle({
  bottle,
  x,
  y,
  r = 1.35,
  label,
  title,
}: {
  bottle: BottleId;
  x: number;
  y: number;
  r?: number;
  label?: string;
  title: string;
}) {
  const { state } = useFire();
  const { status } = state.bottles[bottle];
  const agentRef = useRef<SVGCircleElement>(null);
  useDrainAnimation(agentRef, status === "discharging", DISCHARGE_DELAY_MS[bottle]);
  const statusText =
    status === "charged" ? "CARGADA" : status === "discharging" ? "DESCARGANDO" : "DESCARGADA (vacía)";
  return (
    <g transform={`translate(${x} ${y})`}>
      <title>{`${title} · ${statusText}`}</title>
      <circle r={r} className="fill-sim-surface" stroke={status === "discharged" ? "#a1a1aa" : "#ffffff"} strokeWidth="0.4" />
      {status !== "discharged" && (
        <circle
          ref={agentRef}
          r={r - 0.45}
          fill={AGENT}
          opacity={0.85}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        />
      )}
      {label && (
        <text
          y="0.08"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="1.1"
          fontWeight="bold"
          className={`pointer-events-none font-sim-sans ${status === "discharged" ? "fill-zinc-400" : "fill-sim-bg"}`}
        >
          {label}
        </text>
      )}
    </g>
  );
}

/**
 * Discharge squib (cartridge) on a bottle outlet: dark when idle, white and
 * haloed when armed, spent (crossed) once fired.
 */
function Squib({
  x,
  y,
  armed,
  fired,
  title,
}: {
  x: number;
  y: number;
  armed: boolean;
  fired: boolean;
  title: string;
}) {
  const stateText = fired ? "DISPARADO (sin continuidad)" : armed ? "ARMADO" : "desarmado";
  return (
    <g transform={`translate(${x} ${y})`}>
      <title>{`${title} · ${stateText}`}</title>
      {armed && !fired && (
        <rect x="-0.75" y="-0.55" width="1.5" height="1.1" rx="0.3" fill="none" stroke="#ffffff" strokeWidth="0.2" opacity="0.6" className="animate-pulse" />
      )}
      <rect
        x="-0.45"
        y="-0.3"
        width="0.9"
        height="0.6"
        rx="0.12"
        fill={fired ? "#27272a" : armed ? "#ffffff" : "#3f3f46"}
        stroke={fired ? "#71717a" : "#e4e4e7"}
        strokeWidth="0.16"
      />
      {fired && <path d="M -0.3 -0.2 L 0.3 0.2 M -0.3 0.2 L 0.3 -0.2" stroke={AGENT} strokeWidth="0.14" />}
    </g>
  );
}

/**
 * Extinguisher tubing: dark casing and grey core while empty; the agent
 * flows along it while its bottle discharges and stays tinted afterwards.
 */
function AgentTube({
  points,
  flowing,
  delivered,
  title,
}: {
  points: P[];
  flowing: boolean;
  delivered: boolean;
  title: string;
}) {
  const d = toPath(points);
  return (
    <g className="fill-none [stroke-linecap:round] [stroke-linejoin:round]">
      <title>{`${title} · ${flowing ? "AGENTE FLUYENDO" : delivered ? "descargada" : "vacía"}`}</title>
      <path d={d} className="stroke-sim-bg" strokeWidth="1.25" />
      {/* Tinted with the agent colour; faint while the tube is empty */}
      <path d={d} stroke={AGENT} strokeWidth="0.55" opacity={flowing ? 1 : delivered ? 0.85 : 0.6} />
      {flowing && (
        <path d={d} stroke="#ffffff" strokeWidth="0.3" strokeDasharray="0.5 1.3" opacity="0.85">
          <animate attributeName="stroke-dashoffset" from="1.8" to="0" dur="0.45s" repeatCount="indefinite" />
        </path>
      )}
    </g>
  );
}

/** Discharge nozzle (or engine/APU discharge port): oval with two orifices. */
function Nozzle({ x, y, spraying, title }: { x: number; y: number; spraying: boolean; title: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <title>{`${title}${spraying ? " · DESCARGANDO AGENTE" : ""}`}</title>
      {spraying && (
        <ellipse rx="1.6" ry="1.15" fill={AGENT} opacity="0.35">
          <animate attributeName="opacity" values="0.45;0.1;0.45" dur="0.8s" repeatCount="indefinite" />
        </ellipse>
      )}
      <rect x="-0.8" y="-0.5" width="1.6" height="1" rx="0.5" className="fill-sim-surface stroke-white" strokeWidth="0.25" />
      <circle cx="-0.28" r="0.15" className="fill-white" />
      <circle cx="0.28" r="0.15" className="fill-white" />
    </g>
  );
}

function tubeFlow(bottle: { status: string; dischargedInto: DischargeTarget[] }, target: DischargeTarget) {
  const into = bottle.dischargedInto.includes(target);
  return { flowing: into && bottle.status === "discharging", delivered: into && bottle.status === "discharged" };
}

// ---------------------------------------------------------------------------
// Engines

// Left engine (ENG 1) nacelle; ENG 2 mirrors it about the centerline.
// Two loops close to the nacelle walls, their forward run across the fan
// case just aft of the cowl anti-ice duct, their aft run near the strut.
const ENGINE_LOOPS: Record<DetectorLoop, P[]> = {
  A: [[301.6, 215.95], [328.7, 215.95], [329.3, 222], [329.2, 231], [327.5, 242.2], [302, 242.2], [300.8, 231], [300.8, 222]],
  B: [[302.3, 216.65], [328, 216.65], [328.5, 222], [328.4, 231], [326.8, 241.5], [302.7, 241.5], [301.6, 231], [301.6, 222]],
};
// Four assemblies per engine, one A and one B element each (Ferreira, ATA 26).
// Upper and lower fan case share a plan position; the lower one is drawn
// beside it, dashed.
const ENGINE_ASSEMBLIES: { name: string; at: P; vertical: boolean; hidden?: boolean }[] = [
  { name: "fan case superior", at: [308.5, 216.3], vertical: true },
  { name: "fan case inferior (debajo del motor)", at: [315.5, 216.3], vertical: true, hidden: true },
  { name: "core izquierdo", at: [301.2, 231], vertical: false },
  { name: "core derecho", at: [328.8, 231], vertical: false },
];
const NACELLE_GLOW = { x: 299, y: 207, width: 32, height: 37.2 };
const ENGINE_FLAME: P = [315.5, 230];
const ENGINE_PORT: P = [317, 239.4];
// Fire switch shutoffs (FCOM 8.20.2): the spar and engine fuel shutoff
// valves where the fuel layer draws them (fuel-system-layer), and the
// hydraulic shutoff valve on the engine driven pump supply, through the strut.
const HYD_LINE_X = 312;
const HYD_VALVE: P = [HYD_LINE_X, 260.2];
const ENGINE_TAGS: P = [315, 204.4];

// Engine bottles: upper aft left corner of the left main wheel well. Outlet 1
// of each bottle feeds ENG 1, outlet 2 ENG 2, and the tubes cross like the
// FCOM schematic. Each run keeps the two bottles' tubes side by side.
const ENGINE_BOTTLE_Y = 300.6;
const ENGINE_BOTTLE_X: Record<"left" | "right", number> = { left: 359.2, right: 365.6 };
const BOTTLE_R = 1.35;
const OUTLET_DX: Record<EngineId, number> = { eng1: -0.75, eng2: 0.75 };
const OUTLET_Y = ENGINE_BOTTLE_Y - BOTTLE_R - 0.25;
// Runs: across the well (one lane per tube), out along the side of body to the
// wing leading edge, outboard to the strut and forward to the discharge port.
const ENGINE_RUN = {
  wellLaneY: { eng1: { left: 287, right: 286.2 }, eng2: { left: 285, right: 284.2 } },
  sideOfBodyX: { left: 347.4, right: 348.2 },
  leadingEdgeY: { left: 258, right: 257.2 },
  strutX: { left: 316.6, right: 317.4 },
} as const;

function engineTube(bottle: "left" | "right", engine: EngineId): P[] {
  const outletX = ENGINE_BOTTLE_X[bottle] + OUTLET_DX[engine];
  const laneY = ENGINE_RUN.wellLaneY[engine][bottle];
  const [sideX] = onSide(engine, [ENGINE_RUN.sideOfBodyX[bottle], 0]);
  const [strutX] = onSide(engine, [ENGINE_RUN.strutX[bottle], 0]);
  const leY = ENGINE_RUN.leadingEdgeY[bottle];
  return [
    [outletX, OUTLET_Y],
    [outletX, laneY],
    [sideX, laneY],
    [sideX, leY],
    [strutX, leY],
    [strutX, ENGINE_PORT[1] + 0.45],
  ];
}

const LOOP_CYCLE: EngineLoopState[] = ["normal", "overheat", "fire", "failed"];
const LOOP_STATE_TEXT: Record<EngineLoopState, string> = {
  normal: "NORMAL",
  overheat: "SOBRETEMPERATURA",
  fire: "FUEGO",
  failed: "FALLADO",
};

function zoneLevel(states: EngineLoopState[]): "none" | "overheat" | "fire" {
  if (states.includes("fire")) return "fire";
  if (states.includes("overheat")) return "overheat";
  return "none";
}

/** Nacelle zone glow, drawn under the networks. */
function EngineZoneGlow({ engine }: { engine: EngineId }) {
  const { state } = useFire();
  const loops = state.engineLoops[engine];
  const x = engine === "eng1" ? NACELLE_GLOW.x : mirrorX(NACELLE_GLOW.x + NACELLE_GLOW.width);
  return <ZoneGlow {...NACELLE_GLOW} x={x} level={zoneLevel([loops.A, loops.B])} />;
}

function EngineServiceLines({ engine, fuelShown }: { engine: EngineId; fuelShown: boolean }) {
  const hyd: P[] = [[HYD_LINE_X, 263.2], [HYD_LINE_X, 242.6]];
  return (
    <g>
      {/* The fuel layer draws the fuel line itself when it is on */}
      {!fuelShown && <ServiceLine points={engineFuelLine(engine)} />}
      <ServiceLine points={hyd.map((p) => onSide(engine, p))} />
    </g>
  );
}

function EngineFireProtection({ engine, fuelShown }: { engine: EngineId; fuelShown: boolean }) {
  const { state, indications, dispatch } = useFire();
  const { state: fuel, indications: fuelLights } = useFuel();
  const n = ENGINE_NUMBER[engine];
  const loops = state.engineLoops[engine];
  const shutoff = indications.engineShutoff[engine];
  const sparOpen = fuel.valveOpen[engine === "eng1" ? "spar1" : "spar2"];
  const engineValveOpen = fuelLights.engines[engine].engineValveOpen;
  const [sparX, sparY] = sparValveAt(engine);
  const [valveX, valveY] = engineFuelValveAt(engine);
  const side = (p: P) => onSide(engine, p);
  const outboard = engine === "eng1" ? "end" : "start";
  const inboard = engine === "eng1" ? "start" : "end";

  const burning = (["A", "B"] as const).some((loop) => loops[loop] === "fire");
  const toggleFire = () => {
    for (const loop of ["A", "B"] as const) {
      if (loops[loop] === "failed") continue;
      dispatch({ type: "setEngineLoop", engine, loop, state: burning ? "normal" : "fire" });
    }
  };

  const fuelValveTitle = (name: string, open: boolean) =>
    `${name} · motor ${n} · ${
      open ? "ABIERTA" : shutoff ? "CERRADA (fire switch tirado)" : "CERRADA (start lever en CUTOFF o motor detenido)"
    }`;
  const flowInto = (bottle: "left" | "right") => tubeFlow(state.bottles[bottle], engine);
  const spraying = flowInto("left").flowing || flowInto("right").flowing;

  return (
    <g data-fire-zone={engine}>
      {(["A", "B"] as const).map((loop) => {
        const current = loops[loop];
        const next = LOOP_CYCLE[(LOOP_CYCLE.indexOf(current) + 1) % LOOP_CYCLE.length];
        return (
          <g
            key={loop}
            data-sensor-id={`fire-${engine}-${loop}`}
            {...controlProps(`Lazo detector ${loop} del motor ${n}: ${LOOP_STATE_TEXT[current]}`, () =>
              dispatch({ type: "setEngineLoop", engine, loop, state: next }),
            )}
          >
            <title>{`Lazo detector de sobretemperatura/fuego ${loop} · motor ${n}
4 elementos: fan case superior e inferior, core izquierdo y derecho
Estado: ${LOOP_STATE_TEXT[current]}
(Clic: normal → sobretemperatura → fuego → fallado → normal; ahora pasa a ${LOOP_STATE_TEXT[next].toLowerCase()})`}</title>
            <LoopLine d={toPath(ENGINE_LOOPS[loop].map(side), true)} state={current} />
          </g>
        );
      })}
      {ENGINE_ASSEMBLIES.map(({ name, at, vertical, hidden }) => {
        const [x, y] = side(at);
        return (
          <DetectorElement
            key={name}
            x={x}
            y={y}
            vertical={vertical}
            hidden={hidden}
            title={`Conjunto detector · ${name} · motor ${n} (un elemento del lazo A y uno del lazo B)`}
          />
        );
      })}

      <ZoneFireSpot
        x={side(ENGINE_FLAME)[0]}
        y={ENGINE_FLAME[1]}
        burning={burning}
        zone={`la góndola del motor ${n}`}
        onToggle={toggleFire}
      />

      <Nozzle
        x={side(ENGINE_PORT)[0]}
        y={ENGINE_PORT[1]}
        spraying={spraying}
        title={`Puerto de descarga del agente extintor · motor ${n}`}
      />

      {/* Fire switch shutoff valves (the fuel ones, unless the fuel layer draws them) */}
      {!fuelShown && (
        <g>
          <ShutoffValve
            x={sparX}
            y={sparY}
            open={sparOpen}
            title={fuelValveTitle("Spar fuel shutoff valve (larguero delantero, estación de montaje del motor)", sparOpen)}
          />
          <ShutoffValve
            x={valveX}
            y={valveY}
            open={engineValveOpen}
            title={fuelValveTitle("Engine fuel shutoff valve (en el motor)", engineValveOpen)}
          />
          <TinyLabel x={sparX + (engine === "eng1" ? -1.6 : 1.6)} y={sparY - 1.7} anchor={outboard}>
            SPAR
          </TinyLabel>
          <TinyLabel x={valveX + (engine === "eng1" ? -1.5 : 1.5)} y={valveY} anchor={outboard}>
            FUEL
          </TinyLabel>
        </g>
      )}
      <ShutoffValve
        x={side(HYD_VALVE)[0]}
        y={HYD_VALVE[1]}
        open={!shutoff}
        title={`Hydraulic fluid shutoff valve · bomba hidráulica del motor ${n} (sistema ${n === 1 ? "A" : "B"}) · ${
          shutoff ? "CERRADA (fire switch tirado; luz LOW PRESSURE desactivada)" : "ABIERTA"
        }`}
      />
      <TinyLabel x={side([HYD_LINE_X + 1.5, 0])[0]} y={HYD_VALVE[1] + 1.6} anchor={inboard}>
        HYD
      </TinyLabel>

      {/* Generator and thrust reverser: no hardware drawn, only their state */}
      {shutoff && (
        <g>
          <StatusTag
            x={side(ENGINE_TAGS)[0] - 0.6}
            y={ENGINE_TAGS[1]}
            anchor="end"
            title={`Generador ${n}: relé de control y breaker disparados por el fire switch`}
          >
            GEN TRIP
          </StatusTag>
          <StatusTag
            x={side(ENGINE_TAGS)[0] + 0.6}
            y={ENGINE_TAGS[1]}
            anchor="start"
            title={`Reversor de empuje del motor ${n} inhibido por el fire switch`}
          >
            REV OFF
          </StatusTag>
        </g>
      )}
    </g>
  );
}

function EngineBottles() {
  const { state, indications } = useFire();
  return (
    <g data-fire-zone="engine-bottles">
      {(["left", "right"] as const).map((bottle) => (
        <g key={bottle}>
          <ExtinguisherBottle
            bottle={bottle}
            x={ENGINE_BOTTLE_X[bottle]}
            y={ENGINE_BOTTLE_Y}
            r={BOTTLE_R}
            label={bottle === "left" ? "L" : "R"}
            title={`Botella extintora de motores ${bottle === "left" ? "LEFT" : "RIGHT"} (halón, hueco del tren principal izquierdo)`}
          />
          {(["eng1", "eng2"] as const).map((engine) => (
            <Squib
              key={engine}
              x={ENGINE_BOTTLE_X[bottle] + OUTLET_DX[engine]}
              y={OUTLET_Y + 0.15}
              armed={indications.squibArmed(bottle, engine)}
              fired={state.bottles[bottle].firedSquibs.includes(engine)}
              title={`Squib ${ENGINE_NUMBER[engine]} de la botella ${bottle === "left" ? "L" : "R"} → motor ${ENGINE_NUMBER[engine]}`}
            />
          ))}
        </g>
      ))}
    </g>
  );
}

function EngineTubing() {
  const { state } = useFire();
  return (
    <g data-fire-zone="engine-tubing">
      {(["eng1", "eng2"] as const).flatMap((engine) =>
        (["left", "right"] as const).map((bottle) => (
          <AgentTube
            key={`${bottle}-${engine}`}
            points={engineTube(bottle, engine)}
            {...tubeFlow(state.bottles[bottle], engine)}
            title={`Tubería de descarga · botella ${bottle === "left" ? "L" : "R"} → motor ${ENGINE_NUMBER[engine]} (recorrido ilustrativo)`}
          />
        )),
      )}
    </g>
  );
}

// ---------------------------------------------------------------------------
// APU (tailcone)

// APU firewall: forward end of the APU compartment, aft of the section 48
// accessory compartment that holds the bottle.
const APU_FIREWALL_Y = stationToY(1156);
const APU_LOOP: P[] = [[371, 504.2], [389, 504.2], [384.3, 525], [375.7, 525]];
const APU_ELEMENTS: { name: string; at: P; vertical: boolean; hidden?: boolean }[] = [
  { name: "compartimento superior", at: [377.6, 504.2], vertical: true },
  { name: "compartimento inferior (debajo del APU)", at: [383, 504.2], vertical: true, hidden: true },
  { name: "tailpipe (escape)", at: [380, 525], vertical: true },
];
// APU compartment: the tailcone aft of the firewall, along the outline's sides
const APU_COMPARTMENT: P[] = [
  [365.2 + (APU_FIREWALL_Y - 489.4) * 0.2518, APU_FIREWALL_Y],
  [394.6 - (APU_FIREWALL_Y - 489.3) * 0.2464, APU_FIREWALL_Y],
  [384.2, 531.5],
  [381.5, 535],
  [380, 550.7],
  [378.5, 535.2],
  [375.8, 531.5],
];
const APU_FLAME: P = [380.5, 511.3];
const APU_PORT: P = [384.2, 515.5];
// Starboard side: the bottle's discharge indicator discs are on the aft
// right fuselage (b737.org.uk); the side itself is not confirmed.
const APU_BOTTLE: P = [390.6, 479.6];
const APU_TUBE: P[] = [
  [APU_BOTTLE[0], APU_BOTTLE[1] + BOTTLE_R + 0.25],
  [APU_BOTTLE[0], 487.5],
  [APU_PORT[0], 499],
  [APU_PORT[0], APU_PORT[1] + 0.45],
];
// Left of the elevator pitot probes on the fin, right of the APU bleed duct
// Air inlet door on the right side of the fuselage (FCOM 7.30), ahead of the
// APU, hinged along the skin.
const APU_INLET_DOOR = { x: 389.5, y: 507.6, angle: 103.8 };
const APU_TAGS: P = [390.8, 512.5];

const APU_LOOP_CYCLE: ApuLoopState[] = ["normal", "fire", "failed"];
const APU_LOOP_TEXT: Record<ApuLoopState, string> = { normal: "NORMAL", fire: "FUEGO", failed: "FALLADO" };

function ApuFirewall() {
  return (
    <g clipPath="url(#boeing-737-800-clip)" className="pointer-events-none">
      <line
        x1="355"
        y1={APU_FIREWALL_Y}
        x2="405"
        y2={APU_FIREWALL_Y}
        className="stroke-zinc-500"
        strokeWidth="0.35"
        strokeDasharray="1 0.6"
        opacity={0.7}
      />
    </g>
  );
}

function ApuInletDoor({ open }: { open: boolean }) {
  const { x, y, angle } = APU_INLET_DOOR;
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <title>{`APU air inlet door (lado derecho del fuselaje) · ${open ? "ABIERTA" : "CERRADA"}`}</title>
      <rect x="-1.5" y="-0.55" width="3" height="1.1" rx="0.25" className="fill-sim-surface stroke-white" strokeWidth="0.3" />
      {/* Door hinged at its forward edge, swinging out into the airstream */}
      <line
        x1="-1.2"
        y1="0"
        x2="1.2"
        y2="0"
        className={open ? "stroke-white" : "stroke-zinc-400"}
        strokeWidth="0.35"
        strokeLinecap="round"
        style={{
          transform: open ? "rotate(-28deg)" : "rotate(0deg)",
          transformOrigin: "-1.2px 0px",
          transition: "transform 0.4s ease-in-out",
        }}
      />
    </g>
  );
}

function ApuFireProtection({ fuelShown }: { fuelShown: boolean }) {
  const { state, indications, dispatch } = useFire();
  const { sourcesState } = usePneumatic();
  const { state: fuel } = useFuel();
  const fuelValveOpen = fuel.valveOpen.apu;
  const [sovX, sovY] = APU_FUEL_SHUTOFF_VALVE_AT;
  const current = state.apuLoop;
  const next = APU_LOOP_CYCLE[(APU_LOOP_CYCLE.indexOf(current) + 1) % APU_LOOP_CYCLE.length];
  const shutoff = indications.apuShutoff;
  const running = sourcesState.apuRunning;
  const apu = tubeFlow(state.bottles.apu, "apu");
  const shutoffCause = state.fireSwitches.apu
    ? "fire switch del APU tirado"
    : state.apuGroundHandlePulled
      ? "manija del panel de tierra P28 bajada"
      : null;

  return (
    <g data-fire-zone="apu">
      <g
        data-sensor-id="fire-apu-loop"
        {...controlProps(`Lazo detector de fuego del APU: ${APU_LOOP_TEXT[current]}`, () =>
          dispatch({ type: "setApuLoop", state: next }),
        )}
      >
        <title>{`Lazo detector de fuego del APU (lazo único)
3 elementos: compartimento superior, compartimento inferior y tailpipe
Estado: ${APU_LOOP_TEXT[current]}
(Clic: normal → fuego → fallado → normal; ahora pasa a ${APU_LOOP_TEXT[next].toLowerCase()})`}</title>
        <LoopLine d={toPath(APU_LOOP, true)} state={current} />
      </g>
      {APU_ELEMENTS.map(({ name, at: [x, y], vertical, hidden }) => (
        <DetectorElement
          key={name}
          x={x}
          y={y}
          vertical={vertical}
          hidden={hidden}
          title={`Elemento detector del APU · ${name}`}
        />
      ))}
      <ZoneFireSpot
        x={APU_FLAME[0]}
        y={APU_FLAME[1]}
        burning={current === "fire"}
        zone="el compartimento del APU"
        onToggle={() => {
          if (current !== "failed") dispatch({ type: "setApuLoop", state: current === "fire" ? "normal" : "fire" });
        }}
      />
      <Nozzle x={APU_PORT[0]} y={APU_PORT[1]} spraying={apu.flowing} title="Puerto de descarga del agente extintor · APU" />

      <ExtinguisherBottle
        bottle="apu"
        x={APU_BOTTLE[0]}
        y={APU_BOTTLE[1]}
        title="Botella extintora del APU (compartimento de accesorios del estabilizador, sección 48)"
      />
      <Squib
        x={APU_BOTTLE[0]}
        y={APU_BOTTLE[1] + BOTTLE_R + 0.1}
        armed={indications.squibArmed("apu", "apu")}
        fired={state.bottles.apu.firedSquibs.includes("apu")}
        title="Squib de la botella del APU (fire switch del APU o manija del panel P28)"
      />

      {/* APU fuel shutoff valve on the rear spar, unless the fuel layer draws it */}
      {!fuelShown && (
        <g>
          <ShutoffValve
            x={sovX}
            y={sovY}
            open={fuelValveOpen}
            title={`APU fuel shutoff valve (larguero trasero, hueco del tren izquierdo) · ${
              fuelValveOpen ? "ABIERTA" : shutoffCause ? `CERRADA (${shutoffCause})` : "CERRADA (APU apagada)"
            }`}
          />
          <TinyLabel x={sovX - 1.8} y={sovY} anchor="end">
            APU FUEL
          </TinyLabel>
        </g>
      )}
      <ApuInletDoor open={running && !shutoff} />

      {indications.apuAutoShutdown && (
        <StatusTag
          x={APU_TAGS[0]}
          y={APU_TAGS[1]}
          anchor="start"
          tone="alert"
          title="El APU se apagó automáticamente al detectar fuego"
        >
          AUTO SHUTDOWN
        </StatusTag>
      )}
      {shutoff && (
        <StatusTag
          x={APU_TAGS[0]}
          y={APU_TAGS[1] + (indications.apuAutoShutdown ? 2.2 : 0)}
          anchor="start"
          title={`Generador del APU: relé de control y breaker disparados (${shutoffCause})`}
        >
          GEN TRIP
        </StatusTag>
      )}
    </g>
  );
}

function ApuTubing({ fuelShown }: { fuelShown: boolean }) {
  const { state } = useFire();
  return (
    <g>
      {!fuelShown && <ServiceLine points={APU_FUEL_LINE} />}
      <AgentTube
        points={APU_TUBE}
        {...tubeFlow(state.bottles.apu, "apu")}
        title="Tubería de descarga · botella del APU → APU (recorrido ilustrativo)"
      />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Main wheel well: one loop on the ceiling of both wells, no extinguishing

const WHEEL_WELL_LOOP = { x: 357, y: MAIN_WHEEL_WELL_Y.fwd + 1.3, width: 43.8, height: 20.3 };
const WHEEL_WELL_FLAME: P = [396.5, 292.5];

function WheelWellLoop() {
  const { state, dispatch } = useFire();
  const fire = state.wheelWellLoop === "fire";
  const { x, y, width, height } = WHEEL_WELL_LOOP;
  const d = `M${x + 1} ${y} H${x + width - 1} Q${x + width} ${y} ${x + width} ${y + 1} V${y + height - 1} Q${x + width} ${y + height} ${x + width - 1} ${y + height} H${x + 1} Q${x} ${y + height} ${x} ${y + height - 1} V${y + 1} Q${x} ${y} ${x + 1} ${y} Z`;
  return (
    <g
      data-sensor-id="fire-wheel-well-loop"
      {...controlProps(`Lazo detector de fuego del hueco del tren principal: ${fire ? "FUEGO" : "NORMAL"}`, () =>
        dispatch({ type: "setWheelWellLoop", state: fire ? "normal" : "fire" }),
      )}
    >
      <title>{`Lazo detector de fuego del hueco del tren principal (techo, lazo único, sin extinción)
Estado: ${fire ? "FUEGO · luz WHEEL WELL" : "NORMAL"}
(Clic para ${fire ? "enfriar" : "simular fuego en el hueco del tren"})`}</title>
      <LoopLine d={d} state={fire ? "fire" : "normal"} />
    </g>
  );
}

function WheelWellFireSpot() {
  const { state, dispatch } = useFire();
  const fire = state.wheelWellLoop === "fire";
  return (
    <ZoneFireSpot
      x={WHEEL_WELL_FLAME[0]}
      y={WHEEL_WELL_FLAME[1]}
      burning={fire}
      zone="el hueco del tren principal"
      onToggle={() => dispatch({ type: "setWheelWellLoop", state: fire ? "normal" : "fire" })}
    />
  );
}

// ---------------------------------------------------------------------------
// Aural warnings (no audio: drawn ringing) and the APU ground control panel

const FIRE_BELL: P = [380, 70.6];
/** Hatch of the APU ground control panel (P28), right wheel well aft bulkhead. */
export const APU_GROUND_PANEL_AT: P = [397.6, 300.4];
const WHEEL_WELL_HORN: P = [393.6, 300.4];

/** Sound waves either side of an aural warning while it sounds. */
function SoundWaves({ spread = 1.6 }: { spread?: number }) {
  return (
    <g fill="none" stroke={RED} strokeWidth="0.22" strokeLinecap="round">
      {[1, -1].map((s) => (
        <g key={s}>
          <path d={`M ${s * spread} -0.7 Q ${s * (spread + 0.5)} 0 ${s * spread} 0.7`}>
            <animate attributeName="opacity" values="1;0.15;1" dur="0.6s" repeatCount="indefinite" />
          </path>
          <path d={`M ${s * (spread + 0.6)} -1.1 Q ${s * (spread + 1.3)} 0 ${s * (spread + 0.6)} 1.1`}>
            <animate attributeName="opacity" values="0.15;1;0.15" dur="0.6s" repeatCount="indefinite" />
          </path>
        </g>
      ))}
    </g>
  );
}

function BellGlyph({ sounding }: { sounding: boolean }) {
  const color = sounding ? RED : "#a1a1aa";
  return (
    <g>
      <g>
        {sounding && (
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="-14;14;-14"
            dur="0.25s"
            repeatCount="indefinite"
          />
        )}
        <path
          d="M -1.15 0.75 C -1.05 0.4 -0.85 0.15 -0.85 -0.25 C -0.85 -0.9 -0.45 -1.25 0 -1.25 C 0.45 -1.25 0.85 -0.9 0.85 -0.25 C 0.85 0.15 1.05 0.4 1.15 0.75 Z"
          className="fill-sim-surface"
          stroke={color}
          strokeWidth="0.26"
          strokeLinejoin="round"
        />
        <circle cy="1.05" r="0.28" fill={color} />
      </g>
      {sounding && <SoundWaves />}
    </g>
  );
}

function FireBell() {
  const { indications } = useFire();
  const sounding = indications.bellSounding;
  return (
    <g transform={`translate(${FIRE_BELL[0]} ${FIRE_BELL[1]})`}>
      <title>{`Campana de aviso de fuego (fire warning bell) · cabina de vuelo · ${
        sounding ? "SONANDO (se silencia con FIRE WARN / BELL CUTOUT)" : "en silencio"
      }`}</title>
      <BellGlyph sounding={sounding} />
    </g>
  );
}

/** Horn grille seen face on. */
function HornGlyph({ sounding }: { sounding: boolean }) {
  const color = sounding ? RED : "#a1a1aa";
  return (
    <g>
      <path d="M -0.9 -0.45 L -0.3 -0.45 L 0.5 -1 L 0.5 1 L -0.3 0.45 L -0.9 0.45 Z" className="fill-sim-surface" stroke={color} strokeWidth="0.24" strokeLinejoin="round" />
      {sounding && <SoundWaves spread={1.1} />}
    </g>
  );
}

function ApuGroundPanelMarker({ onOpen }: { onOpen: () => void }) {
  const { indications } = useFire();
  const { apuGroundLight, hornSounding } = indications;
  const lightText =
    apuGroundLight === "flashing" ? "ROJA DESTELLANDO" : apuGroundLight === "steady" ? "ROJA FIJA" : "apagada";
  return (
    <g>
      <g transform={`translate(${WHEEL_WELL_HORN[0]} ${WHEEL_WELL_HORN[1]})`}>
        <title>{`Bocina de fuego del APU (hueco del tren principal derecho, sólo en tierra) · ${
          hornSounding ? "SONANDO (HORN CUTOUT la silencia)" : "en silencio"
        }`}</title>
        <HornGlyph sounding={hornSounding} />
      </g>
      <g
        transform={`translate(${APU_GROUND_PANEL_AT[0]} ${APU_GROUND_PANEL_AT[1]})`}
        data-sensor-id="apu-ground-panel"
        {...controlProps("Abrir el APU ground control panel (P28)", onOpen)}
      >
        <title>{`APU ground control panel (P28) · hueco del tren principal derecho, mamparo trasero
Luz de fuego del APU: ${lightText}
(Clic para abrir el panel)`}</title>
        <rect x="-2.3" y="-1.6" width="4.6" height="3.2" fill="transparent" />
        <rect
          x="-1.9"
          y="-1.2"
          width="3.8"
          height="2.4"
          rx="0.3"
          className="fill-sim-surface stroke-white transition-colors group-hover:stroke-sim-accent"
          strokeWidth="0.3"
        />
        {/* Hatch fasteners */}
        {[-1.5, 1.5].map((sx) => (
          <circle key={sx} cx={sx} cy="0" r="0.16" className="fill-zinc-400" />
        ))}
        <circle r="0.55" fill={apuGroundLight === "off" ? "#3f3f46" : RED} stroke="#09090b" strokeWidth="0.12">
          {apuGroundLight === "flashing" && (
            <animate attributeName="opacity" values="1;1;0.15;0.15" keyTimes="0;0.5;0.5;1" dur="1s" repeatCount="indefinite" />
          )}
        </circle>
        <TinyLabel x={0} y={-1.85} className="fill-zinc-300">
          P28
        </TinyLabel>
      </g>
    </g>
  );
}

// ---------------------------------------------------------------------------
// Cargo compartments (right side ceiling lane) and the cargo bottle (mix bay)

// Each detector pair spans the lane: loop A detector inboard, the discharge
// nozzle, loop B detector outboard, like the FCOM schematic rows.
const CARGO_LANE = { a: 392.6, nozzle: 397, b: 401.4 };
const CARGO_BAY_Y: Record<CargoCompartment, { fwd: number; aft: number }> = {
  fwd: FWD_CARGO_BAY_Y,
  aft: AFT_CARGO_BAY_Y,
};
const cargoPairY = (compartment: CargoCompartment, position: number) => {
  const { fwd, aft } = CARGO_BAY_Y[compartment];
  return fwd + ((position + 0.5) * (aft - fwd)) / CARGO_DETECTOR_PAIRS[compartment];
};
// Clear of the compartment labels, which sit on the left wall at mid length
const CARGO_FLAME: Record<CargoCompartment, P> = { fwd: [360.6, 128], aft: [358.4, 350] };
// Cargo bottle: left of the mix manifold, against the bay's aft bulkhead
// (the front spar), FWD squib forward and AFT squib aft.
const CARGO_BOTTLE: P = [361.6, AC_DIST_BAY_Y.aft - 3.6];
const CARGO_WALL_X = 402.6;
const CARGO_TUBES: Record<CargoCompartment, P[]> = {
  fwd: [
    [CARGO_BOTTLE[0], CARGO_BOTTLE[1] - BOTTLE_R - 0.25],
    [CARGO_BOTTLE[0], AC_DIST_BAY_Y.fwd + 3.4],
    [CARGO_LANE.nozzle, AC_DIST_BAY_Y.fwd + 3.4],
    [CARGO_LANE.nozzle, cargoPairY("fwd", 0)],
  ],
  aft: [
    [CARGO_BOTTLE[0], CARGO_BOTTLE[1] + BOTTLE_R + 0.25],
    [CARGO_BOTTLE[0], AC_DIST_BAY_Y.aft - 1.1],
    [CARGO_WALL_X, AC_DIST_BAY_Y.aft - 1.1],
    [CARGO_WALL_X, AFT_CARGO_BAY_Y.fwd + 2.6],
    [CARGO_LANE.nozzle, AFT_CARGO_BAY_Y.fwd + 2.6],
    [CARGO_LANE.nozzle, cargoPairY("aft", CARGO_DETECTOR_PAIRS.aft - 1)],
  ],
};
const COMPARTMENT_NAME: Record<CargoCompartment, string> = { fwd: "delantero", aft: "trasero" };
const DC_BUS: Record<DetectorLoop, number> = { A: 1, B: 2 };

const SMOKE_CYCLE: SmokeDetectorState[] = ["normal", "smoke", "failed"];
const SMOKE_TEXT: Record<SmokeDetectorState, string> = { normal: "NORMAL", smoke: "HUMO", failed: "FALLADO" };

function CargoZoneGlow({ compartment }: { compartment: CargoCompartment }) {
  const { indications } = useFire();
  const { fwd, aft } = CARGO_BAY_Y[compartment];
  return (
    <ZoneGlow x={355} y={fwd} width={50} height={aft - fwd} level={indications.cargo[compartment].lit ? "fire" : "none"} />
  );
}

/** Loop wiring through a compartment's detectors; click toggles the loop's DC bus. */
function CargoLoopWiring({ compartment, loop }: { compartment: CargoCompartment; loop: DetectorLoop }) {
  const { state, dispatch } = useFire();
  const powered = state.cargoLoopPowered[loop];
  const x = loop === "A" ? CARGO_LANE.a : CARGO_LANE.b;
  const first = cargoPairY(compartment, 0);
  const last = cargoPairY(compartment, CARGO_DETECTOR_PAIRS[compartment] - 1);
  const leadY = first - 4;
  const d = toPath([[x, leadY], [x, last]]);
  return (
    <g
      {...controlProps(
        `Lazo ${loop} de detectores de humo de carga (DC bus ${DC_BUS[loop]}): ${powered ? "alimentado" : "sin alimentación"}`,
        () => dispatch({ type: "setCargoLoopPowered", loop, powered: !powered }),
      )}
    >
      <title>{`Cableado del lazo ${loop} · detectores de humo de carga (ambos compartimentos)
Alimentación: DC bus ${DC_BUS[loop]} · ${powered ? "ALIMENTADO" : "SIN ALIMENTACIÓN (pasa a detección por un solo lazo, luz DETECTOR FAULT)"}
(Clic para ${powered ? "quitar" : "restablecer"} la alimentación del lazo ${loop})`}</title>
      <path d={d} stroke="transparent" strokeWidth="1.2" />
      <path d={d} className="stroke-white opacity-0 transition-opacity group-hover:opacity-30" strokeWidth="0.7" />
      <path
        d={d}
        className={powered ? "stroke-zinc-400" : "stroke-zinc-600"}
        strokeWidth="0.26"
        strokeDasharray={powered ? undefined : "0.6 0.5"}
      />
      <circle cx={x} cy={leadY} r="0.45" className={powered ? "fill-zinc-300" : "fill-zinc-600"} />
      <TinyLabel x={x} y={leadY - 1.1} className={powered ? "fill-zinc-300" : "fill-zinc-600"}>
        {loop}
      </TinyLabel>
    </g>
  );
}

/** Smoke detector: hatched square (FCOM 8.20.7 schematic). */
function SmokeDetectorGlyph({ state }: { state: SmokeDetectorState }) {
  const stroke = state === "smoke" ? RED : state === "failed" ? FAILED_COLOR : "#ffffff";
  return (
    <g>
      {state === "smoke" && (
        <rect x="-1.35" y="-1.35" width="2.7" height="2.7" rx="0.5" fill={RED} opacity="0.35" className="animate-pulse" />
      )}
      <rect
        x="-0.85"
        y="-0.85"
        width="1.7"
        height="1.7"
        rx="0.15"
        className="fill-sim-surface"
        stroke={stroke}
        strokeWidth="0.26"
        strokeDasharray={state === "failed" ? "0.5 0.35" : undefined}
      />
      <path
        d="M -0.85 0 H 0.85 M 0 -0.85 V 0.85 M -0.85 0.85 L 0.85 -0.85 M -0.85 0 L 0 -0.85 M 0 0.85 L 0.85 0"
        stroke={state === "smoke" ? RED : "#a1a1aa"}
        strokeWidth="0.14"
      />
    </g>
  );
}

function CargoCompartmentDevices({ compartment }: { compartment: CargoCompartment }) {
  const { state, dispatch } = useFire();
  const detectors = SMOKE_DETECTORS.filter((d) => d.compartment === compartment);
  const spraying = tubeFlow(state.bottles.cargo, compartment).flowing;
  const smokeIds = detectors.filter((d) => state.smokeDetectors[d.id] !== "failed").map((d) => d.id);
  const burning = smokeIds.length > 0 && smokeIds.every((id) => state.smokeDetectors[id] === "smoke");
  return (
    <g data-fire-zone={`cargo-${compartment}`}>
      {Array.from({ length: CARGO_DETECTOR_PAIRS[compartment] }, (_, position) => (
        <Nozzle
          key={position}
          x={CARGO_LANE.nozzle}
          y={cargoPairY(compartment, position)}
          spraying={spraying}
          title={`Tobera de descarga ${position + 1} · compartimento de carga ${COMPARTMENT_NAME[compartment]} (techo)`}
        />
      ))}
      {detectors.map(({ id, loop, position }) => {
        const current = state.smokeDetectors[id];
        const next = SMOKE_CYCLE[(SMOKE_CYCLE.indexOf(current) + 1) % SMOKE_CYCLE.length];
        return (
          <g
            key={id}
            transform={`translate(${loop === "A" ? CARGO_LANE.a : CARGO_LANE.b} ${cargoPairY(compartment, position)})`}
            data-sensor-id={`fire-smoke-${id}`}
            {...controlProps(`Detector de humo ${loop}${position + 1} de carga ${COMPARTMENT_NAME[compartment]}: ${SMOKE_TEXT[current]}`, () =>
              dispatch({ type: "setSmokeDetector", id, state: next }),
            )}
          >
            <title>{`Detector de humo ${loop}${position + 1} · compartimento de carga ${COMPARTMENT_NAME[compartment]} (techo)
Lazo ${loop} · DC bus ${DC_BUS[loop]}
Estado: ${SMOKE_TEXT[current]}
(Clic: normal → humo → fallado → normal; hace falta humo en ambos lazos para la alarma)`}</title>
            <rect x="-1.4" y="-1.4" width="2.8" height="2.8" fill="transparent" />
            <rect
              x="-1.25"
              y="-1.25"
              width="2.5"
              height="2.5"
              rx="0.4"
              fill="none"
              stroke="#ffffff"
              strokeWidth="0.22"
              strokeDasharray="0.6 0.45"
              className="opacity-0 transition-opacity duration-150 group-hover:opacity-80"
            />
            <SmokeDetectorGlyph state={current} />
          </g>
        );
      })}
      <ZoneFireSpot
        x={CARGO_FLAME[compartment][0]}
        y={CARGO_FLAME[compartment][1]}
        burning={burning}
        zone={`el compartimento de carga ${COMPARTMENT_NAME[compartment]}`}
        onToggle={() => {
          for (const id of smokeIds) dispatch({ type: "setSmokeDetector", id, state: burning ? "normal" : "smoke" });
        }}
      />
    </g>
  );
}

function CargoBottle() {
  const { state, indications } = useFire();
  return (
    <g data-fire-zone="cargo-bottle">
      <ExtinguisherBottle
        bottle="cargo"
        x={CARGO_BOTTLE[0]}
        y={CARGO_BOTTLE[1]}
        title="Botella extintora de carga (bahía de distribución de aire, mamparo trasero, a la izquierda de la cámara de mezcla)"
      />
      {(["fwd", "aft"] as const).map((compartment) => (
        <Squib
          key={compartment}
          x={CARGO_BOTTLE[0]}
          y={CARGO_BOTTLE[1] + (compartment === "fwd" ? -1 : 1) * (BOTTLE_R + 0.1)}
          armed={indications.squibArmed("cargo", compartment)}
          fired={state.bottles.cargo.firedSquibs.includes(compartment)}
          title={`Squib ${compartment.toUpperCase()} de la botella de carga (se arma con ${compartment.toUpperCase()} ARMED)`}
        />
      ))}
    </g>
  );
}

function CargoTubing() {
  const { state } = useFire();
  return (
    <g>
      {(["fwd", "aft"] as const).map((compartment) => (
        <AgentTube
          key={compartment}
          points={CARGO_TUBES[compartment]}
          {...tubeFlow(state.bottles.cargo, compartment)}
          title={`Tubería de descarga · botella de carga → compartimento ${COMPARTMENT_NAME[compartment]} (recorrido ilustrativo)`}
        />
      ))}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Lavatories (FCOM 1.40.35): A forward left, D and E aft left and right

const LAV_SIZE = { w: 4, h: 8.6 };
const LAVATORY_AT: Record<LavatoryId, P> = {
  A: [359.9, 86],
  D: [357.4, 436.8],
  E: [398.6, 436.8],
};
const LAV_POSITION: Record<LavatoryId, string> = {
  A: "delantero izquierdo, junto a la puerta de entrada delantera",
  D: "trasero izquierdo, delante del galley trasero",
  E: "trasero derecho, delante del galley trasero",
};

function Lavatory({ id }: { id: LavatoryId }) {
  const { state, dispatch } = useFire();
  const lav = state.lavatories[id];
  const [x, y] = LAVATORY_AT[id];
  const nozzleFill = lav.extinguisherDischarged ? "#d4d4d8" : "#18181b";
  return (
    <g transform={`translate(${x} ${y})`} data-fire-zone={`lav-${id}`}>
      <rect width={LAV_SIZE.w} height={LAV_SIZE.h} rx="0.4" className="fill-sim-surface stroke-zinc-400" strokeWidth="0.25">
        <title>{`Lavatorio ${id} · ${LAV_POSITION[id]}`}</title>
      </rect>
      <text x="0.45" y="1.05" fontSize="0.8" dominantBaseline="middle" className="pointer-events-none fill-zinc-400 font-sim-sans tracking-wide">
        {`LAV ${id}`}
      </text>

      {/* KIDDE smoke detector on the ceiling: red status light + aural warning */}
      <g
        transform="translate(2.85 2.6)"
        data-sensor-id={`fire-lav-${id}-smoke`}
        {...controlProps(`Detector de humo del lavatorio ${id}: ${lav.smoke ? "humo" : "normal"}`, () =>
          dispatch({ type: "setLavatorySmoke", lavatory: id, smoke: !lav.smoke }),
        )}
      >
        <title>{`Detector de humo KIDDE · lavatorio ${id} (techo)
Estado: ${lav.smoke ? "HUMO · luz roja de estado y aviso sonoro (sin indicación en cabina de vuelo)" : "NORMAL"}
(Clic para ${lav.smoke ? "despejar el humo: se resetea solo" : "simular humo"})`}</title>
        <circle r="1.1" fill="transparent" />
        <circle r="0.6" className="fill-sim-surface transition-colors group-hover:stroke-white" stroke="#d4d4d8" strokeWidth="0.18" />
        <circle r="0.22" fill={lav.smoke ? RED : "#3f3f46"}>
          {lav.smoke && <animate attributeName="opacity" values="1;0.3;1" dur="0.8s" repeatCount="indefinite" />}
        </circle>
        {lav.smoke && (
          <g transform="scale(0.55)">
            <SoundWaves spread={1.4} />
          </g>
        )}
      </g>

      {/* Towel disposal container: click starts a fire in it */}
      <g
        transform="translate(2 5)"
        data-sensor-id={`fire-lav-${id}-container`}
        {...controlProps(`Contenedor de toallas del lavatorio ${id}: ${lav.fire ? "en llamas" : "normal"}`, () =>
          dispatch({ type: "setLavatoryFire", lavatory: id, fire: !lav.fire }),
        )}
      >
        <title>{`Contenedor de toallas usadas · lavatorio ${id}
Estado: ${lav.fire ? (lav.extinguisherDischarged ? "FUEGO (el extintor ya está descargado)" : "FUEGO (las toberas se están calentando)") : "normal"}
(Clic para ${lav.fire ? "apagar el fuego" : lav.extinguisherDischarged ? "provocar fuego: el extintor ya se descargó" : "provocar fuego: el extintor se descarga solo por calor"})`}</title>
        <rect x="-1.3" y="-1.1" width="2.6" height="2.2" fill="transparent" />
        <rect
          x="-1.05"
          y="-0.8"
          width="2.1"
          height="1.6"
          rx="0.2"
          className="fill-sim-surface transition-colors group-hover:stroke-white"
          stroke={lav.fire ? RED : "#a1a1aa"}
          strokeWidth="0.2"
        />
        <path d="M -0.6 -0.8 V 0.8 M 0 -0.8 V 0.8 M 0.6 -0.8 V 0.8" className="stroke-zinc-600" strokeWidth="0.12" />
        {lav.fire && (
          <g transform="translate(0 -0.2) scale(0.6)">
            <FlameGlyph burning />
          </g>
        )}
      </g>

      {/* Heat activated extinguisher under the sink: two nozzles aimed at the container */}
      <g>
        <title>{`Extintor térmico bajo el lavabo · lavatorio ${id} · ${
          lav.extinguisherDischarged ? "DESCARGADO (toberas color aluminio)" : "cargado (toberas negro mate)"
        }`}</title>
        <rect x="0.65" y="7.15" width="2.7" height="0.85" rx="0.42" className="fill-sim-surface" stroke="#d4d4d8" strokeWidth="0.18" />
        {!lav.extinguisherDischarged && (
          <rect x="0.95" y="7.38" width="2.1" height="0.4" rx="0.2" fill={AGENT} opacity="0.85" />
        )}
        {[1.45, 2.55].map((nx) => (
          <path
            key={nx}
            d={`M ${nx - 0.28} 7.15 L ${nx + 0.28} 7.15 L ${nx + 0.12} 6.35 L ${nx - 0.12} 6.35 Z`}
            fill={nozzleFill}
            stroke="#d4d4d8"
            strokeWidth="0.12"
            strokeLinejoin="round"
          />
        ))}
      </g>
      {/* Temperature indicator placard on the door under the sink */}
      <rect x="3.3" y="6.25" width="0.5" height="0.7" rx="0.08" fill={lav.placardBlack ? "#09090b" : "#fafafa"} stroke="#d4d4d8" strokeWidth="0.12">
        <title>{`Placa indicadora de temperatura · lavatorio ${id} · ${lav.placardBlack ? "NEGRA (expuesta a alta temperatura)" : "blanca (normal)"}`}</title>
      </rect>
    </g>
  );
}

// ---------------------------------------------------------------------------
// Layers

/** Zone glows, tubing and wiring: drawn under the pneumatic and ECS layers. */
export function FireProtectionUnderLayer({ fuelShown }: { fuelShown: boolean }) {
  return (
    <g data-layer="fire-under" className="select-none">
      <EngineZoneGlow engine="eng1" />
      <EngineZoneGlow engine="eng2" />
      <CargoZoneGlow compartment="fwd" />
      <CargoZoneGlow compartment="aft" />
      <WheelWellGlow />
      <ApuZoneGlow />
      <ApuFirewall />
      <EngineServiceLines engine="eng1" fuelShown={fuelShown} />
      <EngineServiceLines engine="eng2" fuelShown={fuelShown} />
      <WheelWellLoop />
      <CargoLoopWiring compartment="fwd" loop="A" />
      <CargoLoopWiring compartment="fwd" loop="B" />
      <CargoLoopWiring compartment="aft" loop="A" />
      <CargoLoopWiring compartment="aft" loop="B" />
      <CargoTubing />
      <EngineTubing />
      <ApuTubing fuelShown={fuelShown} />
    </g>
  );
}

function WheelWellGlow() {
  const { state } = useFire();
  const { fwd, aft } = MAIN_WHEEL_WELL_Y;
  return <ZoneGlow x={355} y={fwd} width={50} height={aft - fwd} level={state.wheelWellLoop === "fire" ? "fire" : "none"} />;
}

function ApuZoneGlow() {
  const { state } = useFire();
  if (state.apuLoop !== "fire") return null;
  return (
    <path
      d={toPath(APU_COMPARTMENT, true)}
      fill={RED}
      opacity={0.26}
      className="pointer-events-none animate-pulse"
    />
  );
}

/** Detectors, bottles, valves and warnings: drawn on top of everything. */
export function FireProtectionLayer({
  onOpenApuGroundPanel,
  fuelShown,
}: {
  onOpenApuGroundPanel: () => void;
  /** The fuel layer is on: it draws the fuel shutoff valves and lines. */
  fuelShown: boolean;
}) {
  return (
    <g data-layer="fire" className="select-none" aria-label="Protección contra incendios">
      <EngineFireProtection engine="eng1" fuelShown={fuelShown} />
      <EngineFireProtection engine="eng2" fuelShown={fuelShown} />
      <EngineBottles />
      <WheelWellFireSpot />
      <ApuGroundPanelMarker onOpen={onOpenApuGroundPanel} />
      <CargoCompartmentDevices compartment="fwd" />
      <CargoCompartmentDevices compartment="aft" />
      <CargoBottle />
      <ApuFireProtection fuelShown={fuelShown} />
      {LAVATORIES.map((id) => (
        <Lavatory key={id} id={id} />
      ))}
      <FireBell />
    </g>
  );
}

// ---------------------------------------------------------------------------
// APU ground control panel popover

/**
 * The P28 panel, opened from its hatch in the right wheel well: an HTML
 * overlay kept beside the hatch as the plan view pans and zooms.
 */
export function ApuGroundPanelPopover({
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
      anchor={APU_GROUND_PANEL_AT}
      anchorHalfWidth={2.3}
      title="APU GROUND CONTROL · P28"
      location="R MAIN WHEEL WELL"
      ariaLabel="APU ground control panel (P28)"
      closeLabel="Cerrar el panel P28"
      size={APU_GROUND_CONTROL_PANEL_SIZE}
      onClose={onClose}
    >
      <ApuGroundControlPanel />
    </PlanViewPopover>
  );
}

// ---------------------------------------------------------------------------
// Legend

export type FireLegendKind =
  | "loop"
  | "smoke-detector"
  | "bottle"
  | "squib"
  | "nozzle"
  | "lav-extinguisher"
  | "aural"
  | "zone-fire";

export const FIRE_LEGEND: { kind: FireLegendKind; label: string }[] = [
  { kind: "loop", label: "DETECTOR LOOP" },
  { kind: "smoke-detector", label: "SMOKE DETECTOR" },
  { kind: "bottle", label: "EXT BOTTLE" },
  { kind: "squib", label: "SQUIB" },
  { kind: "nozzle", label: "NOZZLE" },
  { kind: "lav-extinguisher", label: "LAV EXTINGUISHER" },
  { kind: "aural", label: "AURAL WARNING" },
  { kind: "zone-fire", label: "ZONE FIRE" },
];

function LegendBottle() {
  return (
    <g>
      <circle r="1.35" className="fill-sim-surface stroke-white" strokeWidth="0.4" />
      <circle r="0.9" fill={AGENT} opacity="0.85" />
    </g>
  );
}

export function FireLegendIcon({ kind }: { kind: FireLegendKind }) {
  return (
    <svg className="h-4 w-5 shrink-0 overflow-visible" viewBox="-3.5 -2.5 7 5" aria-hidden="true">
      {kind === "loop" && (
        <g>
          <path d="M -3 -0.4 H 3 M -3 0.4 H 3" stroke={DETECTOR_COLOR} strokeWidth="0.3" />
          <DetectorElement x={0} y={0} vertical />
        </g>
      )}
      {kind === "smoke-detector" && (
        <g transform="scale(1.2)">
          <SmokeDetectorGlyph state="normal" />
        </g>
      )}
      {kind === "bottle" && <LegendBottle />}
      {kind === "squib" && (
        <g transform="scale(1.8)">
          <rect x="-0.45" y="-0.3" width="0.9" height="0.6" rx="0.12" fill="#ffffff" stroke="#e4e4e7" strokeWidth="0.16" />
        </g>
      )}
      {kind === "nozzle" && (
        <g transform="scale(1.4)">
          <rect x="-0.8" y="-0.5" width="1.6" height="1" rx="0.5" className="fill-sim-surface stroke-white" strokeWidth="0.25" />
          <circle cx="-0.28" r="0.15" className="fill-white" />
          <circle cx="0.28" r="0.15" className="fill-white" />
        </g>
      )}
      {kind === "lav-extinguisher" && (
        <g transform="translate(-2 -6.6) scale(1.1)">
          <rect x="0.65" y="7.15" width="2.7" height="0.85" rx="0.42" className="fill-sim-surface" stroke="#d4d4d8" strokeWidth="0.18" />
          {[1.45, 2.55].map((nx) => (
            <path
              key={nx}
              d={`M ${nx - 0.28} 7.15 L ${nx + 0.28} 7.15 L ${nx + 0.12} 6.35 L ${nx - 0.12} 6.35 Z`}
              fill="#18181b"
              stroke="#d4d4d8"
              strokeWidth="0.12"
            />
          ))}
        </g>
      )}
      {kind === "aural" && (
        <g transform="scale(1.3)">
          <BellGlyph sounding={false} />
        </g>
      )}
      {kind === "zone-fire" && (
        <g transform="scale(1.4)">
          <FlameGlyph burning />
        </g>
      )}
    </svg>
  );
}
