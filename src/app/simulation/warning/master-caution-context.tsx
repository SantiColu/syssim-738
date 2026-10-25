"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { DUCT_OVERHEAT_SENSORS } from "../ecs/zone-temp";
import { useFire } from "../fire/fire-context";
import { overheatDetectionCautions, type FireIndications } from "../fire/fire-protection";
import { useFuel } from "../fuel/fuel-context";
import { fuelCautions, type FuelCaution } from "../fuel/fuel-system";
import {
  PROBE_SYSTEM_MAP,
  usePneumatic,
  type PneumaticContextValue,
  type ProbeId,
  type WindowHeatSwitches,
} from "../pneumatic/pneumatic-context";
import {
  getMasterCautionLights,
  updateAcknowledged,
  type CautionSource,
  type SystemAnnunciator,
} from "./master-caution";

const WINDOWS: (keyof WindowHeatSwitches)[] = ["sideL", "fwdL", "fwdR", "sideR"];
const PROBES = Object.keys(PROBE_SYSTEM_MAP) as ProbeId[];

/**
 * Amber lights currently illuminated, grouped by system annunciator as in
 * FCOM 15.20.3-4. Only lights the simulator models are listed: AUTO FAIL, OFF
 * SCHED DESCENT and EQUIP COOLING OFF never illuminate yet.
 */
function getActiveCautions(
  pneumatic: PneumaticContextValue,
  fire: FireIndications,
  fuel: FuelCaution[],
): CautionSource[] {
  const lights: [string, SystemAnnunciator, boolean][] = [
    // AIR COND
    ["dual-bleed", "AIR COND", pneumatic.isDualBleed],
    [
      "wing-body-overheat-l",
      "AIR COND",
      pneumatic.isWingBodyOvhtTest || pneumatic.isLeftWingBodyOverheat,
    ],
    [
      "wing-body-overheat-r",
      "AIR COND",
      pneumatic.isWingBodyOvhtTest || pneumatic.isRightWingBodyOverheat,
    ],
    ["bleed-trip-off-l", "AIR COND", pneumatic.isLeftBleedTripOff],
    ["bleed-trip-off-r", "AIR COND", pneumatic.isRightBleedTripOff],
    ["pack-l", "AIR COND", pneumatic.isLeftPackTripOff],
    ["pack-r", "AIR COND", pneumatic.isRightPackTripOff],
    ...DUCT_OVERHEAT_SENSORS.map(
      ({ zone }): [string, SystemAnnunciator, boolean] => [
        `zone-temp-${zone}`,
        "AIR COND",
        pneumatic.ductOverheat[zone],
      ],
    ),
    // ANTI-ICE
    ...WINDOWS.map((window): [string, SystemAnnunciator, boolean] => [
      `window-overheat-${window}`,
      "ANTI-ICE",
      pneumatic.windowOverheat[window] || pneumatic.windowHeatTest === "OVHT",
    ]),
    ...PROBES.map((probe): [string, SystemAnnunciator, boolean] => [
      `probe-heat-${probe}`,
      "ANTI-ICE",
      !pneumatic.isProbeHeated(probe),
    ]),
    ["cowl-anti-ice-1", "ANTI-ICE", pneumatic.cowlOverpressure.eng1],
    ["cowl-anti-ice-2", "ANTI-ICE", pneumatic.cowlOverpressure.eng2],
    // OVHT/DET: ENG 1/2 OVERHEAT and APU DET INOP (FCOM 8.10.4). FAULT does not
    // light MASTER CAUTION.
    ...overheatDetectionCautions(fire).map(
      (id): [string, SystemAnnunciator, boolean] => [id, "OVHT/DET", true],
    ),
  ];

  return [
    ...lights.filter(([, , lit]) => lit).map(([id, annunciator]) => ({ id, annunciator })),
    // FUEL: LOW PRESSURE and FILTER BYPASS (FCOM 12.10.2-3, 15.20.3)
    ...fuel.map((caution): CautionSource => ({ ...caution, annunciator: "FUEL" })),
  ];
}

type MasterCautionContextValue = {
  isMasterCautionLit: boolean;
  isAnnunciatorLit: (annunciator: SystemAnnunciator) => boolean;
  /** Fire warning (or test) not yet reset with FIRE WARN / BELL CUTOUT (FCOM 8.10.7). */
  isFireWarnLit: boolean;
  /** Extinguishes both FIRE WARN lights, silences the bell and the APU horn. */
  pushFireWarn: () => void;
  pushMasterCaution: () => void;
  /** Press-to-test: all twelve system annunciators light while held. */
  pressAnnunciatorPanel: () => void;
  /** Recall on release: active cautions light again with MASTER CAUTION. */
  releaseAnnunciatorPanel: () => void;
};

const MasterCautionContext = createContext<MasterCautionContextValue | null>(null);

export function MasterCautionProvider({ children }: { children: React.ReactNode }) {
  const pneumatic = usePneumatic();
  const { indications: fire, dispatch: dispatchFire } = useFire();
  const { state: fuelState } = useFuel();
  const fuel = useMemo(() => fuelCautions(fuelState), [fuelState]);
  const active = useMemo(() => getActiveCautions(pneumatic, fire, fuel), [pneumatic, fire, fuel]);
  const activeKey = active.map(({ id }) => id).join("|");

  // Cautions reset with MASTER CAUTION, forgotten when their light goes out;
  // recall-only lights start out reset
  const [acknowledged, setAcknowledged] = useState<string[]>(() => updateAcknowledged([], [], active));
  const [trackedKey, setTrackedKey] = useState(activeKey);
  if (trackedKey !== activeKey) {
    setTrackedKey(activeKey);
    setAcknowledged(updateAcknowledged(acknowledged, trackedKey.split("|"), active));
  }

  const [isAnnunciatorPanelPressed, setAnnunciatorPanelPressed] = useState(false);

  const value = useMemo((): MasterCautionContextValue => {
    const lights = getMasterCautionLights(active, acknowledged);
    return {
      isMasterCautionLit: lights.masterCaution,
      isAnnunciatorLit: (annunciator) =>
        isAnnunciatorPanelPressed || lights.annunciators.has(annunciator),
      isFireWarnLit: fire.fireWarnLit,
      pushFireWarn: () => dispatchFire({ type: "pushFireWarn" }),
      pushMasterCaution: () => setAcknowledged(active.map(({ id }) => id)),
      pressAnnunciatorPanel: () => setAnnunciatorPanelPressed(true),
      releaseAnnunciatorPanel: () => {
        setAnnunciatorPanelPressed(false);
        setAcknowledged([]);
      },
    };
  }, [active, acknowledged, isAnnunciatorPanelPressed, fire.fireWarnLit, dispatchFire]);

  return (
    <MasterCautionContext.Provider value={value}>
      {children}
    </MasterCautionContext.Provider>
  );
}

const fallbackValue: MasterCautionContextValue = {
  isMasterCautionLit: false,
  isAnnunciatorLit: () => false,
  isFireWarnLit: false,
  pushFireWarn: () => {},
  pushMasterCaution: () => {},
  pressAnnunciatorPanel: () => {},
  releaseAnnunciatorPanel: () => {},
};

export function useMasterCaution(): MasterCautionContextValue {
  return useContext(MasterCautionContext) ?? fallbackValue;
}
