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
    [362, 191],
    [362, 217, "on-off"],
    [362, 228],
    [362, 253],
    [363, 435],
    [366, 475, "check-valve-reverse"],
    [371, 496, "solenoid"],
    [376, 518],
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
    [362, 228],
    [372, 228, "on-off"],
    [384, 228],
    [397, 228],
  ]),
  legacyLine("legacy-05", [
    [384, 228],
    [384, 241, "check-valve-reverse"],
    [384, 260] 
  ]),
  legacyLine("legacy-06", [
    [397, 228],
    [397, 216, "on-off"],
    [397, 191],
  ]),
  legacyLine("legacy-07", [
    [397, 228],
    [397, 254],
    [397, 310],
  ]),
  legacyLine("legacy-08", [
    [362, 253],
    [342, 253],
    [336, 253],
    [331, 253, "modulating"],
    [326, 253],
    [326, 253, "modulating"],
    [320, 253],
    [313, 253, "check-valve-reverse"],
    [306, 253],
  ]),
  legacyLine("legacy-09", [
    [342, 253],
    [342, 260,"on-off"], 
    [342, 265],
  ]),
  legacyLine("legacy-10", [
    [336, 216],
    [321, 216, "on-off"],
  ]),
  legacyLine("legacy-11", [
    [336, 216],
    [336, 253],
  ]),
  legacyLine("legacy-12", [
    [320, 269],
    [311, 269, "modulating"],
    [303, 269],
  ]),
  legacyLine("legacy-13", [
    [303, 262],
    [303, 213],
  ]),
  legacyLine("legacy-14", [
    [331, 253, "modulating"],
    [330, 212],
  ]),
  legacyLine("legacy-15", [
    [320, 262],
    [320, 269],
  ]),
  legacyLine("legacy-16", [
    [320, 262],
    [303, 262],
  ]),
  legacyLine("legacy-17", [
    [320, 253],
    [320, 262],
  ]),
  legacyLine("legacy-18", [
    [342, 265],
    [302, 281],
  ]),
  legacyLine("legacy-19", [
    [302, 281],
    [295, 268],
  ]),
  legacyLine("legacy-20", [
    [295, 268],
    [246, 294],
  ]),
  legacyLine("legacy-21", [
    [397, 254],
    [418, 254],
    [425, 254],
    [430, 254, "modulating"],
    [435, 254, "modulating"],
    [441, 254],
    [449, 254, "check-valve-reverse"],
    [457, 254],
  ]),
  legacyLine("legacy-22", [
    [418, 254],
    [418, 260, "on-off"],
    [418, 265],
  ]),
  legacyLine("legacy-23", [
    [425, 254],
    [425, 215],
  ]),
  legacyLine("legacy-24", [
    [425, 215],
    [439, 215, "on-off"],
  ]),
  legacyLine("legacy-25", [
    [430, 254, "modulating"],
    [429, 212],
  ]),
  legacyLine("legacy-26", [
    [441, 254],
    [441, 262],
    [441, 271],
  ]),
  legacyLine("legacy-27", [
    [441, 262],
    [457, 262],
  ]),
  legacyLine("legacy-28", [
    [457, 262],
    [457, 213],
  ]),
  legacyLine("legacy-29", [
    [441, 271],
    [449, 271, "modulating"],
    [457, 271],
  ]),
  legacyLine("legacy-30", [
    [418, 265],
    [458, 283],
  ]),
  legacyLine("legacy-31", [
    [458, 283],
    [467, 268],
  ]),
  legacyLine("legacy-32", [
    [467, 268],
    [513, 293],
  ]),
];

export const MAIN_PNEUMATIC_SYSTEM = migrateLegacyNetwork(
  legacyMainSchematic,
  [
    {
      point: { x: 306, y: 253 },
      sourceKind: "engine",
      label: "ENG 1 5th stage",
      initial: {
        enabled: true,
        pressurePsi: 36,
        temperatureC: 215,
      },
    },
    {
      point: { x: 303, y: 269 },
      sourceKind: "engine",
      label: "ENG 1 9th stage",
      initial: {
        enabled: true,
        pressurePsi: 36,
        temperatureC: 215,
      },
    },
    {
      point: { x: 457, y: 271 },
      sourceKind: "engine",
      label: "ENG 2 5th stage",
      initial: {
        enabled: true,
        pressurePsi: 36,
        temperatureC: 215,
      },
    },
    {
      point: { x: 457, y: 254 },
      sourceKind: "engine",
      label: "ENG 2 9th stage",
      initial: {
        enabled: true,
        pressurePsi: 36,
        temperatureC: 215,
      },
    },
    {
      point: { x: 381, y: 518 },
      sourceKind: "apu",
      label: "APU BLEED",
      initial: {
        enabled: false,
        pressurePsi: 32,
        temperatureC: 190,
      },
    },
    {
      point: { x: 384, y: 260 },
      sourceKind: "apu",
      label: "External Air Conection",
      initial: {
        enabled: false,
        pressurePsi: 32,
        temperatureC: 190,
      },
    },
  ],
);

validatePneumaticNetwork(MAIN_PNEUMATIC_SYSTEM);
