// Fuel system (FCOM chapter 12, 7.20.7 and 7.30.1), as fitted to the -800s
// YW064–YW164: digital fuel quantity with TOTAL on the upper display unit and
// the nitrogen generation system. Everything here is pure: the React context
// only holds the state, runs it through fuelSystemReducer, times the valve
// travel and the center pump delays, and ticks the fuel flows.

import type { EngineId } from "../fire/fire-protection";

export type TankId = "tank1" | "center" | "tank2";
export type MainTankId = "tank1" | "tank2";
export type PumpId = "aft1" | "fwd1" | "ctrL" | "ctrR" | "fwd2" | "aft2";
export type CenterPumpId = "ctrL" | "ctrR";
/** Engine fuel feed manifolds; the crossfeed valve joins them. */
export type FeedSide = "left" | "right";
export type StartLeverPosition = "IDLE" | "CUTOFF";
/** DC motor operated valves: they take a while to travel (bright light meanwhile). */
export type MotorValveId = "spar1" | "spar2" | "crossfeed" | "apu";
/** FUELING INDICATION TEST switch on the fueling panel, spring-loaded to OFF. */
export type FuelingTestPosition = "TEST GAGES" | "OFF" | "FUEL DOOR SWITCH BYPASS";
/** NGS operability indicator lights (FCOM 12.10.10). */
export type NgsStatus = "operational" | "degraded" | "inoperative";

export const TANKS: TankId[] = ["tank1", "center", "tank2"];
export const MAIN_TANKS: MainTankId[] = ["tank1", "tank2"];
export const CENTER_PUMPS: CenterPumpId[] = ["ctrL", "ctrR"];
export const MOTOR_VALVES: MotorValveId[] = ["spar1", "spar2", "crossfeed", "apu"];
const ENGINES: EngineId[] = ["eng1", "eng2"];

/**
 * Two AC pumps per tank (FCOM 12.20.2): FWD and AFT in the main tanks, L and
 * R in the center tank. Each one feeds the manifold on its side.
 */
export const PUMPS: Record<PumpId, { tank: TankId; side: FeedSide; label: string }> = {
  aft1: { tank: "tank1", side: "left", label: "AFT 1" },
  fwd1: { tank: "tank1", side: "left", label: "FWD 1" },
  ctrL: { tank: "center", side: "left", label: "CTR L" },
  ctrR: { tank: "center", side: "right", label: "CTR R" },
  fwd2: { tank: "tank2", side: "right", label: "FWD 2" },
  aft2: { tank: "tank2", side: "right", label: "AFT 2" },
};
export const PUMP_IDS = Object.keys(PUMPS) as PumpId[];

export const ENGINE_SIDE: Record<EngineId, FeedSide> = { eng1: "left", eng2: "right" };
const SIDE_MAIN_TANK: Record<FeedSide, MainTankId> = { left: "tank1", right: "tank2" };
const SPAR_VALVE: Record<EngineId, MotorValveId> = { eng1: "spar1", eng2: "spar2" };

/** Usable fuel at level attitude, density 0.8029 kg/l (FCOM 12.20.4). */
export const TANK_CAPACITY_KG: Record<TankId, number> = { tank1: 3915, center: 13066, tank2: 3915 };
export const FUEL_DENSITY_KG_PER_L = 0.8029;

// Upper display unit alerts (FCOM 12.10.5-6), with their hysteresis
export const LOW_ALERT_KG = 453;
export const LOW_CLEAR_KG = 567;
export const CONFIG_ALERT_KG = 726;
export const CONFIG_CLEAR_KG = 363;
export const IMBAL_ALERT_KG = 453;
export const IMBAL_CLEAR_KG = 91;

/**
 * The scavenge jet pump starts when main tank No. 1 is "about one-half"
 * (FCOM 12.20.3); the NG maintenance course (JCT-0151) gives 1990 kg.
 */
export const SCAVENGE_START_KG = 1990;
/** One center LOW PRESSURE light on for 10 s lights MASTER CAUTION (FCOM 12.10.2). */
export const CENTER_LOW_PRESSURE_CAUTION_MS = 10_000;
/** A center pump shuts itself off "after a short delay" (FCOM 12.20.2); 15 s per JCT-0151. */
export const CENTER_PUMP_AUTO_SHUTOFF_MS = 15_000;
/** Simulator choice: travel time of the DC motor operated valves (not in the FCOM). */
export const MOTOR_VALVE_TRAVEL_MS = 2_000;

// Flow rates (kg/s). Engine: ICAO emissions databank, CFM56-7B26 idle (7 %
// thrust); APU: b737.org.uk ("about 160 kg/hr"); scavenge: b737.org.uk
// ("usually nearer 200 kg/hr"); refuel: 50 psi nozzle ≈ 1136 l/min (FCOM
// SP.12); ground transfer: a main tank pump delivers at least 20 000 lb/h
// (JCT-0151). See docs/fuel-sources.
export const ENGINE_IDLE_FUEL_FLOW_KG_S = 0.113;
export const APU_FUEL_FLOW_KG_S = 160 / 3600;
export const SCAVENGE_FLOW_KG_S = 200 / 3600;
export const REFUEL_FLOW_KG_S = (1136 * FUEL_DENSITY_KG_PER_L) / 60;
export const TRANSFER_FLOW_PER_PUMP_KG_S = 9071 / 3600;

export interface FireShutoffInputs {
  /** Engine fire switch pulled: closes the spar and engine fuel shutoff valves. */
  engineFireSwitch: Record<EngineId, boolean>;
  /** APU fire switch pulled or ground handle down: closes the APU fuel shutoff valve. */
  apuShutoff: boolean;
  /** The APU shuts itself down on a detected fire. */
  apuAutoShutdown: boolean;
}

export interface FuelSystemState {
  quantityKg: Record<TankId, number>;
  /** Fuel temperature at the main tank No. 1 sensor. */
  fuelTempC: number;

  // Failures, injected from the plan view
  pumpFailed: Record<PumpId, boolean>;
  /** Contaminated engine fuel filter: impending bypass. */
  filterClogged: Record<EngineId, boolean>;
  /** A stuck motor valve does not follow its command. */
  valveStuck: Record<MotorValveId, boolean>;
  ngsStatus: NgsStatus;

  // Fuel control panel and control stand
  pumpSwitches: Record<PumpId, boolean>;
  crossfeedSelector: boolean;
  startLevers: Record<EngineId, StartLeverPosition>;

  // Fueling station (right wing leading edge)
  fuelingDoorOpen: boolean;
  fuelingTest: FuelingTestPosition;
  fuelingValveSwitches: Record<TankId, boolean>;
  manualDefuelValveOpen: boolean;
  /** Fuel truck hose on the fueling receptacle, pressurized. */
  fuelTruckConnected: boolean;

  /** Engines and APU running: they stop when their fuel is cut. */
  running: Record<EngineId | "apu", boolean>;
  fire: FireShutoffInputs;

  // Dynamic state
  valveOpen: Record<MotorValveId, boolean>;
  centerPumpAutoOff: Record<CenterPumpId, boolean>;
  centerLowPressureCaution: Record<CenterPumpId, boolean>;
  scavengeLatched: boolean;
  /** Latched display alerts (they have hysteresis). */
  alerts: { low: Record<MainTankId, boolean>; config: boolean; imbal: boolean };
}

const byEngine = <T>(fn: (engine: EngineId) => T) =>
  ({ eng1: fn("eng1"), eng2: fn("eng2") }) as Record<EngineId, T>;
const byPump = <T>(fn: (pump: PumpId) => T) =>
  Object.fromEntries(PUMP_IDS.map((pump) => [pump, fn(pump)])) as Record<PumpId, T>;
const byTank = <T>(fn: (tank: TankId) => T) =>
  ({ tank1: fn("tank1"), center: fn("center"), tank2: fn("tank2") }) as Record<TankId, T>;
const byValve = <T>(fn: (valve: MotorValveId) => T) =>
  Object.fromEntries(MOTOR_VALVES.map((valve) => [valve, fn(valve)])) as Record<MotorValveId, T>;

/**
 * Ready for taxi: both engines running, all six pumps ON and fuel in the
 * center tank (main tanks must be full with more than 453 kg in the center
 * tank, FCOM L.10.9).
 */
export const INITIAL_FUEL_SYSTEM: FuelSystemState = {
  quantityKg: { tank1: 3915, center: 3000, tank2: 3915 },
  fuelTempC: 15,
  pumpFailed: byPump(() => false),
  filterClogged: byEngine(() => false),
  valveStuck: byValve(() => false),
  ngsStatus: "operational",
  pumpSwitches: byPump(() => true),
  crossfeedSelector: false,
  startLevers: byEngine(() => "IDLE"),
  fuelingDoorOpen: false,
  fuelingTest: "OFF",
  fuelingValveSwitches: byTank(() => false),
  manualDefuelValveOpen: false,
  fuelTruckConnected: false,
  running: { eng1: true, eng2: true, apu: false },
  fire: { engineFireSwitch: byEngine(() => false), apuShutoff: false, apuAutoShutdown: false },
  valveOpen: { spar1: true, spar2: true, crossfeed: false, apu: false },
  centerPumpAutoOff: { ctrL: false, ctrR: false },
  centerLowPressureCaution: { ctrL: false, ctrR: false },
  scavengeLatched: false,
  alerts: { low: { tank1: false, tank2: false }, config: false, imbal: false },
};

// ---------------------------------------------------------------------------
// Valves

/** Spar valve command: start lever IDLE and fire switch in (FCOM 7.20.7). */
export const sparValveCommanded = (state: FuelSystemState, engine: EngineId) =>
  state.startLevers[engine] === "IDLE" && !state.fire.engineFireSwitch[engine];

/** Position each motor valve is driven to. */
export function valveCommand(state: FuelSystemState, valve: MotorValveId): boolean {
  switch (valve) {
    case "spar1":
      return sparValveCommanded(state, "eng1");
    case "spar2":
      return sparValveCommanded(state, "eng2");
    case "crossfeed":
      return state.crossfeedSelector;
    case "apu":
      // Opens for APU operation, closed by the APU fire switch or ground handle
      return state.running.apu && !state.fire.apuShutoff;
  }
}

/** Valve away from its command: in transit, or stuck (position disagrees). */
export const valveDisagrees = (state: FuelSystemState, valve: MotorValveId) =>
  state.valveOpen[valve] !== valveCommand(state, valve);

/** A valve that is open, or on its way to open. */
const valveOpening = (state: FuelSystemState, valve: MotorValveId) =>
  state.valveOpen[valve] || (valveCommand(state, valve) && !state.valveStuck[valve]);

/**
 * The engine fuel shutoff valve is fuel actuated and solenoid controlled: it
 * follows the spar valve command but only opens with the engine turning, so
 * with the start lever at IDLE and the engine stopped its ENG VALVE CLOSED
 * light stays bright (FCOM SP.12.1).
 */
export const engineValveOpen = (state: FuelSystemState, engine: EngineId) =>
  sparValveCommanded(state, engine) && state.running[engine];

// ---------------------------------------------------------------------------
// Pumps and feed

/** Pump delivering pressure: switch ON, working, fuel at its inlet. */
export function pumpOperating(state: FuelSystemState, pump: PumpId): boolean {
  const { tank } = PUMPS[pump];
  if (!state.pumpSwitches[pump] || state.pumpFailed[pump]) return false;
  if (tank === "center" && state.centerPumpAutoOff[pump as CenterPumpId]) return false;
  return state.quantityKg[tank] > 0;
}

/**
 * LOW PRESSURE lights (FCOM 12.10.2-3): a main tank light also comes on with
 * its switch OFF; a center tank light only with its switch ON.
 */
export function pumpLowPressureLit(state: FuelSystemState, pump: PumpId): boolean {
  if (pumpOperating(state, pump)) return false;
  return PUMPS[pump].tank === "center" ? state.pumpSwitches[pump] : true;
}

/** Manifold sides joined to `side`: both of them with the crossfeed valve open. */
export function connectedSides(state: FuelSystemState, side: FeedSide): FeedSide[] {
  return state.valveOpen.crossfeed ? ["left", "right"] : [side];
}

export type FeedKind = "pressure" | "suction" | "none";
export interface Feed {
  kind: FeedKind;
  /** Pumps (pressure) or the tank (suction) the fuel comes from. */
  pumps: PumpId[];
  tanks: TankId[];
}

/**
 * Pressure on a manifold: center tank pumps produce higher pressure than the
 * main tank pumps, so they feed while they run even with all pumps on, and
 * the check valves keep the main tank pumps out (FCOM 12.20.1-2).
 */
export function manifoldPressure(state: FuelSystemState, side: FeedSide): Feed {
  const sides = connectedSides(state, side);
  const operating = PUMP_IDS.filter(
    (pump) => sides.includes(PUMPS[pump].side) && pumpOperating(state, pump),
  );
  const center = operating.filter((pump) => PUMPS[pump].tank === "center");
  const pumps = center.length > 0 ? center : operating;
  if (pumps.length === 0) return { kind: "none", pumps: [], tanks: [] };
  return { kind: "pressure", pumps, tanks: pumps.map((pump) => PUMPS[pump].tank) };
}

/**
 * Fuel reaching an engine's manifold: pump pressure, or suction feed from its
 * own main tank through the bypass valve (FCOM 12.20.2). The center tank has
 * no suction feed.
 */
export function engineFeed(state: FuelSystemState, engine: EngineId): Feed {
  const side = ENGINE_SIDE[engine];
  const pressure = manifoldPressure(state, side);
  if (pressure.kind === "pressure") return pressure;
  const tank = SIDE_MAIN_TANK[side];
  return state.quantityKg[tank] > 0
    ? { kind: "suction", pumps: [], tanks: [tank] }
    : { kind: "none", pumps: [], tanks: [] };
}

/**
 * The APU takes fuel from the left side of the manifold with the AC pumps
 * running, otherwise by suction from main tank No. 1 (FCOM 12.20.3).
 */
export function apuFeed(state: FuelSystemState): Feed {
  const pressure = manifoldPressure(state, "left");
  if (pressure.kind === "pressure") return pressure;
  return state.quantityKg.tank1 > 0
    ? { kind: "suction", pumps: [], tanks: ["tank1"] }
    : { kind: "none", pumps: [], tanks: [] };
}

/** Why an engine cannot run, or null when it gets fuel. */
export function engineFuelCut(state: FuelSystemState, engine: EngineId): string | null {
  if (state.fire.engineFireSwitch[engine]) return "fire switch tirado (spar y engine valves cerradas)";
  if (state.startLevers[engine] === "CUTOFF") return "start lever en CUTOFF";
  if (!valveOpening(state, SPAR_VALVE[engine])) return "spar valve trabada cerrada";
  if (engineFeed(state, engine).kind === "none") return "sin combustible en el manifold (ni presión ni succión)";
  return null;
}

/** Why the start sequence (start lever to IDLE) would not get the engine fuel, or null. */
export function engineStartBlocked(state: FuelSystemState, engine: EngineId): string | null {
  return engineFuelCut({ ...state, startLevers: { ...state.startLevers, [engine]: "IDLE" } }, engine);
}

/** Why the APU cannot run, or null when it gets fuel. */
export function apuFuelCut(state: FuelSystemState): string | null {
  if (state.fire.apuShutoff) return "APU fuel shutoff valve cerrada (fire switch del APU o manija P28)";
  if (state.fire.apuAutoShutdown) return "fuego detectado: el APU se apaga solo";
  if (!state.valveOpen.apu && state.valveStuck.apu) return "APU fuel shutoff valve trabada cerrada";
  if (apuFeed(state).kind === "none") return "sin combustible (tanque No. 1 vacío y sin presión)";
  return null;
}

// ---------------------------------------------------------------------------
// Fueling station

/** The fueling panel is powered with its door open, or with the door switch bypassed. */
export const fuelingPanelPowered = (state: FuelSystemState) =>
  state.fuelingDoorOpen || state.fuelingTest === "FUEL DOOR SWITCH BYPASS";

/** Fuel pressure in the fueling manifold for ground transfer: the right manifold through the defuel valve. */
function transferFeed(state: FuelSystemState): Feed {
  if (!state.manualDefuelValveOpen || state.fuelTruckConnected) return { kind: "none", pumps: [], tanks: [] };
  return manifoldPressure(state, "right");
}

/**
 * Fueling valve open: energized (switch OPEN, panel powered), fuel pressure
 * on it (truck, or pumps through the defuel valve) and its tank not full
 * (float switch).
 */
export function fuelingValveOpen(state: FuelSystemState, tank: TankId): boolean {
  if (!state.fuelingValveSwitches[tank] || !fuelingPanelPowered(state)) return false;
  if (state.quantityKg[tank] >= TANK_CAPACITY_KG[tank]) return false;
  if (state.fuelTruckConnected) return true;
  const feed = transferFeed(state);
  return feed.kind === "pressure" && feed.tanks.some((source) => source !== tank);
}

// ---------------------------------------------------------------------------
// Indications

export type ValveLight = "off" | "dim" | "bright";

/** ENG VALVE CLOSED / SPAR VALVE CLOSED: bright in transit or disagreeing, dim closed. */
const closedLight = (open: boolean, commanded: boolean): ValveLight =>
  open !== commanded ? "bright" : open ? "off" : "dim";

/**
 * The center tank scavenge jet pump moves center fuel into main tank No. 1
 * (while there is room in it: the tank No. 1 float closes it when full).
 */
export const scavengeActive = (state: FuelSystemState) =>
  state.scavengeLatched &&
  pumpOperating(state, "fwd1") &&
  state.quantityKg.center > 0 &&
  state.quantityKg.tank1 < TANK_CAPACITY_KG.tank1;

/** Every light, display and flow the fuel system drives. */
export function getFuelIndications(state: FuelSystemState) {
  const pumps = byPump((pump) => ({
    operating: pumpOperating(state, pump),
    lowPressureLit: pumpLowPressureLit(state, pump),
  }));
  const engines = byEngine((engine) => {
    const commanded = sparValveCommanded(state, engine);
    const spar = SPAR_VALVE[engine];
    const engineOpen = engineValveOpen(state, engine);
    return {
      feed: engineFeed(state, engine),
      fuelCut: engineFuelCut(state, engine),
      engineValveOpen: engineOpen,
      engineValveLight: closedLight(engineOpen, commanded),
      sparValveLight: closedLight(state.valveOpen[spar], valveCommand(state, spar)),
      filterBypassLit: state.filterClogged[engine],
      /** Fuel flowing to the engine (it burns while running). */
      flowing: state.running[engine],
    };
  });
  const crossfeedOpen = state.valveOpen.crossfeed;
  const crossfeedLight: ValveLight = valveDisagrees(state, "crossfeed")
    ? "bright"
    : crossfeedOpen
      ? "dim"
      : "off";

  const total = TANKS.reduce((sum, tank) => sum + state.quantityKg[tank], 0);
  const lowShown = state.alerts.low;
  const anyLow = lowShown.tank1 || lowShown.tank2;
  const lowerMain: MainTankId = state.quantityKg.tank1 <= state.quantityKg.tank2 ? "tank1" : "tank2";
  const panelPowered = fuelingPanelPowered(state);

  return {
    pumps,
    engines,
    crossfeedLight,
    apu: { feed: apuFeed(state), fuelCut: apuFuelCut(state), flowing: state.running.apu },
    fuelTempC: state.fuelTempC,
    quantityKg: state.quantityKg,
    totalKg: total,
    /** Amber digits below 453 kg until back above 567 kg (FCOM 12.10.5). */
    lowAlert: lowShown,
    configAlert: state.alerts.config,
    /** Below the lower main tank; inhibited by a LOW alert (FCOM 12.10.6). */
    imbalAlert: state.alerts.imbal && !anyLow ? lowerMain : null,
    scavengeActive: scavengeActive(state),
    fueling: {
      panelPowered,
      testGages: panelPowered && state.fuelingTest === "TEST GAGES",
      valveOpen: byTank((tank) => fuelingValveOpen(state, tank)),
      /** Blue VALVE POSITION light: switch OPEN and tank not full. */
      valveLightLit: byTank(
        (tank) =>
          panelPowered &&
          state.fuelingValveSwitches[tank] &&
          state.quantityKg[tank] < TANK_CAPACITY_KG[tank],
      ),
      transferFeed: transferFeed(state),
    },
    ngs: {
      status: state.ngsStatus,
      /** The NGS shuts down on the ground (not in test mode) (FCOM 12.20.1). */
      operating: false,
    },
  };
}

export type FuelIndications = ReturnType<typeof getFuelIndications>;

/** A FUEL system annunciator light: `recallOnly` lights MASTER CAUTION only on recall. */
export type FuelCaution = { id: string; recallOnly?: boolean };

/**
 * Amber lights that feed the FUEL system annunciator (FCOM 15.20.3: LOW
 * PRESSURE, FILTER BYPASS). Two main tank LOW PRESSURE lights in the same
 * tank light MASTER CAUTION; one only on recall. A center tank light needs
 * 10 s on (FCOM 12.10.2-3).
 */
export function fuelCautions(state: FuelSystemState): FuelCaution[] {
  const cautions: FuelCaution[] = [];
  for (const tank of MAIN_TANKS) {
    const lit = PUMP_IDS.filter((pump) => PUMPS[pump].tank === tank && pumpLowPressureLit(state, pump));
    if (lit.length === 2) cautions.push({ id: `fuel-low-pressure-${tank}` });
    else if (lit.length === 1) cautions.push({ id: `fuel-low-pressure-${lit[0]}`, recallOnly: true });
  }
  for (const pump of CENTER_PUMPS) {
    if (state.centerLowPressureCaution[pump]) cautions.push({ id: `fuel-low-pressure-${pump}` });
  }
  for (const engine of ENGINES) {
    if (state.filterClogged[engine]) cautions.push({ id: `fuel-filter-bypass-${engine}` });
  }
  return cautions;
}

// ---------------------------------------------------------------------------
// Reducer

export type FuelSystemAction =
  | { type: "setQuantity"; tank: TankId; kg: number }
  | { type: "setFuelTemp"; celsius: number }
  | { type: "setPumpFailed"; pump: PumpId; failed: boolean }
  | { type: "setFilterClogged"; engine: EngineId; clogged: boolean }
  | { type: "setValveStuck"; valve: MotorValveId; stuck: boolean }
  | { type: "setNgsStatus"; status: NgsStatus }
  | { type: "setPumpSwitch"; pump: PumpId; on: boolean }
  | { type: "setCrossfeed"; open: boolean }
  | { type: "setStartLever"; engine: EngineId; position: StartLeverPosition }
  /** Simulator shortcut: start sequence (start lever to IDLE) or shutdown (CUTOFF). */
  | { type: "startEngine"; engine: EngineId }
  | { type: "stopEngine"; engine: EngineId }
  | { type: "startApu" }
  | { type: "stopApu" }
  | { type: "setFuelingDoor"; open: boolean }
  | { type: "setFuelingTest"; position: FuelingTestPosition }
  | { type: "setFuelingValveSwitch"; tank: TankId; open: boolean }
  | { type: "setManualDefuelValve"; open: boolean }
  | { type: "setFuelTruck"; connected: boolean }
  | { type: "syncFire"; fire: FireShutoffInputs }
  /** A motor valve has finished travelling to its command. */
  | { type: "completeValveTravel"; valve: MotorValveId }
  /** A center pump switch has been ON with low pressure past the delay. */
  | { type: "centerLowPressureTimeout"; pump: CenterPumpId; kind: "caution" | "autoOff" }
  /** Fuel flows over `seconds` of simulated time. */
  | { type: "tick"; seconds: number };

const clampQuantity = (tank: TankId, kg: number) => Math.min(TANK_CAPACITY_KG[tank], Math.max(0, kg));

/** Fuel moved over `seconds`, as quantity changes per tank. */
export function fuelFlows(state: FuelSystemState, seconds: number): Record<TankId, number> {
  const delta = byTank(() => 0);
  const drawFrom = (tanks: TankId[], kg: number) => {
    for (const tank of tanks) delta[tank] -= kg / tanks.length;
  };
  for (const engine of ENGINES) {
    if (state.running[engine]) drawFrom(engineFeed(state, engine).tanks, ENGINE_IDLE_FUEL_FLOW_KG_S * seconds);
  }
  if (state.running.apu) drawFrom(apuFeed(state).tanks, APU_FUEL_FLOW_KG_S * seconds);
  if (scavengeActive(state)) {
    delta.center -= SCAVENGE_FLOW_KG_S * seconds;
    delta.tank1 += SCAVENGE_FLOW_KG_S * seconds;
  }
  const filling = TANKS.filter((tank) => fuelingValveOpen(state, tank));
  if (filling.length > 0) {
    if (state.fuelTruckConnected) {
      for (const tank of filling) delta[tank] += (REFUEL_FLOW_KG_S * seconds) / filling.length;
    } else {
      // Ground transfer: the pumps push through the defuel valve into the open fueling valves
      const feed = transferFeed(state);
      const kg = TRANSFER_FLOW_PER_PUMP_KG_S * feed.pumps.length * seconds;
      const into = filling.filter((tank) => !feed.tanks.includes(tank));
      if (into.length > 0) {
        drawFrom(feed.tanks, kg);
        for (const tank of into) delta[tank] += kg / into.length;
      }
    }
  }
  return delta;
}

function applyAction(state: FuelSystemState, action: FuelSystemAction): FuelSystemState {
  switch (action.type) {
    case "setQuantity":
      return { ...state, quantityKg: { ...state.quantityKg, [action.tank]: clampQuantity(action.tank, action.kg) } };
    case "setFuelTemp":
      return { ...state, fuelTempC: action.celsius };
    case "setPumpFailed":
      return { ...state, pumpFailed: { ...state.pumpFailed, [action.pump]: action.failed } };
    case "setFilterClogged":
      return { ...state, filterClogged: { ...state.filterClogged, [action.engine]: action.clogged } };
    case "setValveStuck":
      return { ...state, valveStuck: { ...state.valveStuck, [action.valve]: action.stuck } };
    case "setNgsStatus":
      return { ...state, ngsStatus: action.status };
    case "setPumpSwitch":
      return { ...state, pumpSwitches: { ...state.pumpSwitches, [action.pump]: action.on } };
    case "setCrossfeed":
      return { ...state, crossfeedSelector: action.open };
    case "setStartLever":
      return { ...state, startLevers: { ...state.startLevers, [action.engine]: action.position } };
    case "startEngine": {
      if (state.running[action.engine] || state.fire.engineFireSwitch[action.engine]) return state;
      const next = { ...state, startLevers: { ...state.startLevers, [action.engine]: "IDLE" as const } };
      if (engineFuelCut(next, action.engine)) return next;
      return { ...next, running: { ...next.running, [action.engine]: true } };
    }
    case "stopEngine":
      return { ...state, startLevers: { ...state.startLevers, [action.engine]: "CUTOFF" } };
    case "startApu":
      if (state.running.apu || apuFuelCut(state)) return state;
      return { ...state, running: { ...state.running, apu: true } };
    case "stopApu":
      return { ...state, running: { ...state.running, apu: false } };
    case "setFuelingDoor":
      return { ...state, fuelingDoorOpen: action.open };
    case "setFuelingTest":
      return { ...state, fuelingTest: action.position };
    case "setFuelingValveSwitch":
      return {
        ...state,
        fuelingValveSwitches: { ...state.fuelingValveSwitches, [action.tank]: action.open },
      };
    case "setManualDefuelValve":
      return { ...state, manualDefuelValveOpen: action.open };
    case "setFuelTruck":
      return { ...state, fuelTruckConnected: action.connected };
    case "syncFire":
      return { ...state, fire: action.fire };
    case "completeValveTravel": {
      const { valve } = action;
      if (state.valveStuck[valve]) return state;
      return { ...state, valveOpen: { ...state.valveOpen, [valve]: valveCommand(state, valve) } };
    }
    case "centerLowPressureTimeout": {
      const { pump, kind } = action;
      if (!pumpLowPressureLit(state, pump)) return state;
      return kind === "caution"
        ? { ...state, centerLowPressureCaution: { ...state.centerLowPressureCaution, [pump]: true } }
        : { ...state, centerPumpAutoOff: { ...state.centerPumpAutoOff, [pump]: true } };
    }
    case "tick": {
      if (action.seconds <= 0) return state;
      const delta = fuelFlows(state, action.seconds);
      if (TANKS.every((tank) => delta[tank] === 0)) return state;
      const refuelingTank1 = delta.tank1 > 0 && fuelingValveOpen(state, "tank1");
      return {
        ...state,
        quantityKg: byTank((tank) => clampQuantity(tank, state.quantityKg[tank] + delta[tank])),
        // Refueling tank No. 1 on the ground ends the scavenge "flight"
        scavengeLatched: state.scavengeLatched && !refuelingTank1,
      };
    }
  }
}

/**
 * Consequences that hold whatever changed: engines and the APU stop without
 * fuel, center pump timers reset with their switch, the scavenge jet pump
 * latches on, and the display alerts follow their hysteresis.
 */
function settle(state: FuelSystemState): FuelSystemState {
  const running = {
    eng1: state.running.eng1 && !engineFuelCut(state, "eng1"),
    eng2: state.running.eng2 && !engineFuelCut(state, "eng2"),
    apu: state.running.apu && !apuFuelCut(state),
  };
  let next: FuelSystemState = { ...state, running };

  // Setting a center pump switch OFF resets its auto shutoff (FCOM 12.10.2)
  const centerPumpAutoOff = { ...next.centerPumpAutoOff };
  const centerLowPressureCaution = { ...next.centerLowPressureCaution };
  for (const pump of CENTER_PUMPS) {
    if (!next.pumpSwitches[pump]) centerPumpAutoOff[pump] = false;
  }
  next = { ...next, centerPumpAutoOff };
  for (const pump of CENTER_PUMPS) {
    if (!pumpLowPressureLit(next, pump)) centerLowPressureCaution[pump] = false;
  }

  const scavengeLatched =
    next.scavengeLatched || (pumpOperating(next, "fwd1") && next.quantityKg.tank1 <= SCAVENGE_START_KG);

  const q = next.quantityKg;
  const low = {
    tank1: q.tank1 < LOW_ALERT_KG || (next.alerts.low.tank1 && q.tank1 < LOW_CLEAR_KG),
    tank2: q.tank2 < LOW_ALERT_KG || (next.alerts.low.tank2 && q.tank2 < LOW_CLEAR_KG),
  };
  const engineRunning = running.eng1 || running.eng2;
  const centerSwitchOn = next.pumpSwitches.ctrL || next.pumpSwitches.ctrR;
  const configSet = engineRunning && q.center > CONFIG_ALERT_KG && !centerSwitchOn;
  const configCleared = !engineRunning || q.center < CONFIG_CLEAR_KG || centerSwitchOn;
  const config = configSet || (next.alerts.config && !configCleared);
  const imbalance = Math.abs(q.tank1 - q.tank2);
  const imbal = imbalance > IMBAL_ALERT_KG || (next.alerts.imbal && imbalance > IMBAL_CLEAR_KG);

  return {
    ...next,
    centerLowPressureCaution,
    scavengeLatched,
    alerts: { low, config, imbal },
  };
}

const sameShape = (a: object, b: object) => JSON.stringify(a) === JSON.stringify(b);

export function fuelSystemReducer(state: FuelSystemState, action: FuelSystemAction): FuelSystemState {
  const next = applyAction(state, action);
  if (next === state) return state;
  const settled = settle(next);
  // Keep the previous objects when nothing derived changed (fewer renders)
  return {
    ...settled,
    running: sameShape(settled.running, state.running) ? state.running : settled.running,
    alerts: sameShape(settled.alerts, state.alerts) ? state.alerts : settled.alerts,
  };
}

/** Fire shutoff inputs from the fire protection indications. */
export function fireShutoffInputs(fire: {
  engineShutoff: Record<EngineId, boolean>;
  apuShutoff: boolean;
  apuAutoShutdown: boolean;
}): FireShutoffInputs {
  return {
    engineFireSwitch: { eng1: fire.engineShutoff.eng1, eng2: fire.engineShutoff.eng2 },
    apuShutoff: fire.apuShutoff,
    apuAutoShutdown: fire.apuAutoShutdown,
  };
}
