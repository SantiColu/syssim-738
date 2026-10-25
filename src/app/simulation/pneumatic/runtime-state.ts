import { MAIN_PNEUMATIC_SYSTEM, PNEUMATIC_NODE } from "./main-network";
import type { PneumaticRuntimeState } from "./types";
import { isPackTripped } from "../ecs/pack-trip";

export type PackPosition = "OFF" | "AUTO" | "HIGH";
export type IsoValvePosition = "CLOSE" | "AUTO" | "OPEN";

export interface WindowHeatSwitches {
  sideL: boolean;
  fwdL: boolean;
  fwdR: boolean;
  sideR: boolean;
}

export interface PneumaticSwitchesState {
  lPack: PackPosition;
  isolationValve: IsoValvePosition;
  rPack: PackPosition;
  eng1Bleed: boolean;
  apuBleed: boolean;
  eng2Bleed: boolean;
  lRecircFan: boolean;
  rRecircFan: boolean;
  /** TRIM AIR switch: drives the trim air pressure regulator and shutoff valve. */
  trimAir: boolean;
  wingAntiIce: boolean;
  eng1AntiIce: boolean;
  eng2AntiIce: boolean;
  windowHeat: WindowHeatSwitches;
}

export type TrimZone = "flightDeck" | "fwdCab" | "aftCab";

/** Trim air modulating valves, operated by hand for now (true = open). */
export const INITIAL_TRIM_VALVES: Record<TrimZone, boolean> = {
  flightDeck: true,
  fwdCab: true,
  aftCab: true,
};

export interface PneumaticSourcesState {
  eng1Running: boolean;
  eng2Running: boolean;
  apuRunning: boolean;
  gndAirConnected: boolean;
}
export const INTERACTIVE_MANUAL_VALVES: Record<string, string> = {
  [PNEUMATIC_NODE.eng1StarterValve]: "Válvula Starter Motor 1",
  [PNEUMATIC_NODE.eng2StarterValve]: "Válvula Starter Motor 2",
  [PNEUMATIC_NODE.eng1FanAirValve]: "Válvula Fan Air (FAV) Motor 1",
  [PNEUMATIC_NODE.eng2FanAirValve]: "Válvula Fan Air (FAV) Motor 2",
  [PNEUMATIC_NODE.eng1HighStageValve]: "Válvula de alta presión (9.ª etapa) Motor 1",
  [PNEUMATIC_NODE.eng2HighStageValve]: "Válvula de alta presión (9.ª etapa) Motor 2",
};

export const INITIAL_MANUAL_VALVES: Record<string, boolean> = {
  [PNEUMATIC_NODE.eng1StarterValve]: false,
  [PNEUMATIC_NODE.eng2StarterValve]: false,
  [PNEUMATIC_NODE.eng1FanAirValve]: false,
  [PNEUMATIC_NODE.eng2FanAirValve]: false,
  [PNEUMATIC_NODE.eng1HighStageValve]: true,
  [PNEUMATIC_NODE.eng2HighStageValve]: true,
};

export const INITIAL_SWITCHES: PneumaticSwitchesState = {
  lPack: "AUTO",
  isolationValve: "AUTO",
  rPack: "AUTO",
  eng1Bleed: true,
  apuBleed: false,
  eng2Bleed: true,
  lRecircFan: true,
  rRecircFan: true,
  trimAir: true,
  wingAntiIce: false,
  eng1AntiIce: false,
  eng2AntiIce: false,
  windowHeat: {
    sideL: false,
    fwdL: false,
    fwdR: false,
    sideR: false,
  },
};

export const INITIAL_SOURCES: PneumaticSourcesState = {
  eng1Running: true,
  eng2Running: true,
  apuRunning: false,
  gndAirConnected: false,
};

export const INITIAL_BLEED_TRIP_SENSORS: Record<string, boolean> = {
  "eng1-upstream": false,
  "eng1-downstream": false,
  "eng2-upstream": false,
  "eng2-downstream": false,
};

/** Bleed valves closed by a pulled fire switch (FCOM 8.10.2), whatever their BLEED switch says. */
export interface FireSwitchShutoff {
  eng1: boolean;
  eng2: boolean;
  apu: boolean;
}

export function computeRuntimeState(
  switches: PneumaticSwitchesState,
  sourcesState: PneumaticSourcesState,
  manualValves?: Record<string, boolean>,
  bleedTripSensors?: Record<string, boolean>,
  packTripSensors?: Record<string, boolean>,
  fireShutoff?: FireSwitchShutoff,
): PneumaticRuntimeState {
  // Isolation valve logic per Boeing FCOM 2.10.2 & 2.20.2:
  // - CLOSE: closes isolation valve
  // - OPEN: opens isolation valve
  // - AUTO:
  //   * closes isolation valve if both engine BLEED air switches are ON
  //     and both air conditioning PACK switches are AUTO or HIGH.
  //   * opens isolation valve automatically if either engine BLEED air or
  //     air conditioning PACK switch is positioned OFF.
  //   * isolation valve position is not affected by the APU bleed air switch.
  let isIsoOpen = false;
  if (switches.isolationValve === "OPEN") {
    isIsoOpen = true;
  } else if (switches.isolationValve === "CLOSE") {
    isIsoOpen = false;
  } else {
    // AUTO
    const bothEnginesBleedOn = switches.eng1Bleed && switches.eng2Bleed;
    const bothPacksActive = switches.lPack !== "OFF" && switches.rPack !== "OFF";
    const shouldAutoClose = bothEnginesBleedOn && bothPacksActive;
    isIsoOpen = !shouldAutoClose;
  }

  // Bleed trip conditions per Boeing FCOM 2.10.3 & 2.20.1:
  // Overpressure or overtemperature causes respective engine bleed valve to close automatically.
  const isLeftBleedTripped = Boolean(
    bleedTripSensors?.["eng1-upstream"] || bleedTripSensors?.["eng1-downstream"],
  );
  const isRightBleedTripped = Boolean(
    bleedTripSensors?.["eng2-upstream"] || bleedTripSensors?.["eng2-downstream"],
  );

  // Pack overheat (FCOM 2.30): the pack valve closes until TRIP RESET.
  const isLeftPackTripped = isPackTripped(packTripSensors, "L");
  const isRightPackTripped = isPackTripped(packTripSensors, "R");

  // Configure pneumatic sources based on simulation engine/APU/GND air status
  const sources: PneumaticRuntimeState["sources"] = {
    ...MAIN_PNEUMATIC_SYSTEM.initialState.sources,
  };

  // Engine 1 5th stage, 9th stage and Fan Air sources
  for (const eng1Id of [
    PNEUMATIC_NODE.eng1FifthStage,
    PNEUMATIC_NODE.eng1NinthStage,
    PNEUMATIC_NODE.eng1FanAir,
  ]) {
    const s = sources[eng1Id];
    if (s) {
      sources[eng1Id] = { ...s, enabled: sourcesState.eng1Running };
    }
  }

  // Engine 2 5th stage, 9th stage and Fan Air sources
  for (const eng2Id of [
    PNEUMATIC_NODE.eng2FifthStage,
    PNEUMATIC_NODE.eng2NinthStage,
    PNEUMATIC_NODE.eng2FanAir,
  ]) {
    const s = sources[eng2Id];
    if (s) {
      sources[eng2Id] = { ...s, enabled: sourcesState.eng2Running };
    }
  }

  // APU source: enabled when APU is running
  const apuSourceId = PNEUMATIC_NODE.apu;
  if (sources[apuSourceId]) {
    sources[apuSourceId] = {
      ...sources[apuSourceId],
      enabled: sourcesState.apuRunning,
    };
  }

  // Ground Air connection: enabled when Ground Air is connected
  const gndAirSourceId = PNEUMATIC_NODE.groundAir;
  if (sources[gndAirSourceId]) {
    sources[gndAirSourceId] = {
      ...sources[gndAirSourceId],
      enabled: sourcesState.gndAirConnected,
    };
  }

  // Valves driven by the overhead switches, plus the manually operated ones.
  // Engine and APU bleed valves are pressure-operated and close on a bleed
  // trip; pack valves close on a pack trip.
  const accessories: PneumaticRuntimeState["accessories"] = {
    ...MAIN_PNEUMATIC_SYSTEM.initialState.accessories,
    [PNEUMATIC_NODE.lPackValve]: { open: switches.lPack !== "OFF" && !isLeftPackTripped },
    [PNEUMATIC_NODE.isolationValve]: { open: isIsoOpen },
    [PNEUMATIC_NODE.rPackValve]: { open: switches.rPack !== "OFF" && !isRightPackTripped },
    [PNEUMATIC_NODE.eng1BleedValve]: {
      open: switches.eng1Bleed && !isLeftBleedTripped && !fireShutoff?.eng1,
    },
    [PNEUMATIC_NODE.apuBleedValve]: {
      open: switches.apuBleed && !fireShutoff?.apu,
    },
    [PNEUMATIC_NODE.eng2BleedValve]: {
      open: switches.eng2Bleed && !isRightBleedTripped && !fireShutoff?.eng2,
    },
    // Manual interactive valves (Starter, Wing TAI, Cowl TAI, Fan Air, HP stage):
    [PNEUMATIC_NODE.eng1StarterValve]: { open: Boolean(manualValves?.[PNEUMATIC_NODE.eng1StarterValve]) },
    [PNEUMATIC_NODE.eng2StarterValve]: { open: Boolean(manualValves?.[PNEUMATIC_NODE.eng2StarterValve]) },
    [PNEUMATIC_NODE.lWingAntiIceValve]: {
      open: Boolean(switches.wingAntiIce),
    },
    [PNEUMATIC_NODE.rWingAntiIceValve]: {
      open: Boolean(switches.wingAntiIce),
    },
    [PNEUMATIC_NODE.eng1CowlAntiIceValve]: {
      open: Boolean(switches.eng1AntiIce),
    },
    [PNEUMATIC_NODE.eng2CowlAntiIceValve]: {
      open: Boolean(switches.eng2AntiIce),
    },
    // The NGS shuts down on the ground (FCOM 12.20.1): the simulator is always on the ground
    [PNEUMATIC_NODE.ngsShutoffValve]: { open: false },
    [PNEUMATIC_NODE.eng1FanAirValve]: { open: Boolean(manualValves?.[PNEUMATIC_NODE.eng1FanAirValve]) },
    [PNEUMATIC_NODE.eng2FanAirValve]: { open: Boolean(manualValves?.[PNEUMATIC_NODE.eng2FanAirValve]) },
    [PNEUMATIC_NODE.eng1HighStageValve]: { open: Boolean(manualValves?.[PNEUMATIC_NODE.eng1HighStageValve]) },
    [PNEUMATIC_NODE.eng2HighStageValve]: { open: Boolean(manualValves?.[PNEUMATIC_NODE.eng2HighStageValve]) },
  };

  return { sources, accessories };
}
