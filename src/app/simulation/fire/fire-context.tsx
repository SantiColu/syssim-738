"use client";

import { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import {
  DISCHARGE_DELAY_MS,
  fireProtectionReducer,
  LAVATORY_HEAT_DISCHARGE_DELAY_MS,
  getFireIndications,
  INITIAL_FIRE_PROTECTION,
  type BottleId,
  type FireIndications,
  type FireProtectionAction,
  type FireProtectionState,
  type LavatoryId,
} from "./fire-protection";

export interface FireContextValue {
  state: FireProtectionState;
  indications: FireIndications;
  dispatch: (action: FireProtectionAction) => void;
}

function useDischargeTimer(
  bottle: BottleId,
  state: FireProtectionState,
  dispatch: (action: FireProtectionAction) => void,
) {
  const discharging = state.bottles[bottle].status === "discharging";
  useEffect(() => {
    if (!discharging) return;
    const timer = setTimeout(
      () => dispatch({ type: "completeDischarge", bottle }),
      DISCHARGE_DELAY_MS[bottle],
    );
    return () => clearTimeout(timer);
  }, [bottle, discharging, dispatch]);
}

function useLavatoryHeatTimer(
  lavatory: LavatoryId,
  state: FireProtectionState,
  dispatch: (action: FireProtectionAction) => void,
) {
  const { fire, extinguisherDischarged } = state.lavatories[lavatory];
  const heating = fire && !extinguisherDischarged;
  useEffect(() => {
    if (!heating) return;
    const timer = setTimeout(
      () => dispatch({ type: "lavatoryHeatDischarge", lavatory }),
      LAVATORY_HEAT_DISCHARGE_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [lavatory, heating, dispatch]);
}

const FireContext = createContext<FireContextValue | null>(null);

/**
 * Fire protection state, shared by the cockpit panels, the plan view and the
 * systems the fire switches shut off. Sits above PneumaticProvider, which
 * reads the shutoffs from it.
 */
export function FireProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(fireProtectionReducer, INITIAL_FIRE_PROTECTION);

  // A fired squib empties its bottle a few seconds later
  useDischargeTimer("left", state, dispatch);
  useDischargeTimer("right", state, dispatch);
  useDischargeTimer("apu", state, dispatch);
  useDischargeTimer("cargo", state, dispatch);
  // A lavatory fire heats its extinguisher nozzles open
  useLavatoryHeatTimer("A", state, dispatch);
  useLavatoryHeatTimer("D", state, dispatch);
  useLavatoryHeatTimer("E", state, dispatch);

  const value = useMemo(
    () => ({ state, indications: getFireIndications(state), dispatch }),
    [state],
  );

  return <FireContext.Provider value={value}>{children}</FireContext.Provider>;
}

const fallbackValue: FireContextValue = {
  state: INITIAL_FIRE_PROTECTION,
  indications: getFireIndications(INITIAL_FIRE_PROTECTION),
  dispatch: () => {},
};

export function useFire(): FireContextValue {
  return useContext(FireContext) ?? fallbackValue;
}
