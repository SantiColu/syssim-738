"use client";

import { useSyncExternalStore } from "react";
import {
  outflowValveTarget,
  stepOutflowValve,
  type OutflowSwitch,
  type PressurizationMode,
} from "./outflow-valve";

interface OutflowValveState {
  mode: PressurizationMode;
  switchPosition: OutflowSwitch;
  /** 0 closed, 1 fully open. On the ground, so it starts open. */
  position: number;
}

// Shared by the pressurization panel and the plan view, which both read and
// drive the same valve.
let state: OutflowValveState = { mode: "AUTO", switchPosition: "OFF", position: 1 };
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const setState = (next: Partial<OutflowValveState>) => {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
  runMotor();
};

// The valve motor runs on animation frames while it has somewhere to go.
let frame: number | null = null;
const motorRunning = () => {
  const target = outflowValveTarget(state);
  return target !== null && target !== state.position;
};
function runMotor() {
  if (frame !== null || typeof window === "undefined" || !motorRunning()) return;
  let lastTime = performance.now();
  const tick = (now: number) => {
    const position = stepOutflowValve(state.position, state, (now - lastTime) / 1000);
    lastTime = now;
    if (position !== state.position) {
      state = { ...state, position };
      listeners.forEach((listener) => listener());
    }
    frame = motorRunning() ? requestAnimationFrame(tick) : null;
  };
  frame = requestAnimationFrame(tick);
}

export function useOutflowValve() {
  const current = useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
  return {
    ...current,
    setMode: (mode: PressurizationMode) => setState({ mode }),
    setSwitch: (switchPosition: OutflowSwitch) => setState({ switchPosition }),
  };
}
