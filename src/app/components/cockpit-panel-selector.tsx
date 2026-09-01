"use client";

import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import { CabinAltitudeControlPanel, CabinAltitudePanel, EquipmentCoolingPanel, TemperaturePanel } from "./aircraft-panels";
import { PneumaticPanel } from "./pneumatic-panel";

type Panel = {
  id: string;
  name: string;
  code: string;
  component: ComponentType;
};

const panels: Panel[] = [
  {
    id: "cabin-altitude",
    name: "Cabin altitude",
    code: "PRESSURIZATION INDICATION",
    component: CabinAltitudePanel,
  },
  {
    id: "cabin-control",
    name: "Cabin altitude control",
    code: "PRESSURIZATION CONTROL",
    component: CabinAltitudeControlPanel,
  },
  {
    id: "equipment-cooling",
    name: "Equipment cooling",
    code: "EQUIPMENT COOLING",
    component: EquipmentCoolingPanel,
  },
  {
    id: "pneumatic",
    name: "Pneumatic",
    code: "P5 FORWARD OVERHEAD",
    component: PneumaticPanel,
  },
  {
    id: "temperature",
    name: "Air temperature",
    code: "AIR CONDITIONING",
    component: TemperaturePanel,
  },
];

export function CockpitPanelSelector() {
  const [active, setActive] = useState(3);
  const selected = panels[active];
  const SelectedPanel = selected.component;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") setActive((value) => (value - 1 + panels.length) % panels.length);
      if (event.key === "ArrowRight") setActive((value) => (value + 1) % panels.length);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <section className="panel-selector" aria-label="Selector de paneles del cockpit">
      <div className="panel-selector-heading" aria-live="polite">
        <span>{selected.code}</span>
        <strong>{selected.name}</strong>
        <small>{String(active + 1).padStart(2, "0")} / {String(panels.length).padStart(2, "0")}</small>
      </div>

      <div className="panel-stage">
        <article className="panel-card panel-focus is-active" aria-label={`${selected.name}, panel activo`}>
          <div className={`panel-visual panel-${selected.id}`}>
            <SelectedPanel />
          </div>
          <div className="panel-card-label">
            <span>{String(active + 1).padStart(2, "0")}</span>
            {selected.name}
          </div>
        </article>

        {panels.map((panel, index) => {
          const PreviewPanel = panel.component;
          return (
            <article
              className={`panel-card panel-preview preview-${index} ${index === active ? "is-selected-preview" : ""}`}
              key={panel.id}
              aria-label={`${panel.name}, vista previa${index === active ? ", seleccionada" : ""}`}
            >
              <button
                className="panel-card-select"
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Seleccionar panel ${panel.name}`}
                aria-current={index === active ? "true" : undefined}
              />
              <div className={`panel-visual panel-${panel.id}`}>
                <PreviewPanel />
              </div>
              <div className="panel-card-label">
                <span>{String(index + 1).padStart(2, "0")}</span>
                {panel.name}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
