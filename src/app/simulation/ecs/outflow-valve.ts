export type PressurizationMode = "AUTO" | "ALTN" | "MAN";
/** Outflow VALVE switch, spring-loaded to the centre (OFF). */
export type OutflowSwitch = "CLOSE" | "OFF" | "OPEN";

/**
 * Seconds for the outflow valve's full range of motion. The FCOM gives up to
 * 20 s in MAN; shortened here so manual control stays responsive.
 */
export const OUTFLOW_VALVE_FULL_TRAVEL_S = 5;

export interface OutflowValveInputs {
  mode: PressurizationMode;
  switchPosition: OutflowSwitch;
}

/**
 * Where the outflow valve is driving to (0 closed, 1 fully open), or null
 * when its motor is stopped (FCOM 2.40):
 * - MAN: only while the switch is held, towards that end;
 * - AUTO / ALTN: no flight phases yet, so always the ground schedule, which
 *   drives the valve fully open.
 */
export function outflowValveTarget({ mode, switchPosition }: OutflowValveInputs): number | null {
  if (mode !== "MAN") return 1;
  if (switchPosition === "OPEN") return 1;
  if (switchPosition === "CLOSE") return 0;
  return null;
}

/** Outflow valve position after `dtSeconds` of its motor running. */
export function stepOutflowValve(position: number, inputs: OutflowValveInputs, dtSeconds: number): number {
  const target = outflowValveTarget(inputs);
  if (target === null) return position;
  const travel = dtSeconds / OUTFLOW_VALVE_FULL_TRAVEL_S;
  return target > position ? Math.min(target, position + travel) : Math.max(target, position - travel);
}
