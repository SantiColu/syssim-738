import type { PackPosition } from "../pneumatic/runtime-state";

export interface RecircFanInputs {
  /** RECIRC FAN switches: true = AUTO, false = OFF. */
  lSwitchAuto: boolean;
  rSwitchAuto: boolean;
  lPack: PackPosition;
  rPack: PackPosition;
  /** Pack valve open and supplied with bleed air. */
  lPackOperating: boolean;
  rPackOperating: boolean;
  inFlight: boolean;
}

/**
 * Which recirculation fans run (FCOM 2.31, RECIRC FAN switches). In AUTO:
 * - in flight, both fans need both packs operating; the left one stops if
 *   either PACK switch is in HIGH, the right one only if both are;
 * - on the ground, the left fan runs unless both PACK switches are in HIGH,
 *   and the right one runs even then.
 */
export function recircFansRunning({
  lSwitchAuto,
  rSwitchAuto,
  lPack,
  rPack,
  lPackOperating,
  rPackOperating,
  inFlight,
}: RecircFanInputs): { left: boolean; right: boolean } {
  const eitherHigh = lPack === "HIGH" || rPack === "HIGH";
  const bothHigh = lPack === "HIGH" && rPack === "HIGH";

  if (inFlight) {
    const bothPacksOperating = lPackOperating && rPackOperating;
    return {
      left: lSwitchAuto && bothPacksOperating && !eitherHigh,
      right: rSwitchAuto && bothPacksOperating && !bothHigh,
    };
  }
  return {
    left: lSwitchAuto && !bothHigh,
    right: rSwitchAuto,
  };
}
