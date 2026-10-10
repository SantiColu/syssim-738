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
    [362, 209],
    [362, 240, "on-off"],
    [362, 247],
    [362, 253],
    [363, 300],
    [363, 320],
    [363, 400],
    [363, 435],
    [366, 475, "check-valve-reverse"],
    [371, 496, "solenoid"],
    [376, 518],
  ]),
  legacyLine("legacy-hyd-a", [
    [363, 300],
    [380, 300],
  ]),
  legacyLine("legacy-ngs", [
    [363, 320],
    [380, 320],
  ]),
  legacyLine("legacy-water-tank", [
    [363, 400],
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
    [362, 247],
    [372, 247, "on-off"],
    [384, 247],
    [397, 247],
  ]),
  legacyLine("legacy-05", [
    [384, 247],
    [384, 256, "check-valve-reverse"],
    [384, 275]
  ]),
  legacyLine("legacy-06", [
    [397, 247],
    [397, 240, "on-off"],
    [397, 209],
  ]),
  legacyLine("legacy-07", [
    [397, 247],
    [397, 254],
    [397, 285],
    [380, 285],
  ]),
  legacyLine("legacy-08", [
    [362, 253],
    [351, 253],
    [344, 253],
    [337, 253, "precooler"],
    [329, 253, "modulating"],
    [320, 253],
  ]),
  legacyLine("legacy-09", [
    [351, 253],
    [351, 260, "on-off"],
    [351, 268],
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
  legacyLine("legacy-18", [
    [351, 268],
    [295, 268],
  ]),
  legacyLine("legacy-20", [
    [295, 268],
    [268, 282],
  ]),
  legacyLine("legacy-21", [
    [397, 254],
    [409, 254],
    [416, 254],
    [424, 254, "precooler-reverse"],
    [431, 254, "modulating"],
    [440, 254],
  ]),
  legacyLine("legacy-22", [
    [409, 254],
    [409, 260, "on-off"],
    [409, 268],
  ]),
  legacyLine("legacy-23", [
    [438, 220, "starter-turbine"],
    [438, 230, "on-off"],
    [438, 249],
    [416, 249],
    [416, 254],
  ]),
  legacyLine("legacy-25", [
    [434, 212],
    [434, 236, "on-off"],
    [434, 246],
    [424, 246],
    [424, 254, "precooler-reverse"],
  ]),
  legacyLine("legacy-26", [
    [440, 236],
    [440, 245],
    [440, 254],
  ]),
  legacyLine("legacy-27", [
    [440, 245],
    [447, 245, "on-off"],
    [457, 245],
  ]),
  legacyLine("legacy-28", [
    [457, 245],
    [457, 213],
  ]),
  legacyLine("legacy-29", [
    [440, 254],
    [447, 254, "modulating"],
    [453, 254],
  ]),
  legacyLine("legacy-35", [
    [453, 236],
    [447, 236, "check-valve-reverse"],
    [440, 236],
  ]),
  legacyLine("legacy-30", [
    [409, 268],
    [467, 268],
  ]),
  legacyLine("legacy-32", [
    [467, 268],
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
  eng2NinthStage: { x: 453, y: 254 },
  eng2FanAir: { x: 434, y: 212 },
  apu: { x: 381, y: 518 },
  groundAir: { x: 384, y: 275 },

  // Switch-driven valves
  lPackValve: { x: 362, y: 240 },
  rPackValve: { x: 397, y: 240 },
  isolationValve: { x: 372, y: 247 },
  eng1BleedValve: { x: 329, y: 253 },
  eng2BleedValve: { x: 431, y: 254 },
  apuBleedValve: { x: 371, y: 496 },
  lWingAntiIceValve: { x: 351, y: 260 },
  rWingAntiIceValve: { x: 409, y: 260 },
  eng1CowlAntiIceValve: { x: 314, y: 245 },
  eng2CowlAntiIceValve: { x: 447, y: 245 },

  // Manually operated valves
  eng1StarterValve: { x: 322, y: 230 },
  eng2StarterValve: { x: 438, y: 230 },
  eng1FanAirValve: { x: 326, y: 236 },
  eng2FanAirValve: { x: 434, y: 236 },
  eng1HighStageValve: { x: 314, y: 253 },
  eng2HighStageValve: { x: 447, y: 254 },

  // Check valves and precoolers
  groundAirCheckValve: { x: 384, y: 256 },
  apuCheckValve: { x: 366, y: 475 },
  eng1FifthStageCheckValve: { x: 314, y: 236 },
  eng2FifthStageCheckValve: { x: 447, y: 236 },
  eng1Precooler: { x: 337, y: 253 },
  eng2Precooler: { x: 424, y: 254 },

  // Junctions
  leftManifold: { x: 362, y: 247 },
  rightManifold: { x: 397, y: 247 },
  eng1StageJunction: { x: 320, y: 253 },
  eng1CowlJunction: { x: 320, y: 245 },
  eng2StageJunction: { x: 440, y: 254 },
  eng2CowlJunction: { x: 440, y: 245 },

  // Consumers
  lPack: { x: 362, y: 209 },
  rPack: { x: 397, y: 209 },
  hydReservoirB: { x: 380, y: 285 },
  hydReservoirA: { x: 380, y: 300 },
  nitrogenGeneration: { x: 380, y: 320 },
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
