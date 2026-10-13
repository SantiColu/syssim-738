"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { MAIN_PNEUMATIC_SYSTEM, PNEUMATIC_NODE } from "./main-network";
import { solvePneumaticNetwork } from "./solve-network";
import {
  computeRuntimeState,
  INITIAL_BLEED_TRIP_SENSORS,
  INITIAL_MANUAL_VALVES,
  INITIAL_SOURCES,
  INITIAL_SWITCHES,
  INITIAL_TRIM_VALVES,
  type IsoValvePosition,
  type PackPosition,
  type PneumaticSourcesState,
  type PneumaticSwitchesState,
  type TrimZone,
  type WindowHeatSwitches,
} from "./runtime-state";
import type {
  PneumaticNetwork,
  PneumaticRuntimeState,
  PneumaticSolution,
} from "./types";
import { INITIAL_PACK_TRIP_SENSORS, isPackTripped } from "../ecs/pack-trip";

export {
  INTERACTIVE_MANUAL_VALVES,
  type IsoValvePosition,
  type PackPosition,
  type PneumaticSourcesState,
  type PneumaticSwitchesState,
  type WindowHeatSwitches,
} from "./runtime-state";

export type ProbeId =
  | "captPitot"
  | "lElevPitot"
  | "lAlphaVane"
  | "tempProbe"
  | "foPitot"
  | "rElevPitot"
  | "rAlphaVane"
  | "auxPitot";

export const PROBE_SYSTEM_MAP: Record<ProbeId, "A" | "B"> = {
  captPitot: "A",
  lElevPitot: "A",
  lAlphaVane: "A",
  tempProbe: "A",
  foPitot: "B",
  rElevPitot: "B",
  rAlphaVane: "B",
  auxPitot: "B",
};

export interface PneumaticContextValue {
  switches: PneumaticSwitchesState;
  sourcesState: PneumaticSourcesState;
  setLPack: (pos: PackPosition) => void;
  setIsolationValve: (pos: IsoValvePosition) => void;
  setRPack: (pos: PackPosition) => void;
  setEng1Bleed: (on: boolean) => void;
  setApuBleed: (on: boolean) => void;
  setEng2Bleed: (on: boolean) => void;
  setLRecircFan: (on: boolean) => void;
  setRRecircFan: (on: boolean) => void;
  setTrimAir: (on: boolean) => void;
  trimValves: Record<TrimZone, boolean>;
  toggleTrimValve: (zone: TrimZone) => void;
  setWingAntiIce: (on: boolean) => void;
  setEng1AntiIce: (on: boolean) => void;
  setEng2AntiIce: (on: boolean) => void;
  windowHeat: WindowHeatSwitches;
  setWindowHeat: (key: keyof WindowHeatSwitches, on: boolean) => void;
  toggleWindowHeat: (key: keyof WindowHeatSwitches) => void;
  windowOverheat: WindowHeatSwitches;
  toggleWindowOverheat: (key: keyof WindowHeatSwitches) => void;
  windowHeatTest: "OVHT" | "CENTER" | "PWR TEST";
  setWindowHeatTest: (pos: "OVHT" | "CENTER" | "PWR TEST") => void;
  triggerWindowHeatTest: (pos: "OVHT" | "PWR TEST") => void;
  setEng1Running: (running: boolean) => void;
  setEng2Running: (running: boolean) => void;
  setApuRunning: (running: boolean) => void;
  setGndAirConnected: (connected: boolean) => void;
  toggleEng1: () => void;
  toggleEng2: () => void;
  toggleApu: () => void;
  toggleGndAir: () => void;
  runtimeState: PneumaticRuntimeState;
  solution: PneumaticSolution;
  network: PneumaticNetwork;
  leftDuctPressurePsi: number;
  rightDuctPressurePsi: number;
  isDualBleed: boolean;
  overheatSensors: Record<number, boolean>;
  toggleOverheatSensor: (id: number) => void;
  resetOverheatSensors: () => void;
  isLeftWingBodyOverheat: boolean;
  isRightWingBodyOverheat: boolean;
  bleedTripSensors: Record<string, boolean>;
  toggleBleedTripSensor: (id: string) => void;
  resetBleedTripSensors: () => void;
  isLeftBleedTripOff: boolean;
  isRightBleedTripOff: boolean;
  /** Pack overheat sensors (ECS), keyed by packTripSensorId. */
  packTripSensors: Record<string, boolean>;
  togglePackTripSensor: (id: string) => void;
  resetPackTripSensors: () => void;
  isLeftPackTripOff: boolean;
  isRightPackTripOff: boolean;
  manualValves: Record<string, boolean>;
  toggleManualValve: (valveId: string) => void;
  setManualValve: (valveId: string, open: boolean) => void;
  cowlOverpressure: { eng1: boolean; eng2: boolean };
  toggleCowlOverpressure: (eng: "eng1" | "eng2") => void;
  setCowlOverpressure: (eng: "eng1" | "eng2", overpressure: boolean) => void;
  wingThermalOvertemp: { left: boolean; right: boolean };
  toggleWingThermalOvertemp: (side: "left" | "right") => void;
  setWingThermalOvertemp: (side: "left" | "right", overtemp: boolean) => void;
  probeHeatSwitches: { a: "AUTO" | "ON"; b: "AUTO" | "ON" };
  setProbeHeatSwitch: (sys: "a" | "b", pos: "AUTO" | "ON") => void;
  probeFailures: Record<ProbeId, boolean>;
  toggleProbeFailure: (id: ProbeId) => void;
  setProbeFailure: (id: ProbeId, failed: boolean) => void;
  isProbeHeated: (id: ProbeId) => boolean;
}

const INITIAL_OVERHEAT_SENSORS: Record<number, boolean> = {
  1: false,
  2: false,
  3: false,
  4: false,
  5: false,
  6: false,
  7: false,
  8: false,
};

const PneumaticContext = createContext<PneumaticContextValue | null>(null);

export function PneumaticProvider({ children }: { children: React.ReactNode }) {
  const [switches, setSwitches] = useState<PneumaticSwitchesState>(INITIAL_SWITCHES);
  const [sourcesState, setSourcesState] = useState<PneumaticSourcesState>(INITIAL_SOURCES);
  const [manualValves, setManualValves] =
    useState<Record<string, boolean>>(INITIAL_MANUAL_VALVES);
  const [overheatSensors, setOverheatSensors] =
    useState<Record<number, boolean>>(INITIAL_OVERHEAT_SENSORS);
  const [bleedTripSensors, setBleedTripSensors] =
    useState<Record<string, boolean>>(INITIAL_BLEED_TRIP_SENSORS);
  const [packTripSensors, setPackTripSensors] =
    useState<Record<string, boolean>>(INITIAL_PACK_TRIP_SENSORS);
  const [windowOverheat, setWindowOverheat] = useState<WindowHeatSwitches>({
    sideL: false,
    fwdL: false,
    fwdR: false,
    sideR: false,
  });
  const [windowHeatTest, setWindowHeatTestState] = useState<
    "OVHT" | "CENTER" | "PWR TEST"
  >("CENTER");
  const windowTestTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [cowlOverpressure, setCowlOverpressureState] = useState<{
    eng1: boolean;
    eng2: boolean;
  }>({
    eng1: false,
    eng2: false,
  });

  const [wingThermalOvertemp, setWingThermalOvertempState] = useState<{
    left: boolean;
    right: boolean;
  }>({
    left: false,
    right: false,
  });

  const setCowlOverpressure = (eng: "eng1" | "eng2", overpressure: boolean) => {
    setCowlOverpressureState((prev) => ({
      ...prev,
      [eng]: overpressure,
    }));
  };

  const toggleCowlOverpressure = (eng: "eng1" | "eng2") => {
    setCowlOverpressureState((prev) => ({
      ...prev,
      [eng]: !prev[eng],
    }));
  };

  const setWingThermalOvertemp = (side: "left" | "right", overtemp: boolean) => {
    setWingThermalOvertempState((prev) => {
      const next = { ...prev, [side]: overtemp };
      if (overtemp) {
        setSwitches((s) => ({ ...s, wingAntiIce: false }));
      }
      return next;
    });
  };

  const toggleWingThermalOvertemp = (side: "left" | "right") => {
    setWingThermalOvertempState((prev) => {
      const nextVal = !prev[side];
      const next = { ...prev, [side]: nextVal };
      if (nextVal) {
        setSwitches((s) => ({ ...s, wingAntiIce: false }));
      }
      return next;
    });
  };

  const [probeHeatSwitches, setProbeHeatSwitches] = useState<{
    a: "AUTO" | "ON";
    b: "AUTO" | "ON";
  }>({
    a: "AUTO",
    b: "AUTO",
  });

  const [probeFailures, setProbeFailures] = useState<Record<ProbeId, boolean>>({
    captPitot: false,
    lElevPitot: false,
    lAlphaVane: false,
    tempProbe: false,
    foPitot: false,
    rElevPitot: false,
    rAlphaVane: false,
    auxPitot: false,
  });

  const setProbeHeatSwitch = (sys: "a" | "b", pos: "AUTO" | "ON") => {
    setProbeHeatSwitches((prev) => ({ ...prev, [sys]: pos }));
  };

  const toggleProbeFailure = (id: ProbeId) => {
    setProbeFailures((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const setProbeFailure = (id: ProbeId, failed: boolean) => {
    setProbeFailures((prev) => ({ ...prev, [id]: failed }));
  };

  const isEitherEngineRunning = sourcesState.eng1Running || sourcesState.eng2Running;
  const isSysAPowered =
    probeHeatSwitches.a === "ON" ||
    (probeHeatSwitches.a === "AUTO" && isEitherEngineRunning);
  const isSysBPowered =
    probeHeatSwitches.b === "ON" ||
    (probeHeatSwitches.b === "AUTO" && isEitherEngineRunning);

  const isProbeHeated = useCallback(
    (id: ProbeId): boolean => {
      const sys = PROBE_SYSTEM_MAP[id];
      const isPowered = sys === "A" ? isSysAPowered : isSysBPowered;
      return isPowered && !probeFailures[id];
    },
    [isSysAPowered, isSysBPowered, probeFailures],
  );

  const setLPack = (pos: PackPosition) =>
    setSwitches((s) => ({ ...s, lPack: pos }));
  const setIsolationValve = (pos: IsoValvePosition) =>
    setSwitches((s) => ({ ...s, isolationValve: pos }));
  const setRPack = (pos: PackPosition) =>
    setSwitches((s) => ({ ...s, rPack: pos }));
  const setEng1Bleed = (on: boolean) =>
    setSwitches((s) => ({ ...s, eng1Bleed: on }));
  const setApuBleed = (on: boolean) =>
    setSwitches((s) => ({ ...s, apuBleed: on }));
  const setEng2Bleed = (on: boolean) =>
    setSwitches((s) => ({ ...s, eng2Bleed: on }));
  const setLRecircFan = (on: boolean) =>
    setSwitches((s) => ({ ...s, lRecircFan: on }));
  const setRRecircFan = (on: boolean) =>
    setSwitches((s) => ({ ...s, rRecircFan: on }));
  const setTrimAir = (on: boolean) =>
    setSwitches((s) => ({ ...s, trimAir: on }));
  const [trimValves, setTrimValves] = useState(INITIAL_TRIM_VALVES);
  const toggleTrimValve = (zone: TrimZone) =>
    setTrimValves((valves) => ({ ...valves, [zone]: !valves[zone] }));

  const setWingAntiIce = useCallback(
    (on: boolean) => {
      if (on && (wingThermalOvertemp.left || wingThermalOvertemp.right)) {
        setSwitches((s) => ({ ...s, wingAntiIce: false }));
        return;
      }
      setSwitches((s) => ({ ...s, wingAntiIce: on }));
    },
    [wingThermalOvertemp],
  );

  const setEng1AntiIce = (on: boolean) => {
    setSwitches((s) => ({ ...s, eng1AntiIce: on }));
  };

  const setEng2AntiIce = (on: boolean) => {
    setSwitches((s) => ({ ...s, eng2AntiIce: on }));
  };

  const setEng1Running = (running: boolean) =>
    setSourcesState((s) => ({ ...s, eng1Running: running }));
  const setEng2Running = (running: boolean) =>
    setSourcesState((s) => ({ ...s, eng2Running: running }));
  const setApuRunning = (running: boolean) =>
    setSourcesState((s) => ({ ...s, apuRunning: running }));
  const setGndAirConnected = (connected: boolean) =>
    setSourcesState((s) => ({ ...s, gndAirConnected: connected }));

  const toggleEng1 = () =>
    setSourcesState((s) => ({ ...s, eng1Running: !s.eng1Running }));
  const toggleEng2 = () =>
    setSourcesState((s) => ({ ...s, eng2Running: !s.eng2Running }));
  const toggleApu = () =>
    setSourcesState((s) => ({ ...s, apuRunning: !s.apuRunning }));
  const toggleGndAir = () =>
    setSourcesState((s) => ({ ...s, gndAirConnected: !s.gndAirConnected }));

  const toggleManualValve = (valveId: string) => {
    setManualValves((prev) => ({
      ...prev,
      [valveId]: !prev[valveId],
    }));
  };

  const setManualValve = (valveId: string, open: boolean) => {
    setManualValves((prev) => ({
      ...prev,
      [valveId]: open,
    }));
  };

  const toggleOverheatSensor = (id: number) =>
    setOverheatSensors((prev) => ({ ...prev, [id]: !prev[id] }));

  const resetOverheatSensors = () =>
    setOverheatSensors(INITIAL_OVERHEAT_SENSORS);

  const isLeftWingBodyOverheat = Boolean(
    overheatSensors[1] ||
      overheatSensors[2] ||
      overheatSensors[3] ||
      overheatSensors[4] ||
      overheatSensors[5],
  );

  const isRightWingBodyOverheat = Boolean(
    overheatSensors[6] ||
      overheatSensors[7] ||
      overheatSensors[8],
  );

  const toggleBleedTripSensor = (id: string) =>
    setBleedTripSensors((prev) => ({ ...prev, [id]: !prev[id] }));

  const resetBleedTripSensors = () =>
    setBleedTripSensors(INITIAL_BLEED_TRIP_SENSORS);

  const isLeftBleedTripOff = Boolean(
    bleedTripSensors["eng1-upstream"] || bleedTripSensors["eng1-downstream"],
  );

  const isRightBleedTripOff = Boolean(
    bleedTripSensors["eng2-upstream"] || bleedTripSensors["eng2-downstream"],
  );

  const togglePackTripSensor = (id: string) =>
    setPackTripSensors((prev) => ({ ...prev, [id]: !prev[id] }));

  const resetPackTripSensors = () =>
    setPackTripSensors(INITIAL_PACK_TRIP_SENSORS);

  const isLeftPackTripOff = isPackTripped(packTripSensors, "L");
  const isRightPackTripOff = isPackTripped(packTripSensors, "R");

  const runtimeState = useMemo(
    () =>
      computeRuntimeState(
        switches,
        sourcesState,
        manualValves,
        bleedTripSensors,
        packTripSensors,
      ),
    [switches, sourcesState, manualValves, bleedTripSensors, packTripSensors],
  );

  const solution = useMemo(
    () =>
      solvePneumaticNetwork(
        MAIN_PNEUMATIC_SYSTEM.network,
        runtimeState,
      ),
    [runtimeState],
  );

  const setWindowHeat = useCallback(
    (key: keyof WindowHeatSwitches, on: boolean) => {
      setSwitches((prev) => ({
        ...prev,
        windowHeat: {
          ...prev.windowHeat,
          [key]: on,
        },
      }));
    },
    [],
  );

  const toggleWindowHeat = useCallback((key: keyof WindowHeatSwitches) => {
    setSwitches((prev) => ({
      ...prev,
      windowHeat: {
        ...prev.windowHeat,
        [key]: !prev.windowHeat[key],
      },
    }));
  }, []);

  const toggleWindowOverheat = useCallback((key: keyof WindowHeatSwitches) => {
    setWindowOverheat((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const setWindowHeatTest = useCallback(
    (pos: "OVHT" | "CENTER" | "PWR TEST") => {
      if (windowTestTimerRef.current) clearTimeout(windowTestTimerRef.current);
      setWindowHeatTestState(pos);
    },
    [],
  );

  const triggerWindowHeatTest = useCallback((pos: "OVHT" | "PWR TEST") => {
    if (windowTestTimerRef.current) clearTimeout(windowTestTimerRef.current);
    setWindowHeatTestState(pos);
    windowTestTimerRef.current = setTimeout(() => {
      setWindowHeatTestState("CENTER");
    }, 1100);
  }, []);

  // Pressure readings for DUCT PRESS gauge, taken at each side of the manifold
  const leftDuctPressurePsi =
    solution.nodes[PNEUMATIC_NODE.leftManifold]?.pressurePsi ?? 0;
  const rightDuctPressurePsi =
    solution.nodes[PNEUMATIC_NODE.rightManifold]?.pressurePsi ?? 0;

  // DUAL BLEED annunciator logic per Boeing FCOM 2.10.2:
  // Illuminated (amber) – APU bleed air valve open and engine No. 1 BLEED air switch ON,
  // or engine No. 2 BLEED air switch ON, APU bleed air valve and isolation valve open.
  const isIsoOpen = runtimeState.accessories[PNEUMATIC_NODE.isolationValve]?.open ?? false;
  const isApuValveOpen = runtimeState.accessories[PNEUMATIC_NODE.apuBleedValve]?.open ?? false;
  const isDualBleed =
    isApuValveOpen &&
    (switches.eng1Bleed || (switches.eng2Bleed && isIsoOpen));

  const value: PneumaticContextValue = useMemo(
    () => ({
      switches,
      sourcesState,
      setLPack,
      setIsolationValve,
      setRPack,
      setEng1Bleed,
      setApuBleed,
      setEng2Bleed,
      setLRecircFan,
      setRRecircFan,
      setTrimAir,
      trimValves,
      toggleTrimValve,
      setWingAntiIce,
      setEng1AntiIce,
      setEng2AntiIce,
      windowHeat: switches.windowHeat,
      setWindowHeat,
      toggleWindowHeat,
      windowOverheat,
      toggleWindowOverheat,
      windowHeatTest,
      setWindowHeatTest,
      triggerWindowHeatTest,
      setEng1Running,
      setEng2Running,
      setApuRunning,
      setGndAirConnected,
      toggleEng1,
      toggleEng2,
      toggleApu,
      toggleGndAir,
      runtimeState,
      solution,
      network: MAIN_PNEUMATIC_SYSTEM.network,
      leftDuctPressurePsi,
      rightDuctPressurePsi,
      isDualBleed,
      overheatSensors,
      toggleOverheatSensor,
      resetOverheatSensors,
      isLeftWingBodyOverheat,
      isRightWingBodyOverheat,
      bleedTripSensors,
      toggleBleedTripSensor,
      resetBleedTripSensors,
      isLeftBleedTripOff,
      isRightBleedTripOff,
      packTripSensors,
      togglePackTripSensor,
      resetPackTripSensors,
      isLeftPackTripOff,
      isRightPackTripOff,
      manualValves,
      toggleManualValve,
      setManualValve,
      cowlOverpressure,
      toggleCowlOverpressure,
      setCowlOverpressure,
      wingThermalOvertemp,
      toggleWingThermalOvertemp,
      setWingThermalOvertemp,
      probeHeatSwitches,
      setProbeHeatSwitch,
      probeFailures,
      toggleProbeFailure,
      setProbeFailure,
      isProbeHeated,
    }),
    [
      switches,
      sourcesState,
      runtimeState,
      solution,
      leftDuctPressurePsi,
      rightDuctPressurePsi,
      isDualBleed,
      overheatSensors,
      isLeftWingBodyOverheat,
      isRightWingBodyOverheat,
      bleedTripSensors,
      isLeftBleedTripOff,
      isRightBleedTripOff,
      packTripSensors,
      isLeftPackTripOff,
      isRightPackTripOff,
      manualValves,
      trimValves,
      windowOverheat,
      windowHeatTest,
      setWindowHeat,
      toggleWindowHeat,
      toggleWindowOverheat,
      setWindowHeatTest,
      triggerWindowHeatTest,
      cowlOverpressure,
      wingThermalOvertemp,
      setWingAntiIce,
      probeHeatSwitches,
      probeFailures,
      isProbeHeated,
    ],
  );

  return (
    <PneumaticContext.Provider value={value}>
      {children}
    </PneumaticContext.Provider>
  );
}

const fallbackRuntime = computeRuntimeState(INITIAL_SWITCHES, INITIAL_SOURCES);
const fallbackSolution = solvePneumaticNetwork(
  MAIN_PNEUMATIC_SYSTEM.network,
  fallbackRuntime,
);

const fallbackValue: PneumaticContextValue = {
  switches: INITIAL_SWITCHES,
  sourcesState: INITIAL_SOURCES,
  setLPack: () => {},
  setIsolationValve: () => {},
  setRPack: () => {},
  setEng1Bleed: () => {},
  setApuBleed: () => {},
  setEng2Bleed: () => {},
  setLRecircFan: () => {},
  setRRecircFan: () => {},
  setTrimAir: () => {},
  trimValves: INITIAL_TRIM_VALVES,
  toggleTrimValve: () => {},
  setWingAntiIce: () => {},
  setEng1AntiIce: () => {},
  setEng2AntiIce: () => {},
  windowHeat: INITIAL_SWITCHES.windowHeat,
  setWindowHeat: () => {},
  toggleWindowHeat: () => {},
  windowOverheat: {
    sideL: false,
    fwdL: false,
    fwdR: false,
    sideR: false,
  },
  toggleWindowOverheat: () => {},
  windowHeatTest: "CENTER",
  setWindowHeatTest: () => {},
  triggerWindowHeatTest: () => {},
  setEng1Running: () => {},
  setEng2Running: () => {},
  setApuRunning: () => {},
  setGndAirConnected: () => {},
  toggleEng1: () => {},
  toggleEng2: () => {},
  toggleApu: () => {},
  toggleGndAir: () => {},
  runtimeState: fallbackRuntime,
  solution: fallbackSolution,
  network: MAIN_PNEUMATIC_SYSTEM.network,
  leftDuctPressurePsi: fallbackSolution.nodes[PNEUMATIC_NODE.leftManifold]?.pressurePsi ?? 0,
  rightDuctPressurePsi: fallbackSolution.nodes[PNEUMATIC_NODE.rightManifold]?.pressurePsi ?? 0,
  isDualBleed: false,
  overheatSensors: INITIAL_OVERHEAT_SENSORS,
  toggleOverheatSensor: () => {},
  resetOverheatSensors: () => {},
  isLeftWingBodyOverheat: false,
  isRightWingBodyOverheat: false,
  bleedTripSensors: INITIAL_BLEED_TRIP_SENSORS,
  toggleBleedTripSensor: () => {},
  resetBleedTripSensors: () => {},
  isLeftBleedTripOff: false,
  isRightBleedTripOff: false,
  packTripSensors: INITIAL_PACK_TRIP_SENSORS,
  togglePackTripSensor: () => {},
  resetPackTripSensors: () => {},
  isLeftPackTripOff: false,
  isRightPackTripOff: false,
  manualValves: INITIAL_MANUAL_VALVES,
  toggleManualValve: () => {},
  setManualValve: () => {},
  cowlOverpressure: { eng1: false, eng2: false },
  toggleCowlOverpressure: () => {},
  setCowlOverpressure: () => {},
  wingThermalOvertemp: { left: false, right: false },
  toggleWingThermalOvertemp: () => {},
  setWingThermalOvertemp: () => {},
  probeHeatSwitches: { a: "AUTO", b: "AUTO" },
  setProbeHeatSwitch: () => {},
  probeFailures: {
    captPitot: false,
    lElevPitot: false,
    lAlphaVane: false,
    tempProbe: false,
    foPitot: false,
    rElevPitot: false,
    rAlphaVane: false,
    auxPitot: false,
  },
  toggleProbeFailure: () => {},
  setProbeFailure: () => {},
  isProbeHeated: () => false,
};

export function usePneumatic(): PneumaticContextValue {
  const context = useContext(PneumaticContext);
  return context ?? fallbackValue;
}
