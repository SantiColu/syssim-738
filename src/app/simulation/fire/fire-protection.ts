// Fire protection (FCOM chapter 8), as fitted to the -800s YW001–YW164: one
// cargo fire bottle, red engine start lever lights and KIDDE lavatory smoke
// detectors. Everything here is pure: the React context only holds the state,
// runs it through fireProtectionReducer and times the bottle discharges.

import { pruneAcknowledged } from "../warning/master-caution";

export type EngineId = "eng1" | "eng2";
export type FireSwitchId = EngineId | "apu";
export type DetectorLoop = "A" | "B";
/** OVHT DET and cargo DET SELECT switches (the cargo one reads NORM). */
export type LoopSelect = "A" | "NORMAL" | "B";
export type CargoCompartment = "fwd" | "aft";
/** FAULT/INOP – OVHT/FIRE TEST switch, spring-loaded to center. */
export type FireTestPosition = "FAULT/INOP" | "CENTER" | "OVHT/FIRE";
/** Extinguisher TEST switch, spring-loaded to center. */
export type ExtTestPosition = "1" | "CENTER" | "2";
export type FireSwitchRotation = "L" | "R";

/**
 * What an engine detector loop senses: its temperature past the overheat
 * limit, then past the higher fire limit, or a failed loop.
 */
export type EngineLoopState = "normal" | "overheat" | "fire" | "failed";
/** The APU loop only senses fire. */
export type ApuLoopState = "normal" | "fire" | "failed";
/** The wheel well loop only senses fire and has no fault monitoring. */
export type WheelWellLoopState = "normal" | "fire";
export type SmokeDetectorState = "normal" | "smoke" | "failed";

export type BottleId = "left" | "right" | "apu" | "cargo";
export type DischargeTarget = EngineId | "apu" | CargoCompartment;
export type BottleStatus = "charged" | "discharging" | "discharged";

/** One squib per outlet: either engine bottle can be fired into either engine (FCOM 8.20.3). */
export const BOTTLE_OUTLETS: Record<BottleId, readonly DischargeTarget[]> = {
  left: ["eng1", "eng2"],
  right: ["eng1", "eng2"],
  apu: ["apu"],
  cargo: ["fwd", "aft"],
};

/**
 * The BOTTLE DISCHARGE lights come on "a few seconds" after the squib fires
 * (FCOM 8.20.2); the cargo DISCH light can take up to 30 s (8.20.6).
 */
export const DISCHARGE_DELAY_MS: Record<BottleId, number> = {
  left: 2500,
  right: 2500,
  apu: 2500,
  cargo: 6000,
};

export interface BottleState {
  status: BottleStatus;
  /** A fired squib loses continuity, so it no longer passes the EXT TEST. */
  firedSquibs: DischargeTarget[];
  dischargedInto: DischargeTarget[];
}

export interface SmokeDetectorDefinition {
  id: string;
  compartment: CargoCompartment;
  loop: DetectorLoop;
  /** Detector pair, forward to aft; each pair has one detector per loop. */
  position: number;
}

/**
 * Dual loop smoke detectors (FCOM 8.20.7 schematic, YC496–YW164): two pairs in
 * the forward compartment, three in the aft one, a discharge nozzle per pair.
 */
export const CARGO_DETECTOR_PAIRS: Record<CargoCompartment, number> = { fwd: 2, aft: 3 };

export const SMOKE_DETECTORS: SmokeDetectorDefinition[] = (["fwd", "aft"] as const).flatMap(
  (compartment) =>
    Array.from({ length: CARGO_DETECTOR_PAIRS[compartment] }, (_, position) =>
      (["A", "B"] as const).map((loop) => ({
        id: `${compartment}-${loop}${position + 1}`,
        compartment,
        loop,
        position,
      })),
    ).flat(),
);

/**
 * Lavatories A (forward left), D and E (aft left and right) of the -800
 * standard configuration (FCOM 1.40.35).
 */
export type LavatoryId = "A" | "D" | "E";
export const LAVATORIES: LavatoryId[] = ["A", "D", "E"];

/** Time for a fire in the towel container to heat the extinguisher nozzles open. */
export const LAVATORY_HEAT_DISCHARGE_DELAY_MS = 3000;

/**
 * Lavatory fire protection (FCOM 8.20.7-8), with no flight deck indication.
 * The KIDDE smoke detector alarms while there is smoke and resets by itself;
 * the extinguisher under the sink discharges by itself when its nozzles get
 * hot, and the temperature placard turns black.
 */
export interface LavatoryState {
  smoke: boolean;
  /** Fire in the towel disposal container. */
  fire: boolean;
  extinguisherDischarged: boolean;
  placardBlack: boolean;
}

export interface FireProtectionState {
  // Conditions and failures, injected from the plan view
  engineLoops: Record<EngineId, Record<DetectorLoop, EngineLoopState>>;
  apuLoop: ApuLoopState;
  wheelWellLoop: WheelWellLoopState;
  smokeDetectors: Record<string, SmokeDetectorState>;
  /** Cargo smoke detection runs on DC bus 1 (loop A) and DC bus 2 (loop B). */
  cargoLoopPowered: Record<DetectorLoop, boolean>;

  // Overheat/fire protection panel
  ovhtDet: Record<EngineId, LoopSelect>;
  fireTest: FireTestPosition;
  extTest: ExtTestPosition;
  /** Fire switches pulled up. */
  fireSwitches: Record<FireSwitchId, boolean>;

  // APU ground control panel (right main wheel well)
  apuGroundHandlePulled: boolean;

  // Cargo fire panel
  cargoDetSelect: Record<CargoCompartment, LoopSelect>;
  cargoArmed: Record<CargoCompartment, boolean>;
  cargoTest: boolean;

  bottles: Record<BottleId, BottleState>;
  lavatories: Record<LavatoryId, LavatoryState>;

  /** Fire warnings reset with FIRE WARN or BELL CUTOUT. */
  fireWarnAcknowledged: string[];
  /** Fire warnings silenced with the APU HORN CUTOUT switch. */
  hornCutoutAcknowledged: string[];
}

const charged = (): BottleState => ({ status: "charged", firedSquibs: [], dischargedInto: [] });

export const INITIAL_FIRE_PROTECTION: FireProtectionState = {
  engineLoops: {
    eng1: { A: "normal", B: "normal" },
    eng2: { A: "normal", B: "normal" },
  },
  apuLoop: "normal",
  wheelWellLoop: "normal",
  smokeDetectors: Object.fromEntries(SMOKE_DETECTORS.map(({ id }) => [id, "normal"])),
  cargoLoopPowered: { A: true, B: true },
  ovhtDet: { eng1: "NORMAL", eng2: "NORMAL" },
  fireTest: "CENTER",
  extTest: "CENTER",
  fireSwitches: { eng1: false, eng2: false, apu: false },
  apuGroundHandlePulled: false,
  cargoDetSelect: { fwd: "NORMAL", aft: "NORMAL" },
  cargoArmed: { fwd: false, aft: false },
  cargoTest: false,
  bottles: { left: charged(), right: charged(), apu: charged(), cargo: charged() },
  lavatories: Object.fromEntries(
    LAVATORIES.map((lav) => [
      lav,
      { smoke: false, fire: false, extinguisherDischarged: false, placardBlack: false },
    ]),
  ) as Record<LavatoryId, LavatoryState>,
  fireWarnAcknowledged: [],
  hornCutoutAcknowledged: [],
};

const selectedLoops = (select: LoopSelect): DetectorLoop[] =>
  select === "NORMAL" ? ["A", "B"] : [select];

const ENGINE_LEVEL: Record<Exclude<EngineLoopState, "failed">, number> = {
  normal: 0,
  overheat: 1,
  fire: 2,
};

/**
 * Engine overheat/fire detection (FCOM 8.20.1). In NORMAL both loops must
 * sense the condition; a failed loop is deselected and the other one works as
 * a single loop. With A or B only that loop is used and monitored. FAULT means
 * no working loop is left.
 */
export function engineDetection(
  loops: Record<DetectorLoop, EngineLoopState>,
  select: LoopSelect,
) {
  const working = selectedLoops(select)
    .map((loop) => loops[loop])
    .filter((state): state is Exclude<EngineLoopState, "failed"> => state !== "failed");
  const level = working.length > 0 ? Math.min(...working.map((s) => ENGINE_LEVEL[s])) : 0;
  return {
    fault: working.length === 0,
    overheat: level >= ENGINE_LEVEL.overheat,
    fire: level >= ENGINE_LEVEL.fire,
    /** The OVHT/FIRE test only gets through if every selected loop is sound. */
    respondsToTest: selectedLoops(select).every((loop) => loops[loop] !== "failed"),
  };
}

/**
 * Cargo smoke detection (FCOM 8.10.6, 8.20.5): at least one detector in each
 * selected loop must detect smoke. A loop without power is dropped
 * automatically and lights DETECTOR FAULT.
 */
export function cargoDetection(state: FireProtectionState, compartment: CargoCompartment) {
  const loops = selectedLoops(state.cargoDetSelect[compartment]);
  const powered = loops.filter((loop) => state.cargoLoopPowered[loop]);
  const detectors = (loop: DetectorLoop) =>
    SMOKE_DETECTORS.filter((d) => d.compartment === compartment && d.loop === loop).map(
      (d) => state.smokeDetectors[d.id],
    );
  return {
    loopFault: powered.length < loops.length,
    smoke: powered.length > 0 && powered.every((loop) => detectors(loop).includes("smoke")),
    /** The cargo TEST lights FWD/AFT only when all detectors in the selected loops respond. */
    respondsToTest:
      powered.length === loops.length &&
      loops.every((loop) => !detectors(loop).includes("failed")),
    hasFailedDetector: loops.some((loop) => detectors(loop).includes("failed")),
  };
}

const ENGINES: EngineId[] = ["eng1", "eng2"];
const COMPARTMENTS: CargoCompartment[] = ["fwd", "aft"];
const byEngine = <T>(fn: (engine: EngineId) => T) =>
  ({ eng1: fn("eng1"), eng2: fn("eng2") }) as Record<EngineId, T>;
const byCompartment = <T>(fn: (compartment: CargoCompartment) => T) =>
  ({ fwd: fn("fwd"), aft: fn("aft") }) as Record<CargoCompartment, T>;

/** Every light, aural warning and shutoff the fire protection system drives. */
export function getFireIndications(state: FireProtectionState) {
  const ovhtFireTest = state.fireTest === "OVHT/FIRE";
  const faultTest = state.fireTest === "FAULT/INOP";

  const engines = byEngine((engine) => {
    const detection = engineDetection(state.engineLoops[engine], state.ovhtDet[engine]);
    const tested = ovhtFireTest && detection.respondsToTest;
    const fireSwitchLit = detection.fire || tested;
    // An engine fire also lights all the overheat alert indications
    const overheatLit = detection.overheat || tested;
    return {
      detection,
      fireSwitchLit,
      overheatLit,
      startLeverLit: fireSwitchLit,
      unlocked: fireSwitchLit || overheatLit,
    };
  });

  const apuDetectedFire = state.apuLoop === "fire";
  const apuFireSwitchLit = apuDetectedFire || (ovhtFireTest && state.apuLoop !== "failed");
  // AC transfer bus 2 is assumed powered, so the test always reaches the loop
  const wheelWellLit = state.wheelWellLoop === "fire" || ovhtFireTest;

  const cargo = byCompartment((compartment) => {
    const detection = cargoDetection(state, compartment);
    return {
      detection,
      lit: detection.smoke || (state.cargoTest && detection.respondsToTest),
      armed: state.cargoArmed[compartment],
      /** EXT lights: squib continuity, checked with the cargo TEST switch. */
      extTestLit: state.cargoTest && !state.bottles.cargo.firedSquibs.includes(compartment),
    };
  });
  const cargoDetectorFault =
    COMPARTMENTS.some((c) => cargo[c].detection.loopFault) ||
    (state.cargoTest && COMPARTMENTS.some((c) => cargo[c].detection.hasFailedDetector));

  const extTestTarget: EngineId | null =
    state.extTest === "1" ? "eng1" : state.extTest === "2" ? "eng2" : null;
  const squibIntact = (bottle: BottleId, target: DischargeTarget) =>
    !state.bottles[bottle].firedSquibs.includes(target);

  const sources = fireWarningSources(state);
  const warnActive = sources.filter((id) => !state.fireWarnAcknowledged.includes(id));
  const bellActive = warnActive.filter((id) => !state.hornCutoutAcknowledged.includes(id));
  const apuFireSignal = sources.includes("apu-fire");
  const hornCutout = state.hornCutoutAcknowledged.includes("apu-fire");

  const apuShutoff = state.fireSwitches.apu || state.apuGroundHandlePulled;

  return {
    engines,
    /** One FAULT light for both engines; no MASTER CAUTION. */
    faultLit: faultTest || ENGINES.some((engine) => engines[engine].detection.fault),
    apuFireSwitchLit,
    apuFireSwitchUnlocked: apuFireSwitchLit,
    apuDetInopLit: faultTest || state.apuLoop === "failed",
    wheelWellLit,
    bottleDischargeLit: {
      left: state.bottles.left.status === "discharged",
      right: state.bottles.right.status === "discharged",
      apu: state.bottles.apu.status === "discharged",
    },
    extTestLit: {
      left: extTestTarget !== null && squibIntact("left", extTestTarget),
      right: extTestTarget !== null && squibIntact("right", extTestTarget),
      apu: extTestTarget !== null && squibIntact("apu", "apu"),
    },
    cargo,
    cargoDetectorFault,
    cargoDischLit: state.cargoTest || state.bottles.cargo.status === "discharged",

    fireWarnLit: warnActive.length > 0,
    bellSounding: bellActive.length > 0,
    /** Remote APU fire warning horn in the main wheel well (on the ground). */
    hornSounding: apuFireSignal && bellActive.includes("apu-fire"),
    apuGroundLight: !apuFireSignal ? "off" : hornCutout ? "steady" : "flashing",

    /** Engine fire switch up: fuel, spar, hydraulic and bleed valves close, generator trips, reverser disabled. */
    engineShutoff: byEngine((engine) => state.fireSwitches[engine]),
    /** APU fire switch up or ground handle down: fuel, bleed valve and inlet door close, generator trips. */
    apuShutoff,
    /** The APU shuts itself down on a detected fire (not on the test). */
    apuAutoShutdown: apuDetectedFire,
    /** Squibs a fire switch or the ground handle has armed. */
    squibArmed: (bottle: BottleId, target: DischargeTarget) =>
      bottle === "cargo"
        ? state.cargoArmed[target as CargoCompartment]
        : target === "apu"
          ? apuShutoff
          : state.fireSwitches[target as EngineId],
  };
}

export type FireIndications = ReturnType<typeof getFireIndications>;

/** Red fire warnings (and their tests) that light FIRE WARN and ring the bell. */
export function fireWarningSources(state: FireProtectionState): string[] {
  const ovhtFireTest = state.fireTest === "OVHT/FIRE";
  const sources: string[] = [];
  for (const engine of ENGINES) {
    const detection = engineDetection(state.engineLoops[engine], state.ovhtDet[engine]);
    if (detection.fire || (ovhtFireTest && detection.respondsToTest)) sources.push(`${engine}-fire`);
  }
  if (state.apuLoop === "fire" || (ovhtFireTest && state.apuLoop !== "failed")) {
    sources.push("apu-fire");
  }
  if (state.wheelWellLoop === "fire" || ovhtFireTest) sources.push("wheel-well-fire");
  for (const compartment of COMPARTMENTS) {
    if (cargoDetection(state, compartment).smoke) sources.push(`cargo-${compartment}-fire`);
  }
  if (state.cargoTest) sources.push("cargo-test");
  return sources;
}

export type FireProtectionAction =
  | { type: "setEngineLoop"; engine: EngineId; loop: DetectorLoop; state: EngineLoopState }
  | { type: "setApuLoop"; state: ApuLoopState }
  | { type: "setWheelWellLoop"; state: WheelWellLoopState }
  | { type: "setSmokeDetector"; id: string; state: SmokeDetectorState }
  | { type: "setCargoLoopPowered"; loop: DetectorLoop; powered: boolean }
  | { type: "setOvhtDet"; engine: EngineId; select: LoopSelect }
  | { type: "setFireTest"; position: FireTestPosition }
  | { type: "setExtTest"; position: ExtTestPosition }
  /** `override`: the lock override button under the handle is held. */
  | { type: "pullFireSwitch"; id: FireSwitchId; override?: boolean }
  | { type: "stowFireSwitch"; id: FireSwitchId }
  | { type: "rotateFireSwitch"; id: FireSwitchId; direction: FireSwitchRotation }
  | { type: "setApuGroundHandle"; pulled: boolean }
  | { type: "apuGroundDischarge" }
  | { type: "setCargoDetSelect"; compartment: CargoCompartment; select: LoopSelect }
  | { type: "toggleCargoArm"; compartment: CargoCompartment }
  | { type: "setCargoTest"; pressed: boolean }
  | { type: "cargoDischarge" }
  /** The agent has left the bottle: lights its DISCHARGE light. */
  | { type: "completeDischarge"; bottle: BottleId }
  | { type: "pushFireWarn" }
  | { type: "pushHornCutout" }
  | { type: "setLavatorySmoke"; lavatory: LavatoryId; smoke: boolean }
  | { type: "setLavatoryFire"; lavatory: LavatoryId; fire: boolean }
  /** The heat-activated nozzles have reached their temperature and open. */
  | { type: "lavatoryHeatDischarge"; lavatory: LavatoryId };

function fireSquibs(
  state: FireProtectionState,
  bottle: BottleId,
  targets: DischargeTarget[],
): FireProtectionState {
  const current = state.bottles[bottle];
  const fresh = targets.filter((target) => !current.firedSquibs.includes(target));
  if (fresh.length === 0) return state;
  const next: BottleState = {
    ...current,
    firedSquibs: [...current.firedSquibs, ...fresh],
    // An empty bottle has nothing left to send
    ...(current.status === "charged" ? { status: "discharging", dischargedInto: fresh } : {}),
  };
  return { ...state, bottles: { ...state.bottles, [bottle]: next } };
}

/**
 * Simulator choice (not in the FCOM): the agent puts the fire out where it is
 * discharged, so the detectors there cool below their onset temperature.
 */
function extinguish(state: FireProtectionState, targets: DischargeTarget[]): FireProtectionState {
  let next = state;
  for (const target of targets) {
    if (target === "eng1" || target === "eng2") {
      const cool = (s: EngineLoopState): EngineLoopState => (s === "failed" ? s : "normal");
      const loops = next.engineLoops[target];
      next = {
        ...next,
        engineLoops: { ...next.engineLoops, [target]: { A: cool(loops.A), B: cool(loops.B) } },
      };
    } else if (target === "apu") {
      if (next.apuLoop === "fire") next = { ...next, apuLoop: "normal" };
    } else {
      const cleared = SMOKE_DETECTORS.filter(
        (d) => d.compartment === target && next.smokeDetectors[d.id] === "smoke",
      );
      next = {
        ...next,
        smokeDetectors: {
          ...next.smokeDetectors,
          ...Object.fromEntries(cleared.map(({ id }) => [id, "normal"])),
        },
      };
    }
  }
  return next;
}

function applyAction(state: FireProtectionState, action: FireProtectionAction): FireProtectionState {
  switch (action.type) {
    case "setEngineLoop":
      return {
        ...state,
        engineLoops: {
          ...state.engineLoops,
          [action.engine]: { ...state.engineLoops[action.engine], [action.loop]: action.state },
        },
      };
    case "setApuLoop":
      return { ...state, apuLoop: action.state };
    case "setWheelWellLoop":
      return { ...state, wheelWellLoop: action.state };
    case "setSmokeDetector":
      return { ...state, smokeDetectors: { ...state.smokeDetectors, [action.id]: action.state } };
    case "setCargoLoopPowered":
      return {
        ...state,
        cargoLoopPowered: { ...state.cargoLoopPowered, [action.loop]: action.powered },
      };
    case "setOvhtDet":
      return { ...state, ovhtDet: { ...state.ovhtDet, [action.engine]: action.select } };
    case "setFireTest":
      return { ...state, fireTest: action.position };
    case "setExtTest":
      return { ...state, extTest: action.position };
    case "pullFireSwitch": {
      const indications = getFireIndications(state);
      const unlocked =
        action.id === "apu"
          ? indications.apuFireSwitchUnlocked
          : indications.engines[action.id].unlocked;
      if (state.fireSwitches[action.id] || !(unlocked || action.override)) return state;
      return { ...state, fireSwitches: { ...state.fireSwitches, [action.id]: true } };
    }
    case "stowFireSwitch":
      return { ...state, fireSwitches: { ...state.fireSwitches, [action.id]: false } };
    case "rotateFireSwitch": {
      if (!state.fireSwitches[action.id]) return state;
      if (action.id === "apu") return fireSquibs(state, "apu", ["apu"]);
      // Left: left bottle, right: right bottle (FCOM 8.20.3)
      return fireSquibs(state, action.direction === "L" ? "left" : "right", [action.id]);
    }
    case "setApuGroundHandle":
      return { ...state, apuGroundHandlePulled: action.pulled };
    case "apuGroundDischarge":
      return state.apuGroundHandlePulled ? fireSquibs(state, "apu", ["apu"]) : state;
    case "setCargoDetSelect":
      return {
        ...state,
        cargoDetSelect: { ...state.cargoDetSelect, [action.compartment]: action.select },
      };
    case "toggleCargoArm":
      return {
        ...state,
        cargoArmed: {
          ...state.cargoArmed,
          [action.compartment]: !state.cargoArmed[action.compartment],
        },
      };
    case "setCargoTest":
      return { ...state, cargoTest: action.pressed };
    case "cargoDischarge": {
      const armed = COMPARTMENTS.filter((compartment) => state.cargoArmed[compartment]);
      return armed.length > 0 ? fireSquibs(state, "cargo", armed) : state;
    }
    case "completeDischarge": {
      const bottle = state.bottles[action.bottle];
      if (bottle.status !== "discharging") return state;
      const next = {
        ...state,
        bottles: { ...state.bottles, [action.bottle]: { ...bottle, status: "discharged" as const } },
      };
      return extinguish(next, bottle.dischargedInto);
    }
    case "pushFireWarn":
      return { ...state, fireWarnAcknowledged: fireWarningSources(state) };
    case "pushHornCutout":
      return { ...state, hornCutoutAcknowledged: fireWarningSources(state) };
    case "setLavatorySmoke": {
      const lavatory = { ...state.lavatories[action.lavatory], smoke: action.smoke };
      return { ...state, lavatories: { ...state.lavatories, [action.lavatory]: lavatory } };
    }
    case "setLavatoryFire": {
      const current = state.lavatories[action.lavatory];
      const lavatory: LavatoryState = {
        ...current,
        fire: action.fire,
        smoke: current.smoke || action.fire,
        placardBlack: current.placardBlack || action.fire,
      };
      return { ...state, lavatories: { ...state.lavatories, [action.lavatory]: lavatory } };
    }
    case "lavatoryHeatDischarge": {
      const current = state.lavatories[action.lavatory];
      if (!current.fire || current.extinguisherDischarged) return state;
      // Simulator choice: the agent puts the fire out; an empty bottle would
      // leave it burning.
      const lavatory: LavatoryState = { ...current, fire: false, extinguisherDischarged: true };
      return { ...state, lavatories: { ...state.lavatories, [action.lavatory]: lavatory } };
    }
  }
}

/**
 * A warning reset with FIRE WARN stays dark only while its source stays on:
 * once it goes out, a new detection (a cargo fire light coming back, FCOM
 * 8.20.6) lights FIRE WARN and rings the bell again.
 */
export function fireProtectionReducer(
  state: FireProtectionState,
  action: FireProtectionAction,
): FireProtectionState {
  const next = applyAction(state, action);
  if (next === state) return state;
  const active = fireWarningSources(next).map((id) => ({ id }));
  return {
    ...next,
    fireWarnAcknowledged: pruneAcknowledged(next.fireWarnAcknowledged, active),
    hornCutoutAcknowledged: pruneAcknowledged(next.hornCutoutAcknowledged, active),
  };
}

/** Lights that feed the OVHT/DET system annunciator and MASTER CAUTION. */
export function overheatDetectionCautions(indications: FireIndications): string[] {
  const cautions: string[] = [];
  for (const engine of ENGINES) {
    if (indications.engines[engine].overheatLit) cautions.push(`eng-overheat-${engine}`);
  }
  if (indications.apuDetInopLit) cautions.push("apu-det-inop");
  return cautions;
}
