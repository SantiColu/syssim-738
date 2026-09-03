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
}

const INITIAL_SWITCHES: PneumaticSwitchesState = {
  lPack: "AUTO",
  isolationValve: "AUTO",
  rPack: "AUTO",
  eng1Bleed: true,
  apuBleed: false,
  eng2Bleed: true,
};

const INITIAL_SOURCES: PneumaticSourcesState = {
  eng1Running: true,
  eng2Running: true,
  apuRunning: false,
  gndAirConnected: false,
};

function computeRuntimeState(
  switches: PneumaticSwitchesState,
  sourcesState: PneumaticSourcesState,
): PneumaticRuntimeState {
  // Isolation valve is controlled directly by its switch: OPEN is open, CLOSE/AUTO is closed
  const isIsoOpen = switches.isolationValve === "OPEN";

  // Configure pneumatic sources based on simulation engine/APU/GND air status
  const sources: PneumaticRuntimeState["sources"] = {
    ...MAIN_PNEUMATIC_SYSTEM.initialState.sources,
  };

  // Engine 1 5th stage, 9th stage and Fan Air sources
  for (const eng1Id of [
    "source-engine-306-253",
    "source-engine-303-269",
    "source-engine-330-212",
  ]) {
    const s = sources[eng1Id];
    if (s) {
      sources[eng1Id] = { ...s, enabled: sourcesState.eng1Running };
    }
  }

  // Engine 2 5th stage, 9th stage and Fan Air sources
  for (const eng2Id of [
    "source-engine-457-254",
    "source-engine-457-271",
    "source-engine-429-212",
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
  const gndAirSourceId = "source-apu-384-260";
  if (sources[gndAirSourceId]) {
    sources[gndAirSourceId] = {
      ...sources[gndAirSourceId],
      enabled: sourcesState.gndAirConnected,
    };
  }

  // The 6 valves mapped to the 6 switches:
  // 1. L PACK Valve -> valve-362-217
  // 2. ISOLATION Valve -> valve-372-228
  // 3. R PACK Valve -> valve-397-216
  // 4. ENG 1 BLEED Valve (PRSOV) -> valve-326-253
  // 5. APU BLEED Valve -> valve-371-496
  // 6. ENG 2 BLEED Valve (PRSOV) -> valve-435-254
  const accessories: PneumaticRuntimeState["accessories"] = {
    ...MAIN_PNEUMATIC_SYSTEM.initialState.accessories,
    "valve-362-217": { open: switches.lPack !== "OFF" },
    "valve-372-228": { open: isIsoOpen },
    "valve-397-216": { open: switches.rPack !== "OFF" },
    "valve-326-253": { open: switches.eng1Bleed },
    "valve-371-496": { open: switches.apuBleed },
    "valve-435-254": { open: switches.eng2Bleed },
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

  const runtimeState = useMemo(
    () => computeRuntimeState(switches, sourcesState),
    [switches, sourcesState],
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
  // Left manifold at junction-362-228 or valve-362-217
  const leftDuctPressurePsi =
    solution.nodes["junction-362-228"]?.pressurePsi ??
    solution.nodes["valve-372-228"]?.pressurePsi ??
    0;

  // Right manifold at junction-397-228 or valve-397-216
  const rightDuctPressurePsi =
    solution.nodes["junction-397-228"]?.pressurePsi ??
    solution.nodes["valve-397-216"]?.pressurePsi ??
    0;

  // DUAL BLEED annunciator logic:
  // APU bleed valve is open AND APU is running AND (eng 1 bleed on OR (eng 2 bleed on AND isolation valve open))
  const isIsoOpen = runtimeState.accessories["valve-372-228"]?.open ?? false;
  const isDualBleed =
    switches.apuBleed &&
    sourcesState.apuRunning &&
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
    }),
    [
      switches,
      sourcesState,
      runtimeState,
      solution,
      leftDuctPressurePsi,
      rightDuctPressurePsi,
      isDualBleed,
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
  leftDuctPressurePsi: fallbackSolution.nodes["junction-362-228"]?.pressurePsi ?? 0,
  rightDuctPressurePsi: fallbackSolution.nodes["junction-397-228"]?.pressurePsi ?? 0,
  isDualBleed: false,
};

export function usePneumatic(): PneumaticContextValue {
  const context = useContext(PneumaticContext);
  return context ?? fallbackValue;
}
