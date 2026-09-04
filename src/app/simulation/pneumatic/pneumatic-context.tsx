"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import { MAIN_PNEUMATIC_SYSTEM } from "./main-network";
import { solvePneumaticNetwork } from "./solve-network";
import type {
  PneumaticNetwork,
  PneumaticRuntimeState,
  PneumaticSolution,
} from "./types";

export type PackPosition = "OFF" | "AUTO" | "HIGH";
export type IsoValvePosition = "CLOSE" | "AUTO" | "OPEN";

export interface PneumaticSwitchesState {
  lPack: PackPosition;
  isolationValve: IsoValvePosition;
  rPack: PackPosition;
  eng1Bleed: boolean;
  apuBleed: boolean;
  eng2Bleed: boolean;
  lRecircFan: boolean;
  rRecircFan: boolean;
}

export interface PneumaticSourcesState {
  eng1Running: boolean;
  eng2Running: boolean;
  apuRunning: boolean;
  gndAirConnected: boolean;
}

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
  manualValves: Record<string, boolean>;
  toggleManualValve: (valveId: string) => void;
}

export const INTERACTIVE_MANUAL_VALVES: Record<string, string> = {
  "valve-322-230": "Válvula Starter Motor 1",
  "valve-438-230": "Válvula Starter Motor 2",
  "valve-351-260": "Válvula Wing Anti-Ice (Wing TAI) Izquierda",
  "valve-409-260": "Válvula Wing Anti-Ice (Wing TAI) Derecha",
  "valve-314-245": "Válvula Cowl Anti-Ice (Cowl TAI) Motor 1",
  "valve-447-245": "Válvula Cowl Anti-Ice (Cowl TAI) Motor 2",
  "valve-326-236": "Válvula Fan Air (FAV) Motor 1",
  "valve-434-236": "Válvula Fan Air (FAV) Motor 2",
  "valve-314-253": "Válvula de alta presión (9.ª etapa) Motor 1",
  "valve-447-254": "Válvula de alta presión (9.ª etapa) Motor 2",
};

const INITIAL_MANUAL_VALVES: Record<string, boolean> = {
  "valve-322-230": false,
  "valve-438-230": false,
  "valve-351-260": false,
  "valve-409-260": false,
  "valve-314-245": false,
  "valve-447-245": false,
  "valve-326-236": false,
  "valve-434-236": false,
  "valve-314-253": true,
  "valve-447-254": true,
};

const INITIAL_SWITCHES: PneumaticSwitchesState = {
  lPack: "AUTO",
  isolationValve: "AUTO",
  rPack: "AUTO",
  eng1Bleed: true,
  apuBleed: false,
  eng2Bleed: true,
  lRecircFan: true,
  rRecircFan: true,
};

const INITIAL_SOURCES: PneumaticSourcesState = {
  eng1Running: true,
  eng2Running: true,
  apuRunning: false,
  gndAirConnected: false,
};

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

const INITIAL_BLEED_TRIP_SENSORS: Record<string, boolean> = {
  "eng1-upstream": false,
  "eng1-downstream": false,
  "eng2-upstream": false,
  "eng2-downstream": false,
};

function computeRuntimeState(
  switches: PneumaticSwitchesState,
  sourcesState: PneumaticSourcesState,
  manualValves?: Record<string, boolean>,
  bleedTripSensors?: Record<string, boolean>,
): PneumaticRuntimeState {
  // Isolation valve logic per Boeing FCOM 2.10.2 & 2.20.2:
  // - CLOSE: closes isolation valve
  // - OPEN: opens isolation valve
  // - AUTO:
  //   * closes isolation valve if both engine BLEED air switches are ON
  //     and both air conditioning PACK switches are AUTO or HIGH.
  //   * opens isolation valve automatically if either engine BLEED air or
  //     air conditioning PACK switch is positioned OFF.
  //   * isolation valve position is not affected by the APU bleed air switch.
  let isIsoOpen = false;
  if (switches.isolationValve === "OPEN") {
    isIsoOpen = true;
  } else if (switches.isolationValve === "CLOSE") {
    isIsoOpen = false;
  } else {
    // AUTO
    const bothEnginesBleedOn = switches.eng1Bleed && switches.eng2Bleed;
    const bothPacksActive = switches.lPack !== "OFF" && switches.rPack !== "OFF";
    const shouldAutoClose = bothEnginesBleedOn && bothPacksActive;
    isIsoOpen = !shouldAutoClose;
  }

  // Bleed trip conditions per Boeing FCOM 2.10.3 & 2.20.1:
  // Overpressure or overtemperature causes respective engine bleed valve to close automatically.
  const isLeftBleedTripped = Boolean(
    bleedTripSensors?.["eng1-upstream"] || bleedTripSensors?.["eng1-downstream"],
  );
  const isRightBleedTripped = Boolean(
    bleedTripSensors?.["eng2-upstream"] || bleedTripSensors?.["eng2-downstream"],
  );

  // Configure pneumatic sources based on simulation engine/APU/GND air status
  const sources: PneumaticRuntimeState["sources"] = {
    ...MAIN_PNEUMATIC_SYSTEM.initialState.sources,
  };

  // Engine 1 5th stage, 9th stage and Fan Air sources
  for (const eng1Id of [
    "source-engine-307-236",
    "source-engine-307-253",
    "source-engine-326-212",
  ]) {
    const s = sources[eng1Id];
    if (s) {
      sources[eng1Id] = { ...s, enabled: sourcesState.eng1Running };
    }
  }

  // Engine 2 5th stage, 9th stage and Fan Air sources
  for (const eng2Id of [
    "source-engine-453-236",
    "source-engine-453-254",
    "source-engine-434-212",
  ]) {
    const s = sources[eng2Id];
    if (s) {
      sources[eng2Id] = { ...s, enabled: sourcesState.eng2Running };
    }
  }

  // APU source: enabled when APU is running
  const apuSourceId = "source-apu-381-518";
  if (sources[apuSourceId]) {
    sources[apuSourceId] = {
      ...sources[apuSourceId],
      enabled: sourcesState.apuRunning,
    };
  }

  // Ground Air connection: enabled when Ground Air is connected
  const gndAirSourceId = "source-apu-384-275";
  if (sources[gndAirSourceId]) {
    sources[gndAirSourceId] = {
      ...sources[gndAirSourceId],
      enabled: sourcesState.gndAirConnected,
    };
  }

  // The 6 valves mapped to the 6 switches + interactive manual valves:
  // 1. L PACK Valve -> valve-362-232
  // 2. ISOLATION Valve -> valve-372-243 (governed by CLOSE/AUTO/OPEN logic)
  // 3. R PACK Valve -> valve-397-231
  // 4. ENG 1 BLEED Valve (PRSOV) -> valve-329-253 (pressure-operated & tripped by bleed trip)
  // 5. APU BLEED Valve -> valve-371-496 (pressure-operated, closes when APU is shut down)
  // 6. ENG 2 BLEED Valve (PRSOV) -> valve-431-254 (pressure-operated & tripped by bleed trip)
  const accessories: PneumaticRuntimeState["accessories"] = {
    ...MAIN_PNEUMATIC_SYSTEM.initialState.accessories,
    "valve-362-232": { open: switches.lPack !== "OFF" },
    "valve-372-243": { open: isIsoOpen },
    "valve-397-231": { open: switches.rPack !== "OFF" },
    "valve-329-253": {
      open: switches.eng1Bleed && !isLeftBleedTripped,
    },
    "valve-371-496": {
      open: switches.apuBleed,
    },
    "valve-431-254": {
      open: switches.eng2Bleed && !isRightBleedTripped,
    },
    // Manual interactive valves (Starter, Wing TAI, Cowl TAI, Fan Air, HP stage):
    "valve-322-230": { open: Boolean(manualValves?.["valve-322-230"]) },
    "valve-438-230": { open: Boolean(manualValves?.["valve-438-230"]) },
    "valve-351-260": { open: Boolean(manualValves?.["valve-351-260"]) },
    "valve-409-260": { open: Boolean(manualValves?.["valve-409-260"]) },
    "valve-314-245": { open: Boolean(manualValves?.["valve-314-245"]) },
    "valve-447-245": { open: Boolean(manualValves?.["valve-447-245"]) },
    "valve-326-236": { open: Boolean(manualValves?.["valve-326-236"]) },
    "valve-434-236": { open: Boolean(manualValves?.["valve-434-236"]) },
    "valve-314-253": { open: Boolean(manualValves?.["valve-314-253"]) },
    "valve-447-254": { open: Boolean(manualValves?.["valve-447-254"]) },
  };

  return { sources, accessories };
}

const PneumaticContext = createContext<PneumaticContextValue | null>(null);

export function PneumaticProvider({ children }: { children: React.ReactNode }) {
  const [switches, setSwitches] = useState<PneumaticSwitchesState>(INITIAL_SWITCHES);
  const [sourcesState, setSourcesState] = useState<PneumaticSourcesState>(INITIAL_SOURCES);

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

  const [manualValves, setManualValves] =
    useState<Record<string, boolean>>(INITIAL_MANUAL_VALVES);

  const toggleManualValve = (valveId: string) => {
    setManualValves((prev) => ({
      ...prev,
      [valveId]: !prev[valveId],
    }));
  };

  const [overheatSensors, setOverheatSensors] =
    useState<Record<number, boolean>>(INITIAL_OVERHEAT_SENSORS);

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

  const [bleedTripSensors, setBleedTripSensors] =
    useState<Record<string, boolean>>(INITIAL_BLEED_TRIP_SENSORS);

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

  const runtimeState = useMemo(
    () =>
      computeRuntimeState(
        switches,
        sourcesState,
        manualValves,
        bleedTripSensors,
      ),
    [switches, sourcesState, manualValves, bleedTripSensors],
  );

  const solution = useMemo(
    () =>
      solvePneumaticNetwork(
        MAIN_PNEUMATIC_SYSTEM.network,
        runtimeState,
        MAIN_PNEUMATIC_SYSTEM.layout,
      ),
    [runtimeState],
  );

  // Pressure readings for DUCT PRESS gauge
  // Left manifold at junction-362-243 or valve-362-232
  const leftDuctPressurePsi =
    solution.nodes["junction-362-243"]?.pressurePsi ??
    solution.nodes["valve-372-243"]?.pressurePsi ??
    0;

  // Right manifold at junction-397-243 or valve-397-231
  const rightDuctPressurePsi =
    solution.nodes["junction-397-243"]?.pressurePsi ??
    solution.nodes["valve-397-231"]?.pressurePsi ??
    0;

  // DUAL BLEED annunciator logic per Boeing FCOM 2.10.2:
  // Illuminated (amber) – APU bleed air valve open and engine No. 1 BLEED air switch ON,
  // or engine No. 2 BLEED air switch ON, APU bleed air valve and isolation valve open.
  const isIsoOpen = runtimeState.accessories["valve-372-243"]?.open ?? false;
  const isApuValveOpen = runtimeState.accessories["valve-371-496"]?.open ?? false;
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
      manualValves,
      toggleManualValve,
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
      manualValves,
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
  MAIN_PNEUMATIC_SYSTEM.layout,
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
  leftDuctPressurePsi: fallbackSolution.nodes["junction-362-243"]?.pressurePsi ?? 0,
  rightDuctPressurePsi: fallbackSolution.nodes["junction-397-243"]?.pressurePsi ?? 0,
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
  manualValves: INITIAL_MANUAL_VALVES,
  toggleManualValve: () => {},
};

export function usePneumatic(): PneumaticContextValue {
  const context = useContext(PneumaticContext);
  return context ?? fallbackValue;
}
