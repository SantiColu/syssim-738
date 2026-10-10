import { describe, expect, it } from "vitest";
import { MAIN_PNEUMATIC_SYSTEM, PNEUMATIC_NODE } from "./main-network";
import {
  migrateLegacyNetwork,
  validatePneumaticNetwork,
} from "./migrate-legacy-network";
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
import type { LegacyPneumaticLine, NetworkSpec } from "./types";

const N = PNEUMATIC_NODE;

function solve({
  switches,
  sources,
  manualValves,
  bleedTrip,
}: {
  switches?: Partial<PneumaticSwitchesState>;
  sources?: Partial<PneumaticSourcesState>;
  manualValves?: Record<string, boolean>;
  bleedTrip?: Record<string, boolean>;
} = {}) {
  const runtime = computeRuntimeState(
    { ...INITIAL_SWITCHES, ...switches },
    { ...INITIAL_SOURCES, ...sources },
    { ...INITIAL_MANUAL_VALVES, ...manualValves },
    { ...INITIAL_BLEED_TRIP_SENSORS, ...bleedTrip },
  );
  const solution = solvePneumaticNetwork(MAIN_PNEUMATIC_SYSTEM.network, runtime);
  return { runtime, solution, node: (id: string) => solution.nodes[id] };
}

const ENGINES_OFF = { eng1Running: false, eng2Running: false };

describe("bleed air sources", () => {
  it("feeds both packs from the engines in the initial configuration", () => {
    const { node } = solve();
    expect(node(N.lPack).energized).toBe(true);
    expect(node(N.rPack).energized).toBe(true);
    expect(node(N.leftManifold).pressurePsi).toBe(36);
  });

  it("leaves the network unpressurized with everything off", () => {
    const { solution } = solve({ sources: ENGINES_OFF });
    expect(Object.values(solution.nodes).some((n) => n.energized)).toBe(false);
  });

  it("feeds the manifold from the APU through the APU bleed valve", () => {
    const { node } = solve({
      sources: { ...ENGINES_OFF, apuRunning: true },
      switches: { apuBleed: true },
    });
    expect(node(N.leftManifold)).toMatchObject({
      energized: true,
      sourceId: N.apu,
      pressurePsi: 32,
    });
  });

  it("keeps the APU off the manifold while the APU bleed switch is off", () => {
    const { node } = solve({ sources: { ...ENGINES_OFF, apuRunning: true } });
    expect(node(N.leftManifold).energized).toBe(false);
  });

  it("closes the engine bleed valve on a bleed trip", () => {
    const { runtime } = solve({ bleedTrip: { "eng1-upstream": true } });
    expect(runtime.accessories[N.eng1BleedValve]?.open).toBe(false);
  });
});

describe("isolation valve", () => {
  const eng1Only = { sources: { eng2Running: false } };

  it("lets engine 1 feed the right side when open", () => {
    const { node } = solve({ ...eng1Only, switches: { isolationValve: "OPEN" } });
    expect(node(N.rightManifold).energized).toBe(true);
  });

  it("separates the manifold halves when closed", () => {
    const { node } = solve({ ...eng1Only, switches: { isolationValve: "CLOSE" } });
    expect(node(N.leftManifold).energized).toBe(true);
    expect(node(N.rightManifold).energized).toBe(false);
  });

  it("opens in AUTO when an engine bleed switch is off (FCOM 2.20.2)", () => {
    const { runtime } = solve({ switches: { eng1Bleed: false } });
    expect(runtime.accessories[N.isolationValve]?.open).toBe(true);
  });

  it("closes in AUTO with both bleeds and both packs on", () => {
    const { runtime } = solve();
    expect(runtime.accessories[N.isolationValve]?.open).toBe(false);
  });
});

describe("check valves", () => {
  it("stop manifold pressure from back-feeding the ground air connection", () => {
    const { node } = solve();
    expect(node(N.groundAirCheckValve).energized).toBe(false);
    expect(node(N.groundAir).energized).toBe(false);
  });

  it("stop manifold pressure from back-feeding the APU", () => {
    const { node } = solve({ switches: { isolationValve: "OPEN" } });
    expect(node(N.apuCheckValve).energized).toBe(false);
  });

  it("let ground air into the right side of the manifold", () => {
    const { node } = solve({
      sources: { ...ENGINES_OFF, gndAirConnected: true },
    });
    expect(node(N.groundAirCheckValve).energized).toBe(true);
    expect(node(N.rightManifold).sourceId).toBe(N.groundAir);
    // The isolation valve is closed in AUTO, so the left side stays dry.
    expect(node(N.leftManifold).energized).toBe(false);
  });

  it("stop 9th stage air from flowing back into the 5th stage port", () => {
    const runtime = computeRuntimeState(
      INITIAL_SWITCHES,
      INITIAL_SOURCES,
      INITIAL_MANUAL_VALVES,
      INITIAL_BLEED_TRIP_SENSORS,
    );
    runtime.sources[N.eng1FifthStage] = {
      ...runtime.sources[N.eng1FifthStage]!,
      enabled: false,
    };
    const solution = solvePneumaticNetwork(MAIN_PNEUMATIC_SYSTEM.network, runtime);
    expect(solution.nodes[N.eng1StageJunction].sourceId).toBe(N.eng1NinthStage);
    expect(solution.nodes[N.eng1FifthStageCheckValve].energized).toBe(false);
  });
});

describe("stage mixing and precooling", () => {
  it("blends 5th and 9th stage air where they merge", () => {
    const { node } = solve();
    expect(node(N.eng1StageJunction).temperatureC).toBe(295);
    expect(node(N.eng2StageJunction).temperatureC).toBe(295);
  });

  it("does not cool bleed air while the fan air valve is closed", () => {
    const { node } = solve();
    expect(node(N.eng1Precooler).temperatureC).toBe(295);
  });

  it("cools bleed air in the precooler when fan air flows", () => {
    const { node } = solve({ manualValves: { [N.eng1FanAirValve]: true } });
    // 50/50 blend of 295 °C bleed and 25 °C fan air.
    expect(node(N.eng1Precooler).temperatureC).toBe(160);
  });

  it("does not let fan air through the precooler into the manifold", () => {
    const { node } = solve({
      sources: { eng2Running: false },
      switches: { eng1Bleed: false, isolationValve: "CLOSE" },
      manualValves: { [N.eng1FanAirValve]: true },
    });
    expect(node(N.leftManifold).energized).toBe(false);
  });
});

describe("network construction", () => {
  const lines: LegacyPneumaticLine[] = [
    {
      id: "line",
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0, accessory: "check-valve" },
        { x: 20, y: 0 },
      ],
    },
  ];

  const baseSpec: NetworkSpec<"source" | "valve" | "outlet"> = {
    names: { source: { x: 0, y: 0 }, valve: { x: 10, y: 0 }, outlet: { x: 20, y: 0 } },
    sources: {
      source: {
        sourceKind: "engine",
        label: "SRC",
        initial: { enabled: true, pressurePsi: 30, temperatureC: 200 },
      },
    },
    consumers: {},
    checkValves: [{ valve: "valve", inletFrom: "source" }],
    heatExchangers: [],
    mixingZones: [],
  };

  it("builds a valid network and resolves every name to a node", () => {
    const built = migrateLegacyNetwork(lines, baseSpec);
    expect(() => validatePneumaticNetwork(built)).not.toThrow();
    expect(built.ids).toEqual({
      source: "source-engine-0-0",
      valve: "valve-10-0",
      outlet: "sink-20-0",
    });
  });

  it("flows only in the declared direction of a check valve", () => {
    const forward = migrateLegacyNetwork(lines, baseSpec);
    const solved = solvePneumaticNetwork(forward.network, forward.initialState);
    expect(solved.nodes["sink-20-0"].energized).toBe(true);

    const reversed = migrateLegacyNetwork(lines, {
      ...baseSpec,
      checkValves: [{ valve: "valve", inletFrom: "outlet" }],
    });
    const blocked = solvePneumaticNetwork(reversed.network, reversed.initialState);
    expect(blocked.nodes["sink-20-0"].energized).toBe(false);
  });

  it("fails when a name does not land on a node of the drawing", () => {
    expect(() =>
      migrateLegacyNetwork(lines, {
        ...baseSpec,
        names: { ...baseSpec.names, outlet: { x: 25, y: 0 } },
      }),
    ).toThrow(/"outlet" at 25,0 is not a node/);
  });

  it("fails validation when a check valve has no declared inlet", () => {
    const built = migrateLegacyNetwork(lines, { ...baseSpec, checkValves: [] });
    expect(() => validatePneumaticNetwork(built)).toThrow(/has no declared inlet/);
  });

  it("rejects a check valve declaration on a node that is not a check valve", () => {
    expect(() =>
      migrateLegacyNetwork(lines, {
        ...baseSpec,
        checkValves: [{ valve: "outlet", inletFrom: "valve" }],
      }),
    ).toThrow(/unexpected kind/);
  });
});
