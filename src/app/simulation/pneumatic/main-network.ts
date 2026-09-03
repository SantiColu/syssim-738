import { migrateLegacyNetwork, validatePneumaticNetwork } from "./migrate-legacy-network";
import type { LegacyPneumaticLine, LegacyPneumaticPoint, ValveKind } from "./types";

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
    [362, 232, "on-off"],
    [362, 243],
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
    [362, 243],
    [372, 243, "on-off"],
    [384, 243],
    [397, 243],
  ]),
  legacyLine("legacy-05", [
    [384, 243],
    [384, 256, "check-valve-reverse"],
    [384, 275] 
  ]),
  legacyLine("legacy-06", [
    [397, 243],
    [397, 231, "on-off"],
    [397, 209],
  ]),
  legacyLine("legacy-07", [
    [397, 243],
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

export const MAIN_PNEUMATIC_SYSTEM = migrateLegacyNetwork(
  legacyMainSchematic,
  [
    {
      point: { x: 307, y: 236 },
      sourceKind: "engine",
      label: "ENG 1 5th stage",
      initial: {
        enabled: true,
        pressurePsi: 36,
        temperatureC: 200,
      },
    },
    {
      point: { x: 307, y: 253 },
      sourceKind: "engine",
      label: "ENG 1 9th stage",
      initial: {
        enabled: true,
        pressurePsi: 36,
        temperatureC: 390,
      },
    },
    {
      point: { x: 326, y: 212 },
      sourceKind: "engine",
      label: "ENG 1 Fan Air",
      initial: {
        enabled: true,
        pressurePsi: 15,
        temperatureC: 25,
      },
    },
    {
      point: { x: 453, y: 236 },
      sourceKind: "engine",
      label: "ENG 2 5th stage",
      initial: {
        enabled: true,
        pressurePsi: 36,
        temperatureC: 200,
      },
    },
    {
      point: { x: 453, y: 254 },
      sourceKind: "engine",
      label: "ENG 2 9th stage",
      initial: {
        enabled: true,
        pressurePsi: 36,
        temperatureC: 390,
      },
    },
    {
      point: { x: 434, y: 212 },
      sourceKind: "engine",
      label: "ENG 2 Fan Air",
      initial: {
        enabled: true,
        pressurePsi: 15,
        temperatureC: 25,
      },
    },
    {
      point: { x: 381, y: 518 },
      sourceKind: "apu",
      label: "APU BLEED",
      initial: {
        enabled: false,
        pressurePsi: 32,
        temperatureC: 230,
      },
    },
    {
      point: { x: 384, y: 275 },
      sourceKind: "apu",
      label: "External Air Conection",
      initial: {
        enabled: false,
        pressurePsi: 32,
        temperatureC: 30,
      },
    },
  ],
);

validatePneumaticNetwork(MAIN_PNEUMATIC_SYSTEM);
