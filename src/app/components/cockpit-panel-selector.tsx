"use client";

import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import {
  CabinAltitudeControlPanel,
  CabinAltitudePanel,
  EquipmentCoolingPanel,
  TemperaturePanel,
} from "./aircraft-panels";
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

const panelCardClassName =
  "absolute top-1/2 left-1/2 z-[2] h-[460px] w-[400px] origin-center";

const panelVisualClassName =
  "absolute inset-0 flex items-center justify-center [&>img]:block [&>img]:h-auto [&>img]:max-h-full [&>img]:w-auto [&>img]:max-w-full [&>img]:object-contain [&>img]:drop-shadow-[0_12px_15px_#000]";

const previewPositionClassNames = [
  "translate-x-[calc(-50%_-_245px)] translate-y-[calc(-50%_-_150px)] scale-[0.18] max-[900px]:translate-x-[calc(-50%_-_300px)] max-[900px]:translate-y-[calc(-50%_-_145px)] max-[900px]:scale-[0.23] max-[560px]:translate-x-[calc(-50%_-_215px)] max-[560px]:translate-y-[calc(-50%_-_150px)] max-[560px]:scale-[0.15]",
  "translate-x-[calc(-50%_-_245px)] translate-y-[calc(-50%_+_5px)] scale-[0.18] max-[900px]:translate-x-[calc(-50%_-_300px)] max-[900px]:-translate-y-1/2 max-[900px]:scale-[0.23] max-[560px]:translate-x-[calc(-50%_-_215px)] max-[560px]:-translate-y-1/2 max-[560px]:scale-[0.15]",
  "translate-x-[calc(-50%_-_245px)] translate-y-[calc(-50%_+_160px)] scale-[0.18] max-[900px]:translate-x-[calc(-50%_-_300px)] max-[900px]:translate-y-[calc(-50%_+_145px)] max-[900px]:scale-[0.23] max-[560px]:translate-x-[calc(-50%_-_215px)] max-[560px]:translate-y-[calc(-50%_+_150px)] max-[560px]:scale-[0.15]",
  "translate-x-[calc(-50%_+_245px)] translate-y-[calc(-50%_+_115px)] scale-[0.18] max-[900px]:translate-x-[calc(-50%_+_300px)] max-[900px]:translate-y-[calc(-50%_+_100px)] max-[900px]:scale-[0.23] max-[560px]:translate-x-[calc(-50%_+_215px)] max-[560px]:translate-y-[calc(-50%_+_105px)] max-[560px]:scale-[0.15]",
  "translate-x-[calc(-50%_+_245px)] translate-y-[calc(-50%_-_115px)] scale-[0.18] max-[900px]:translate-x-[calc(-50%_+_300px)] max-[900px]:translate-y-[calc(-50%_-_100px)] max-[900px]:scale-[0.23] max-[560px]:translate-x-[calc(-50%_+_215px)] max-[560px]:translate-y-[calc(-50%_-_105px)] max-[560px]:scale-[0.15]",
];

export function CockpitPanelSelector() {
  const [active, setActive] = useState(3);
  const selected = panels[active];
  const SelectedPanel = selected.component;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft")
        setActive((value) => (value - 1 + panels.length) % panels.length);
      if (event.key === "ArrowRight")
        setActive((value) => (value + 1) % panels.length);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <section
      className="relative h-full overflow-hidden border-r border-[#303633] bg-[radial-gradient(circle_at_50%_48%,#141a17_0,#0c100e_46%,#080b0a_80%)] max-[900px]:h-[560px] max-[900px]:border-r-0"
      aria-label="Selector de paneles del cockpit"
    >
      <div
        className="pointer-events-none absolute top-[11px] left-1/2 z-20 grid w-[330px] -translate-x-1/2 grid-cols-[1fr_auto] text-[#59615d]"
        aria-live="polite"
      >
        <span className="col-span-full text-[7px] text-[#823b31]">
          {selected.code}
        </span>
        <strong className="text-[11px] text-[#c8ccca] uppercase">
          {selected.name}
        </strong>
        <small className="text-[#58605c]">
          {String(active + 1).padStart(2, "0")} /{" "}
          {String(panels.length).padStart(2, "0")}
        </small>
      </div>

      <div className="absolute inset-x-0 top-[42px] bottom-[25px] [perspective:1100px]">
        <article
          className={`${panelCardClassName} z-10 -translate-x-1/2 -translate-y-1/2 scale-[0.76] opacity-100 max-[560px]:scale-[0.67]`}
          aria-label={`${selected.name}, panel activo`}
        >
          <div
            className={`${panelVisualClassName} ${selected.id === "pneumatic" ? "inset-y-[-46px]" : ""}`}
          >
            <SelectedPanel />
          </div>
        </article>

        {panels.map((panel, index) => {
          const PreviewPanel = panel.component;
          const isSelected = index === active;
          return (
            <article
              className={`${panelCardClassName} z-[3] ${previewPositionClassNames[index]} ${
                isSelected
                  ? "opacity-100 brightness-100 saturate-100 hover:opacity-100 hover:brightness-100 hover:saturate-100 focus-within:opacity-100 focus-within:brightness-100 focus-within:saturate-100"
                  : "opacity-[0.38] brightness-[0.45] saturate-[0.55] hover:opacity-[0.68] hover:brightness-[0.7] hover:saturate-[0.8] focus-within:opacity-[0.68] focus-within:brightness-[0.7] focus-within:saturate-[0.8]"
              }`}
              key={panel.id}
              aria-label={`${panel.name}, vista previa${isSelected ? ", seleccionada" : ""}`}
            >
              <button
                className="absolute inset-0 z-30 w-full cursor-pointer border-0 bg-transparent"
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Seleccionar panel ${panel.name}`}
                aria-current={isSelected ? "true" : undefined}
              />
              <div
                className={`${panelVisualClassName} ${panel.id === "pneumatic" ? "inset-y-[-46px]" : ""}`}
              >
                <PreviewPanel />
              </div>
              <div className="absolute bottom-[-24px] left-1/2 -translate-x-1/2 text-[8px] whitespace-nowrap text-[#747c78] uppercase">
                <span className="mr-2 text-[#a74635]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {panel.name}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
