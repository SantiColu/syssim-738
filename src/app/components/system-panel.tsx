"use client";

import { useRef, useState } from "react";
import { AircraftSideSchematic } from "./aircraft-side-schematic";
import { useGroundCart } from "./pack-mockup-layer";
import { PanelExportButton } from "./panel-export-button";
import { PneumaticSchematic } from "./pneumatic-schematic";
import { useSystemTab } from "./system-tab-context";

import { useFire } from "../simulation/fire/fire-context";
import { usePneumatic } from "../simulation/pneumatic/pneumatic-context";

type SystemView = "main" | "side";

const FUEL_CUT_TITLE = " · combustible cortado por la fire switch (empujala para poder arrancar)";

export function SystemPanel() {
  const panelRef = useRef<HTMLElement>(null);
  const [activeView] = useState<SystemView>("main");
  const { sourcesState, toggleEng1, toggleEng2, toggleApu, toggleGndAir } =
    usePneumatic();
  const { isActive } = useSystemTab();
  // A pulled fire switch (or the APU's own fire shutdown) cuts the fuel: the
  // engine or APU cannot be started until it is cleared.
  const { indications: fire } = useFire();
  const apuFuelCutTitle = fire.apuShutoff
    ? FUEL_CUT_TITLE
    : fire.apuAutoShutdown
      ? " · apagada por fuego detectado (no arranca mientras siga el fuego)"
      : "";
  const [groundCartConnected, toggleGroundCart] = useGroundCart();

  return (
    <section
      ref={panelRef}
      className="relative size-full overflow-hidden bg-sim-bg bg-[linear-gradient(var(--color-sim-grid)_1px,transparent_1px),linear-gradient(90deg,var(--color-sim-grid)_1px,transparent_1px)] bg-size-[20px_20px]"
      aria-label="Vistas del sistema neumático del avión"
    >
      <PanelExportButton
        panelRef={panelRef}
        fileName={`system-${activeView}-panel.png`}
        label="panel SYSTEM"
        className="top-2 left-2.5"
      />
      {/* Center View Switcher Tabs: MAIN / SIDE */}
      {/* <div
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
      </div> */}

      {/* Top Right Simulation Source Controls: ENG 1, ENG 2, APU, GND AIR */}
      {activeView === "main" && (
        <div
          data-export-exclude
          className="absolute top-2 right-2.5 z-40 flex items-center border border-sim-border bg-sim-surface text-[7px] tracking-[0.14em] shadow-lg divide-x divide-sim-border max-[560px]:text-[6px]"
          role="toolbar"
          aria-label="Controles de motores, APU, aire de tierra y aire acondicionado de tierra"
        >
          {/* ENG 1 Button */}
          <button
            type="button"
            onClick={toggleEng1}
            title={
              sourcesState.eng1Running
                ? "Motor 1 encendido (Click para apagar)"
                : `Motor 1 apagado${fire.engineShutoff.eng1 ? FUEL_CUT_TITLE : " (Click para encender)"}`
            }
            className={`flex h-7 items-center gap-1.5 px-2.5 cursor-pointer select-none transition-all hover:bg-sim-bg active:scale-95 max-[560px]:px-1.5 max-[560px]:gap-1 ${
              sourcesState.eng1Running
                ? "text-sim-text-strong bg-sim-accent/15"
                : "text-sim-text-muted hover:text-sim-text"
            }`}
          >
            <span
              className={`size-1.5 rounded-full transition-all ${
                sourcesState.eng1Running
                  ? "bg-sim-green shadow-[0_0_6px_var(--color-sim-green)]"
                  : "bg-zinc-600"
              }`}
            />
            <span>ENG 1</span>
          </button>

          {/* ENG 2 Button */}
          <button
            type="button"
            onClick={toggleEng2}
            title={
              sourcesState.eng2Running
                ? "Motor 2 encendido (Click para apagar)"
                : `Motor 2 apagado${fire.engineShutoff.eng2 ? FUEL_CUT_TITLE : " (Click para encender)"}`
            }
            className={`flex h-7 items-center gap-1.5 px-2.5 cursor-pointer select-none transition-all hover:bg-sim-bg active:scale-95 max-[560px]:px-1.5 max-[560px]:gap-1 ${
              sourcesState.eng2Running
                ? "text-sim-text-strong bg-sim-accent/15"
                : "text-sim-text-muted hover:text-sim-text"
            }`}
          >
            <span
              className={`size-1.5 rounded-full transition-all ${
                sourcesState.eng2Running
                  ? "bg-sim-green shadow-[0_0_6px_var(--color-sim-green)]"
                  : "bg-zinc-600"
              }`}
            />
            <span>ENG 2</span>
          </button>

          {/* APU Button */}
          <button
            type="button"
            onClick={toggleApu}
            title={
              sourcesState.apuRunning
                ? "APU encendida (Click para apagar)"
                : `APU apagada${apuFuelCutTitle || " (Click para encender)"}`
            }
            className={`flex h-7 items-center gap-1.5 px-2.5 cursor-pointer select-none transition-all hover:bg-sim-bg active:scale-95 max-[560px]:px-1.5 max-[560px]:gap-1 ${
              sourcesState.apuRunning
                ? "text-sim-text-strong bg-sim-accent/15"
                : "text-sim-text-muted hover:text-sim-text"
            }`}
          >
            <span
              className={`size-1.5 rounded-full transition-all ${
                sourcesState.apuRunning
                  ? "bg-sim-green shadow-[0_0_6px_var(--color-sim-green)]"
                  : "bg-zinc-600"
              }`}
            />
            <span>APU</span>
          </button>

          {/* GND AIR Button */}
          <button
            type="button"
            onClick={toggleGndAir}
            title={
              sourcesState.gndAirConnected
                ? "Ground Air conectado (Click para desconectar)"
                : "Ground Air desconectado (Click para conectar)"
            }
            className={`flex h-7 items-center gap-1.5 px-2.5 cursor-pointer select-none transition-all hover:bg-sim-bg active:scale-95 max-[560px]:px-1.5 max-[560px]:gap-1 ${
              sourcesState.gndAirConnected
                ? "text-sim-cyan bg-sim-cyan/15"
                : "text-sim-text-muted hover:text-sim-text"
            }`}
          >
            <span
              className={`size-1.5 rounded-full transition-all ${
                sourcesState.gndAirConnected
                  ? "bg-sim-cyan shadow-[0_0_6px_var(--color-sim-cyan)]"
                  : "bg-zinc-600"
              }`}
            />
            <span>GND AIR</span>
          </button>

          {/* GND AIR COND Button: conditioned air cart at the mix manifold (ECS view) */}
          {isActive("ecs") && (
            <button
              type="button"
              onClick={toggleGroundCart}
              title={
                groundCartConnected
                  ? "Aire acondicionado de tierra conectado al mix manifold (Click para desconectar)"
                  : "Aire acondicionado de tierra desconectado (Click para conectar al mix manifold)"
              }
              className={`flex h-7 items-center gap-1.5 px-2.5 cursor-pointer select-none transition-all hover:bg-sim-bg active:scale-95 max-[560px]:px-1.5 max-[560px]:gap-1 ${
                groundCartConnected
                  ? "text-sim-cyan bg-sim-cyan/15"
                  : "text-sim-text-muted hover:text-sim-text"
              }`}
            >
              <span
                className={`size-1.5 rounded-full transition-all ${
                  groundCartConnected
                    ? "bg-sim-cyan shadow-[0_0_6px_var(--color-sim-cyan)]"
                    : "bg-zinc-600"
                }`}
              />
              <span>GND COND</span>
            </button>
          )}
        </div>
      )}

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
