import { migrateLegacyNetwork, validatePneumaticNetwork } from "./migrate-legacy-network";
import type { LegacyPneumaticLine, LegacyPneumaticPoint } from "./types";

type LegacyTuple = [x: number, y: number, accessory?: true];

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
    [362, 217, true],
    [362, 228],
    [362, 253],
    [363, 435],
    [366, 475, true],
    [371, 496, true],
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
    [372, 228, true],
    [384, 228],
    [397, 228],
  ]),
  legacyLine("legacy-05", [
    [384, 228],
    [384, 241, true],
  ]),
  legacyLine("legacy-06", [
    [397, 228],
    [397, 216, true],
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
    [331, 253, true],
    [326, 253],
    [326, 253, true],
    [320, 253],
    [313, 253, true],
    [306, 253],
  ]),
  legacyLine("legacy-09", [
    [342, 253],
    [342, 265],
  ]),
  legacyLine("legacy-10", [
    [336, 216],
    [321, 216, true],
  ]),
  legacyLine("legacy-11", [
    [336, 216],
    [336, 253],
  ]),
  legacyLine("legacy-12", [
    [320, 269],
    [311, 269, true],
    [303, 269],
  ]),
  legacyLine("legacy-13", [
    [303, 262],
    [303, 213],
  ]),
  legacyLine("legacy-14", [
    [331, 253, true],
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
    [430, 254, true],
    [435, 254, true],
    [441, 254],
    [449, 254, true],
    [486, 254],
  ]),
  legacyLine("legacy-22", [
    [418, 254],
    [418, 265],
  ]),
  legacyLine("legacy-23", [
    [425, 254],
    [425, 215],
  ]),
  legacyLine("legacy-24", [
    [425, 215],
    [439, 215, true],
  ]),
  legacyLine("legacy-25", [
    [430, 254, true],
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
    [449, 271, true],
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
      point: { x: 246, y: 294 },
      sourceKind: "engine",
      label: "ENG 1 BLEED",
      initial: {
        enabled: true,
        pressurePsi: 36,
        temperatureC: 215,
      },
    },
    {
      point: { x: 513, y: 293 },
      sourceKind: "engine",
      label: "ENG 2 BLEED",
      initial: {
        enabled: true,
        pressurePsi: 36,
        temperatureC: 215,
      },
    },
    {
      point: { x: 376, y: 518 },
      sourceKind: "apu",
      label: "APU BLEED",
      initial: {
        enabled: false,
        pressurePsi: 32,
        temperatureC: 190,
      },
    },
  ],
);

validatePneumaticNetwork(MAIN_PNEUMATIC_SYSTEM);
