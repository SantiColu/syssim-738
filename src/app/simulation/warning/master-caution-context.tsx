"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { DUCT_OVERHEAT_SENSORS } from "../ecs/zone-temp";
import {
  PROBE_SYSTEM_MAP,
  usePneumatic,
  type PneumaticContextValue,
  type ProbeId,
  type WindowHeatSwitches,
} from "../pneumatic/pneumatic-context";
import {
  getMasterCautionLights,
  pruneAcknowledged,
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
function getActiveCautions(pneumatic: PneumaticContextValue): CautionSource[] {
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
  ];

  return lights
    .filter(([, , lit]) => lit)
    .map(([id, annunciator]) => ({ id, annunciator }));
}

type MasterCautionContextValue = {
  isMasterCautionLit: boolean;
  isAnnunciatorLit: (annunciator: SystemAnnunciator) => boolean;
  /** No fire detection is simulated yet, so FIRE WARN stays dark. */
  isFireWarnLit: boolean;
  pushMasterCaution: () => void;
  /** Press-to-test: all twelve system annunciators light while held. */
  pressAnnunciatorPanel: () => void;
  /** Recall on release: active cautions light again with MASTER CAUTION. */
  releaseAnnunciatorPanel: () => void;
};

const MasterCautionContext = createContext<MasterCautionContextValue | null>(null);

export function MasterCautionProvider({ children }: { children: React.ReactNode }) {
  const pneumatic = usePneumatic();
  const active = useMemo(() => getActiveCautions(pneumatic), [pneumatic]);
  const activeKey = active.map(({ id }) => id).join("|");

  // Cautions reset with MASTER CAUTION, forgotten when their light goes out
  const [acknowledged, setAcknowledged] = useState<string[]>([]);
  const [trackedKey, setTrackedKey] = useState(activeKey);
  if (trackedKey !== activeKey) {
    setTrackedKey(activeKey);
    setAcknowledged(pruneAcknowledged(acknowledged, active));
  }

  const [isAnnunciatorPanelPressed, setAnnunciatorPanelPressed] = useState(false);

  const value = useMemo((): MasterCautionContextValue => {
    const lights = getMasterCautionLights(active, acknowledged);
    return {
      isMasterCautionLit: lights.masterCaution,
      isAnnunciatorLit: (annunciator) =>
        isAnnunciatorPanelPressed || lights.annunciators.has(annunciator),
      isFireWarnLit: false,
      pushMasterCaution: () => setAcknowledged(active.map(({ id }) => id)),
      pressAnnunciatorPanel: () => setAnnunciatorPanelPressed(true),
      releaseAnnunciatorPanel: () => {
        setAnnunciatorPanelPressed(false);
        setAcknowledged([]);
      },
    };
  }, [active, acknowledged, isAnnunciatorPanelPressed]);

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
  pushMasterCaution: () => {},
  pressAnnunciatorPanel: () => {},
  releaseAnnunciatorPanel: () => {},
};

export function useMasterCaution(): MasterCautionContextValue {
  return useContext(MasterCautionContext) ?? fallbackValue;
}
