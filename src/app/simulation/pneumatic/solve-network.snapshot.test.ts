import { describe, expect, it } from "vitest";
import { MAIN_PNEUMATIC_SYSTEM, PNEUMATIC_NODE } from "./main-network";
import {
  computeRuntimeState,
  INITIAL_BLEED_TRIP_SENSORS,
  INITIAL_MANUAL_VALVES,
  INITIAL_SOURCES,
  INITIAL_SWITCHES,
  type PneumaticSourcesState,
  type PneumaticSwitchesState,
} from "./runtime-state";
import { solvePneumaticNetwork } from "./solve-network";
import type { PneumaticSolution } from "./types";

// Regression guard for the whole main network: any change in the solved
// state of any node or link shows up as a snapshot diff. After an intentional
// change to the network or the solver, review the diff and run `pnpm test -u`.

type Scenario = {
  name: string;
  switches?: Partial<PneumaticSwitchesState>;
  sources?: Partial<PneumaticSourcesState>;
  manualValves?: Record<string, boolean>;
  bleedTrip?: Record<string, boolean>;
};

const SCENARIOS: Scenario[] = [
  { name: "initial state" },
  { name: "cold and dark", sources: { eng1Running: false, eng2Running: false } },
  {
    name: "APU only, APU bleed on, iso AUTO",
    sources: { eng1Running: false, eng2Running: false, apuRunning: true },
    switches: { apuBleed: true, eng1Bleed: false, eng2Bleed: false },
  },
  {
    name: "APU running, APU bleed off",
    sources: { eng1Running: false, eng2Running: false, apuRunning: true },
  },
  {
    name: "ground air only",
    sources: { eng1Running: false, eng2Running: false, gndAirConnected: true },
    switches: { eng1Bleed: false, eng2Bleed: false },
  },
  {
    name: "ground air and APU together",
    sources: {
      eng1Running: false,
      eng2Running: false,
      apuRunning: true,
      gndAirConnected: true,
    },
    switches: { apuBleed: true },
  },
  { name: "engine 1 only", sources: { eng2Running: false } },
  { name: "engine 2 only", sources: { eng1Running: false } },
  { name: "engine 1 bleed off", switches: { eng1Bleed: false } },
  {
    name: "engine 1 bleed off, iso CLOSE",
    switches: { eng1Bleed: false, isolationValve: "CLOSE" },
  },
  { name: "iso OPEN", switches: { isolationValve: "OPEN" } },
  { name: "both packs off", switches: { lPack: "OFF", rPack: "OFF" } },
  { name: "wing anti-ice on", switches: { wingAntiIce: true } },
  {
    name: "engine anti-ice on",
    switches: { eng1AntiIce: true, eng2AntiIce: true },
  },
  {
    name: "engine 1 bleed trip",
    bleedTrip: { ...INITIAL_BLEED_TRIP_SENSORS, "eng1-upstream": true },
  },
  {
    name: "high stage valves closed",
    manualValves: {
      ...INITIAL_MANUAL_VALVES,
      [PNEUMATIC_NODE.eng1HighStageValve]: false,
      [PNEUMATIC_NODE.eng2HighStageValve]: false,
    },
  },
  {
    name: "fan air valves open",
    manualValves: {
      ...INITIAL_MANUAL_VALVES,
      [PNEUMATIC_NODE.eng1FanAirValve]: true,
      [PNEUMATIC_NODE.eng2FanAirValve]: true,
    },
  },
  {
    name: "engine start from APU",
    sources: { eng1Running: false, eng2Running: false, apuRunning: true },
    switches: { apuBleed: true, isolationValve: "OPEN" },
    manualValves: {
      ...INITIAL_MANUAL_VALVES,
      [PNEUMATIC_NODE.eng1StarterValve]: true,
      [PNEUMATIC_NODE.eng2StarterValve]: true,
    },
  },
  {
    name: "APU bleed with engines running (dual bleed)",
    sources: { apuRunning: true },
    switches: { apuBleed: true },
  },
];

function compact(solution: PneumaticSolution) {
  const describeMedium = (m: { pressurePsi: number; temperatureC: number }) =>
    `${m.pressurePsi}psi ${m.temperatureC}C`;

  return {
    nodes: Object.fromEntries(
      Object.entries(solution.nodes)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([id, state]) => [
          id,
          state.energized
            ? `${describeMedium(state)} from ${state.sourceId}`
            : "-",
        ]),
    ),
    links: Object.fromEntries(
      Object.entries(solution.links)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([id, state]) => [
          id,
          state.medium
            ? `${state.state} ${describeMedium(state.medium)}`
            : state.state,
        ]),
    ),
  };
}

describe("main pneumatic network solution", () => {
  for (const scenario of SCENARIOS) {
    it(scenario.name, () => {
      const runtime = computeRuntimeState(
        { ...INITIAL_SWITCHES, ...scenario.switches },
        { ...INITIAL_SOURCES, ...scenario.sources },
        scenario.manualValves ?? INITIAL_MANUAL_VALVES,
        scenario.bleedTrip ?? INITIAL_BLEED_TRIP_SENSORS,
      );
      const solution = solvePneumaticNetwork(
        MAIN_PNEUMATIC_SYSTEM.network,
        runtime,
      );
      expect(compact(solution)).toMatchSnapshot();
    });
  }
});
