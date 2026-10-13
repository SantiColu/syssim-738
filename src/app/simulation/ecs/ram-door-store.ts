"use client";

import { useSyncExternalStore } from "react";

export type RamDoorSide = "L" | "R";

// Ram air inlet doors, shared by the plan view (which opens and closes them)
// and the RAM DOOR FULL OPEN lights. Open on the ground.
const doors: Record<RamDoorSide, boolean> = { L: true, R: true };
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useRamDoor(side: RamDoorSide) {
  const open = useSyncExternalStore(
    subscribe,
    () => doors[side],
    () => true,
  );
  const toggle = () => {
    doors[side] = !doors[side];
    listeners.forEach((listener) => listener());
  };
  return [open, toggle] as const;
}
