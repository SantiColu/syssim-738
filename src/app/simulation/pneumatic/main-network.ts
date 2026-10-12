import { migrateLegacyNetwork, validatePneumaticNetwork } from "./migrate-legacy-network";
import type {
  LegacyPneumaticLine,
  LegacyPneumaticPoint,
  NetworkSpec,
  ValveKind,
} from "./types";

type LegacyTuple = [x: number, y: number, accessory?: true | ValveKind];

function legacyLine(id: string, points: LegacyTuple[]): LegacyPneumaticLine {
  return {
    id,
    points: points.map(([x, y, accessory]): LegacyPneumaticPoint => ({
      x,
      y,
      accessory,
    })),
  };
}

const legacyMainSchematic: LegacyPneumaticLine[] = [
  legacyLine("legacy-01", [
    [362, 261],
    [362, 271, "on-off"],
    [362, 275],
    [362, 278.5],
    [362, 297.5],
    [362, 312.5],
    [362, 400],
    [362, 435],
    [368.7, 475, "check-valve-reverse"],
    [372.3, 496, "solenoid"],
    [376, 518],
  ]),
  legacyLine("legacy-hyd-a", [
    [362, 297.5],
    [380, 297.5],
  ]),
  legacyLine("legacy-ngs", [
    [362, 312.5],
    [380, 312.5],
  ]),
  legacyLine("legacy-water-tank", [
    [362, 400],
    [392, 400],
  ]),
  legacyLine("legacy-02", [
    [376, 518],
    [376, 518],
  ]),
  legacyLine("legacy-03", [
    [376, 518],
    [381, 518],
  ]),
  legacyLine("legacy-04", [
    [362, 275],
    [372, 275, "on-off"],
    [382, 275],
    [398, 275],
  ]),
  legacyLine("legacy-05", [
    [382, 275],
    [382, 278],
    [387, 278, "check-valve-reverse"],
    [392, 278]
  ]),
  legacyLine("legacy-06", [
    [398, 275],
    [398, 271, "on-off"],
    [398, 261],
  ]),
  legacyLine("legacy-07", [
    [398, 275],
    [398, 278.5],
    [398, 286.5],
    [380, 286.5],
  ]),
  legacyLine("legacy-08", [
    [362, 278.5],
    [351, 278.5],
    [351, 268],
    [351, 253],
    [344, 253],
    [337, 253, "precooler"],
    [329, 253, "modulating"],
    [320, 253],
  ]),
  legacyLine("legacy-09", [
    [351, 268],
    [345, 268, "on-off"],
    [295, 268],
  ]),
  legacyLine("legacy-10", [
    [322, 220, "starter-turbine"],
    [322, 230, "on-off"],
    [322, 249],
    [344, 249],
    [344, 253],
  ]),
  legacyLine("legacy-12", [
    [307, 253],
    [314, 253, "modulating"],
    [320, 253],
  ]),
  legacyLine("legacy-13", [
    [303, 245],
    [303, 213],
  ]),
  legacyLine("legacy-14", [
    [326, 212],
    [326, 236, "on-off"],
    [326, 246],
    [337, 246],
    [337, 253, "precooler"],
  ]),
  legacyLine("legacy-15", [
    [307, 236],
    [314, 236, "check-valve"],
    [320, 236],
  ]),
  legacyLine("legacy-16", [
    [320, 245],
    [314, 245, "on-off"],
    [303, 245],
  ]),
  legacyLine("legacy-17", [
    [320, 236],
    [320, 245],
    [320, 253],
  ]),
  legacyLine("legacy-20", [
    [295, 268],
    [268, 282],
  ]),
  legacyLine("legacy-21", [
    [398, 278.5],
    [409, 278.5],
    [409, 268],
    [409, 253],
    [416, 253],
    [423, 253, "precooler-reverse"],
    [431, 253, "modulating"],
    [440, 253],
  ]),
  legacyLine("legacy-22", [
    [409, 268],
    [415, 268, "on-off"],
    [465, 268],
  ]),
  legacyLine("legacy-23", [
    [438, 220, "starter-turbine"],
    [438, 230, "on-off"],
    [438, 249],
    [416, 249],
    [416, 253],
  ]),
  legacyLine("legacy-25", [
    [434, 212],
    [434, 236, "on-off"],
    [434, 246],
    [423, 246],
    [423, 253, "precooler-reverse"],
  ]),
  legacyLine("legacy-26", [
    [440, 236],
    [440, 245],
    [440, 253],
  ]),
  legacyLine("legacy-27", [
    [440, 245],
    [446, 245, "on-off"],
    [457, 245],
  ]),
  legacyLine("legacy-28", [
    [457, 245],
    [457, 213],
  ]),
  legacyLine("legacy-29", [
    [440, 253],
    [446, 253, "modulating"],
    [453, 253],
  ]),
  legacyLine("legacy-35", [
    [453, 236],
    [446, 236, "check-valve-reverse"],
    [440, 236],
  ]),
  legacyLine("legacy-32", [
    [465, 268],
    [492, 282],
  ]),
];

const ENGINE_BLEED = { pressurePsi: 36, enabled: true } as const;
const FAN_AIR = { pressurePsi: 15, temperatureC: 25, enabled: true } as const;

// Every node the simulation or the UI refers to, by drawing coordinate.
// If a point moves in `legacyMainSchematic`, update it here too: a name that
// no longer lands on a node fails loudly when the network is built.
const NODE_POINTS = {
  // Sources
  eng1FifthStage: { x: 307, y: 236 },
  eng1NinthStage: { x: 307, y: 253 },
  eng1FanAir: { x: 326, y: 212 },
  eng2FifthStage: { x: 453, y: 236 },
  eng2NinthStage: { x: 453, y: 253 },
  eng2FanAir: { x: 434, y: 212 },
  apu: { x: 381, y: 518 },
  groundAir: { x: 392, y: 278 },

  // Switch-driven valves
  lPackValve: { x: 362, y: 271 },
  rPackValve: { x: 398, y: 271 },
  isolationValve: { x: 372, y: 275 },
  eng1BleedValve: { x: 329, y: 253 },
  eng2BleedValve: { x: 431, y: 253 },
  apuBleedValve: { x: 372.3, y: 496 },
  lWingAntiIceValve: { x: 345, y: 268 },
  rWingAntiIceValve: { x: 415, y: 268 },
  eng1CowlAntiIceValve: { x: 314, y: 245 },
  eng2CowlAntiIceValve: { x: 446, y: 245 },

  // Manually operated valves
  eng1StarterValve: { x: 322, y: 230 },
  eng2StarterValve: { x: 438, y: 230 },
  eng1FanAirValve: { x: 326, y: 236 },
  eng2FanAirValve: { x: 434, y: 236 },
  eng1HighStageValve: { x: 314, y: 253 },
  eng2HighStageValve: { x: 446, y: 253 },

  // Check valves and precoolers
  groundAirCheckValve: { x: 387, y: 278 },
  apuCheckValve: { x: 368.7, y: 475 },
  eng1FifthStageCheckValve: { x: 314, y: 236 },
  eng2FifthStageCheckValve: { x: 446, y: 236 },
  eng1Precooler: { x: 337, y: 253 },
  eng2Precooler: { x: 423, y: 253 },

  // Junctions
  leftManifold: { x: 362, y: 275 },
  rightManifold: { x: 398, y: 275 },
  eng1StageJunction: { x: 320, y: 253 },
  eng1CowlJunction: { x: 320, y: 245 },
  eng2StageJunction: { x: 440, y: 253 },
  eng2CowlJunction: { x: 440, y: 245 },

  // Consumers
  lPack: { x: 362, y: 261 },
  rPack: { x: 398, y: 261 },
  hydReservoirB: { x: 380, y: 286.5 },
  hydReservoirA: { x: 380, y: 297.5 },
  nitrogenGeneration: { x: 380, y: 312.5 },
  waterTank: { x: 392, y: 400 },
  eng1Cowl: { x: 303, y: 213 },
  eng2Cowl: { x: 457, y: 213 },
  lWing: { x: 268, y: 282 },
  rWing: { x: 492, y: 282 },
};

export type PneumaticNodeName = keyof typeof NODE_POINTS;

const mainSpec: NetworkSpec<PneumaticNodeName> = {
  names: NODE_POINTS,

  sources: {
    eng1FifthStage: {
      sourceKind: "engine",
      label: "ENG 1 5th stage",
      initial: { ...ENGINE_BLEED, temperatureC: 200 },
    },
    eng1NinthStage: {
      sourceKind: "engine",
      label: "ENG 1 9th stage",
      initial: { ...ENGINE_BLEED, temperatureC: 390 },
    },
    eng1FanAir: {
      sourceKind: "engine",
      label: "ENG 1 Fan Air",
      initial: FAN_AIR,
    },
    eng2FifthStage: {
      sourceKind: "engine",
      label: "ENG 2 5th stage",
      initial: { ...ENGINE_BLEED, temperatureC: 200 },
    },
    eng2NinthStage: {
      sourceKind: "engine",
      label: "ENG 2 9th stage",
      initial: { ...ENGINE_BLEED, temperatureC: 390 },
    },
    eng2FanAir: {
      sourceKind: "engine",
      label: "ENG 2 Fan Air",
      initial: FAN_AIR,
    },
    apu: {
      sourceKind: "apu",
      label: "APU BLEED",
      initial: { enabled: false, pressurePsi: 32, temperatureC: 230 },
    },
    groundAir: {
      sourceKind: "apu",
      label: "External Air Conection",
      initial: { enabled: false, pressurePsi: 32, temperatureC: 30 },
    },
  },

  consumers: {
    lPack: {
      label: "Pack L",
      fullLabel: "Left Air Conditioning Pack (ACM)",
      category: "air-conditioning",
    },
    rPack: {
      label: "Pack R",
      fullLabel: "Right Air Conditioning Pack (ACM)",
      category: "air-conditioning",
    },
    hydReservoirB: {
      label: "Hyd Resv B",
      fullLabel: "Hydraulic System B Reservoir Pressurization",
      category: "hydraulics",
    },
    hydReservoirA: {
      label: "Hyd Resv A",
      fullLabel: "Hydraulic System A Reservoir Pressurization",
      category: "hydraulics",
    },
    nitrogenGeneration: {
      label: "NGS",
      fullLabel: "Nitrogen Generation System (Center Tank Inerting)",
      category: "fuel-inerting",
    },
    waterTank: {
      label: "Water Tank",
      fullLabel: "Potable Water Tank Pressurization",
      category: "potable-water",
    },
    eng1Cowl: {
      label: "Cowl TAI",
      fullLabel: "Engine 1 Cowl Thermal Anti-Ice",
      category: "anti-ice",
    },
    eng2Cowl: {
      label: "Cowl TAI",
      fullLabel: "Engine 2 Cowl Thermal Anti-Ice",
      category: "anti-ice",
    },
    lWing: {
      label: "Wing TAI",
      fullLabel: "Left Wing Thermal Anti-Ice (Slats)",
      category: "anti-ice",
    },
    rWing: {
      label: "Wing TAI",
      fullLabel: "Right Wing Thermal Anti-Ice (Slats)",
      category: "anti-ice",
    },
  },

  checkValves: [
    // Ground air and APU feed the manifold; the manifold cannot back-feed them.
    { valve: "groundAirCheckValve", inletFrom: "groundAir" },
    { valve: "apuCheckValve", inletFrom: "apuBleedValve" },
    // 9th stage air cannot flow back into the 5th stage port.
    { valve: "eng1FifthStageCheckValve", inletFrom: "eng1FifthStage" },
    { valve: "eng2FifthStageCheckValve", inletFrom: "eng2FifthStage" },
  ],

  heatExchangers: [
    {
      exchanger: "eng1Precooler",
      hotInletFrom: "eng1BleedValve",
      coldInletFrom: "eng1FanAirValve",
    },
    {
      exchanger: "eng2Precooler",
      hotInletFrom: "eng2BleedValve",
      coldInletFrom: "eng2FanAirValve",
    },
  ],

  mixingZones: [
    {
      sources: ["eng1FifthStage", "eng1NinthStage"],
      nodes: ["eng1StageJunction", "eng1CowlJunction"],
    },
    {
      sources: ["eng2FifthStage", "eng2NinthStage"],
      nodes: ["eng2StageJunction", "eng2CowlJunction"],
    },
  ],
};

export const MAIN_PNEUMATIC_SYSTEM = migrateLegacyNetwork<PneumaticNodeName>(
  legacyMainSchematic,
  mainSpec,
);

validatePneumaticNetwork(MAIN_PNEUMATIC_SYSTEM);

/** Node id for each named element of the main network. */
export const PNEUMATIC_NODE = MAIN_PNEUMATIC_SYSTEM.ids;

/** Consumer info keyed by node id. */
export const KNOWN_CONSUMERS = MAIN_PNEUMATIC_SYSTEM.consumers;
