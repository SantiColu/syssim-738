"use client";

import { useState } from "react";
import { AircraftSideSchematic } from "./aircraft-side-schematic";
import { PneumaticSchematic } from "./pneumatic-schematic";

type SystemView = "main" | "side";

const systemViews: { id: SystemView; label: string }[] = [
  { id: "main", label: "MAIN" },
  { id: "side", label: "SIDE" },
];

export function SystemPanel() {
  const [activeView, setActiveView] = useState<SystemView>("main");

  const selectView = (view: SystemView) => {
    setActiveView(view);
    document.getElementById(`system-tab-${view}`)?.focus();
  };

  const handleTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex = index;

    if (event.key === "ArrowRight") nextIndex = (index + 1) % systemViews.length;
    if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + systemViews.length) % systemViews.length;
    }
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = systemViews.length - 1;
    if (nextIndex === index) return;

    event.preventDefault();
    selectView(systemViews[nextIndex].id);
  };

  return (
    <section
      className="relative overflow-hidden border-l border-sim-border-subtle max-[900px]:h-137.5"
      aria-label="Vistas del sistema neumático del avión"
    >
      <div
        className="absolute top-2 left-1/2 z-40 flex -translate-x-1/2 border border-sim-border bg-sim-surface text-[7px] tracking-[0.14em] text-sim-text-muted shadow-lg"
        role="tablist"
        aria-label="Vista del avión"
      >
        {systemViews.map((view, index) => {
          const isActive = activeView === view.id;

          return (
            <button
              key={view.id}
              className={`h-7 min-w-15 cursor-pointer px-3 transition-colors first:border-r first:border-sim-border hover:bg-sim-bg hover:text-sim-text-strong ${
                isActive
                  ? "bg-sim-accent/15 text-sim-accent shadow-[inset_0_-2px_var(--color-sim-accent)]"
                  : "bg-transparent"
              }`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`system-view-${view.id}`}
              id={`system-tab-${view.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveView(view.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
            >
              {view.label}
            </button>
          );
        })}
      </div>

      <div
        className="size-full"
        id="system-view-main"
        role="tabpanel"
        aria-labelledby="system-tab-main"
        hidden={activeView !== "main"}
      >
        <PneumaticSchematic />
      </div>
      <div
        className="size-full"
        id="system-view-side"
        role="tabpanel"
        aria-labelledby="system-tab-side"
        hidden={activeView !== "side"}
      >
        <AircraftSideSchematic />
      </div>
    </section>
  );
}
