"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, useState } from "react";
import { useFire } from "../fire/fire-context";
import {
  CENTER_LOW_PRESSURE_CAUTION_MS,
  CENTER_PUMP_AUTO_SHUTOFF_MS,
  fireShutoffInputs,
  fuelSystemReducer,
  fuelingValveOpen,
  getFuelIndications,
  INITIAL_FUEL_SYSTEM,
  MOTOR_VALVE_TRAVEL_MS,
  pumpLowPressureLit,
  scavengeActive,
  TANKS,
  valveDisagrees,
  type CenterPumpId,
  type FuelIndications,
  type FuelSystemAction,
  type FuelSystemState,
  type MotorValveId,
} from "./fuel-system";

/** Simulated time per real second for the fuel flows (quantities change slowly at idle). */
export const FUEL_TIME_SCALES = [1, 10, 60] as const;
export type FuelTimeScale = (typeof FUEL_TIME_SCALES)[number];

const TICK_MS = 250;

export interface FuelContextValue {
  state: FuelSystemState;
  indications: FuelIndications;
  dispatch: (action: FuelSystemAction) => void;
  timeScale: FuelTimeScale;
  setTimeScale: (scale: FuelTimeScale) => void;
}

function useValveTravel(
  valve: MotorValveId,
  state: FuelSystemState,
  dispatch: (action: FuelSystemAction) => void,
) {
  const moving = valveDisagrees(state, valve) && !state.valveStuck[valve];
  const target = !state.valveOpen[valve];
  useEffect(() => {
    if (!moving) return;
    const timer = setTimeout(() => dispatch({ type: "completeValveTravel", valve }), MOTOR_VALVE_TRAVEL_MS);
    return () => clearTimeout(timer);
  }, [valve, moving, target, dispatch]);
}

function useCenterPumpTimers(
  pump: CenterPumpId,
  state: FuelSystemState,
  dispatch: (action: FuelSystemAction) => void,
) {
  const lit = pumpLowPressureLit(state, pump);
  useEffect(() => {
    if (!lit) return;
    const caution = setTimeout(
      () => dispatch({ type: "centerLowPressureTimeout", pump, kind: "caution" }),
      CENTER_LOW_PRESSURE_CAUTION_MS,
    );
    const autoOff = setTimeout(
      () => dispatch({ type: "centerLowPressureTimeout", pump, kind: "autoOff" }),
      CENTER_PUMP_AUTO_SHUTOFF_MS,
    );
    return () => {
      clearTimeout(caution);
      clearTimeout(autoOff);
    };
  }, [pump, lit, dispatch]);
}

const FuelContext = createContext<FuelContextValue | null>(null);

/**
 * Fuel system state, shared by the cockpit panels, the plan view and the
 * systems that burn fuel. Owns whether the engines and the APU are running,
 * since they stop when their fuel is cut. Sits between FireProvider, whose
 * fire switches close the fuel valves, and PneumaticProvider.
 */
export function FuelProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(fuelSystemReducer, INITIAL_FUEL_SYSTEM);
  const [timeScale, setTimeScale] = useState<FuelTimeScale>(1);

  // Fire switches and the APU fire shutdown, adjusted during render like the
  // other cross-system links
  const { indications: fire } = useFire();
  const fireInputs = fireShutoffInputs(fire);
  if (JSON.stringify(fireInputs) !== JSON.stringify(state.fire)) {
    dispatch({ type: "syncFire", fire: fireInputs });
  }

  useValveTravel("spar1", state, dispatch);
  useValveTravel("spar2", state, dispatch);
  useValveTravel("crossfeed", state, dispatch);
  useValveTravel("apu", state, dispatch);
  useCenterPumpTimers("ctrL", state, dispatch);
  useCenterPumpTimers("ctrR", state, dispatch);

  // Fuel flows while anything burns, transfers or refuels
  const flowing =
    state.running.eng1 ||
    state.running.eng2 ||
    state.running.apu ||
    scavengeActive(state) ||
    TANKS.some((tank) => fuelingValveOpen(state, tank));
  useEffect(() => {
    if (!flowing) return;
    const timer = setInterval(
      () => dispatch({ type: "tick", seconds: (TICK_MS / 1000) * timeScale }),
      TICK_MS,
    );
    return () => clearInterval(timer);
  }, [flowing, timeScale]);

  const value = useMemo(
    () => ({ state, indications: getFuelIndications(state), dispatch, timeScale, setTimeScale }),
    [state, timeScale],
  );

  return <FuelContext.Provider value={value}>{children}</FuelContext.Provider>;
}

const fallbackValue: FuelContextValue = {
  state: INITIAL_FUEL_SYSTEM,
  indications: getFuelIndications(INITIAL_FUEL_SYSTEM),
  dispatch: () => {},
  timeScale: 1,
  setTimeScale: () => {},
};

export function useFuel(): FuelContextValue {
  return useContext(FuelContext) ?? fallbackValue;
}
