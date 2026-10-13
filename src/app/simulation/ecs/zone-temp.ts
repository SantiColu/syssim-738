import type { TrimZone } from "../pneumatic/runtime-state";

export interface DuctOverheatSensorDefinition {
  zone: TrimZone;
  name: string;
  /** Zone temperature selector whose ZONE TEMP light it drives. */
  light: "CONT CAB" | "FWD CAB" | "AFT CAB";
}

/**
 * Duct overheat sensors downstream of the packs and the mix manifold, one per
 * zone (FCOM 2.30: "An overheat condition causes the appropriate trim air
 * modulating valve to close and the ZONE TEMP light to illuminate").
 */
export const DUCT_OVERHEAT_SENSORS: DuctOverheatSensorDefinition[] = [
  { zone: "flightDeck", name: "Ducto de suministro del flight deck", light: "CONT CAB" },
  { zone: "fwdCab", name: "Ducto de techo del riser delantero (FWD CAB)", light: "FWD CAB" },
  { zone: "aftCab", name: "Ducto de techo de los risers traseros (AFT CAB)", light: "AFT CAB" },
];

export const INITIAL_DUCT_OVERHEAT: Record<TrimZone, boolean> = {
  flightDeck: false,
  fwdCab: false,
  aftCab: false,
};

/** A zone's trim air modulating valve opens only if selected open and its duct is not overheated. */
export function isTrimValveOpen(selectedOpen: boolean, ductOverheat: boolean): boolean {
  return selectedOpen && !ductOverheat;
}
