"use client";

import { createContext, useContext, useState } from "react";

export type SystemTab = "pneumatic" | "ecs";

export const SYSTEM_TABS: { id: SystemTab; label: string }[] = [
  { id: "pneumatic", label: "PNEUMATIC" },
  { id: "ecs", label: "ECS" },
];

type SystemTabContextValue = {
  isActive: (tab: SystemTab) => boolean;
  /** Tabs work as layers; the last active one cannot be switched off. */
  toggleTab: (tab: SystemTab) => void;
};

const SystemTabContext = createContext<SystemTabContextValue | null>(null);

/** Which systems the plan view draws; the simulation always runs complete. */
export function SystemTabProvider({ children }: { children: React.ReactNode }) {
  const [activeTabs, setActiveTabs] = useState<ReadonlySet<SystemTab>>(
    () => new Set<SystemTab>(["pneumatic"]),
  );

  const toggleTab = (tab: SystemTab) =>
    setActiveTabs((current) => {
      const next = new Set(current);
      if (next.has(tab)) next.delete(tab);
      else next.add(tab);
      return next.size > 0 ? next : current;
    });

  return (
    <SystemTabContext.Provider value={{ isActive: (tab) => activeTabs.has(tab), toggleTab }}>
      {children}
    </SystemTabContext.Provider>
  );
}

const fallbackValue: SystemTabContextValue = {
  isActive: (tab) => tab === "pneumatic",
  toggleTab: () => {},
};

export function useSystemTab(): SystemTabContextValue {
  return useContext(SystemTabContext) ?? fallbackValue;
}
