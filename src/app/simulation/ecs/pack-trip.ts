export type PackSide = "L" | "R";
export type PackTripStage = "compressorDischarge" | "turbineInlet" | "packDischarge";

export interface PackTripSensorDefinition {
  id: string;
  side: PackSide;
  stage: PackTripStage;
  name: string;
}

const STAGE_NAMES: Record<PackTripStage, string> = {
  compressorDischarge: "Descarga del compresor de la ACM",
  turbineInlet: "Entrada a la turbina de la ACM",
  packDischarge: "Descarga del pack",
};

export const PACK_TRIP_STAGES = Object.keys(STAGE_NAMES) as PackTripStage[];

export const packTripSensorId = (side: PackSide, stage: PackTripStage) => `${side}-${stage}`;

/**
 * Overheat sensors in each pack's cooling cycle (FCOM 2.30: "Overheat
 * protection is provided by temperature sensors located in the cooling
 * cycle"), one per stage of the cycle.
 */
export const PACK_TRIP_SENSORS: PackTripSensorDefinition[] = (["L", "R"] as const).flatMap((side) =>
  PACK_TRIP_STAGES.map((stage) => ({
    id: packTripSensorId(side, stage),
    side,
    stage,
    name: STAGE_NAMES[stage],
  })),
);

export const INITIAL_PACK_TRIP_SENSORS: Record<string, boolean> = Object.fromEntries(
  PACK_TRIP_SENSORS.map((sensor) => [sensor.id, false]),
);

/**
 * A pack trips off when any of its overheat sensors detects an overheat: its
 * pack valve closes and its PACK light comes on until TRIP RESET.
 */
export function isPackTripped(sensors: Record<string, boolean> | undefined, side: PackSide): boolean {
  return PACK_TRIP_STAGES.some((stage) => Boolean(sensors?.[packTripSensorId(side, stage)]));
}
