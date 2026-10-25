// Master Caution system (FCOM 15.10.1 / 15.20.2). Each amber light on the
// forward overhead, aft overhead or fire panel feeds one system annunciator on
// the glareshield; when it illuminates, that annunciator and both MASTER
// CAUTION lights illuminate.

/** System annunciator panels, row by row (two columns), FCOM 15.10.1. */
export const SYSTEM_ANNUNCIATORS = {
  capt: ["FLT CONT", "ELEC", "IRS", "APU", "FUEL", "OVHT/DET"],
  fo: ["ANTI-ICE", "ENG", "HYD", "OVERHEAD", "DOORS", "AIR COND"],
} as const;

export type SystemAnnunciator =
  | (typeof SYSTEM_ANNUNCIATORS)["capt"][number]
  | (typeof SYSTEM_ANNUNCIATORS)["fo"][number];

/**
 * An illuminated amber light and the system annunciator it reports to. A
 * `recallOnly` light (one main tank fuel pump LOW PRESSURE, FCOM 12.10.3)
 * lights MASTER CAUTION only on recall.
 */
export type CautionSource = { id: string; annunciator: SystemAnnunciator; recallOnly?: boolean };

/**
 * Sources acknowledged with MASTER CAUTION stay dark only while their light
 * stays on: once a light goes out, illuminating it again is a new caution.
 */
export function pruneAcknowledged(
  acknowledged: readonly string[],
  active: readonly Pick<CautionSource, "id">[],
): string[] {
  return acknowledged.filter((id) => active.some((source) => source.id === id));
}

/**
 * Acknowledged cautions after the active set changes: the reset ones still
 * lit, plus any recall-only light that has just come on, which stays dark
 * until recall.
 */
export function updateAcknowledged(
  acknowledged: readonly string[],
  previousIds: readonly string[],
  active: readonly CautionSource[],
): string[] {
  const appeared = active
    .filter(({ id, recallOnly }) => recallOnly && !previousIds.includes(id) && !acknowledged.includes(id))
    .map(({ id }) => id);
  return [...pruneAcknowledged(acknowledged, active), ...appeared];
}

/**
 * MASTER CAUTION and system annunciator lights for the active cautions not yet
 * reset with MASTER CAUTION.
 */
export function getMasterCautionLights(
  active: readonly CautionSource[],
  acknowledged: readonly string[],
) {
  const annunciators = new Set<SystemAnnunciator>();
  for (const source of active) {
    if (!acknowledged.includes(source.id)) annunciators.add(source.annunciator);
  }
  return { masterCaution: annunciators.size > 0, annunciators };
}
