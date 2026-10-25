"use client";

import { useRef, type ComponentType } from "react";
import {
  CabinAltitudeControlPanel,
  CabinAltitudePanel,
  CargoFirePanel,
  EngineStartLevers,
  EquipmentCoolingPanel,
  FireProtectionPanel,
  GlareshieldWarningPanel,
  LeftWiperPanel,
  RightWiperPanel,
  TemperaturePanel,
  WindowHeatPanel,
  WingAntiIcePanel,
} from "./aircraft-panels";
import { CockpitArtwork } from "./cockpit/cockpit-artwork";
import {
  COCKPIT_SVG_VIEWBOX_HEIGHT,
  COCKPIT_SVG_VIEWBOX_WIDTH,
  COCKPIT_SVG_VIEWBOX_X,
  COCKPIT_WORLD_HEIGHT,
  COCKPIT_WORLD_WIDTH,
  COCKPIT_ZOOM_STEP,
  getVisibleSvgArea,
  MAX_COCKPIT_ZOOM,
  MIN_COCKPIT_ZOOM,
  useCockpitViewport,
} from "./cockpit/use-cockpit-viewport";
import { PneumaticPanel } from "./pneumatic-panel";
import {
  PanelExportButton,
  renderCockpitSvgToPng,
} from "./panel-export-button";

type CockpitPanelSlot = {
  id: string;
  Panel: ComponentType;
  /** Slot in the cockpit artwork (SVG units). */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Size the panel is laid out at, scaled down to fit the slot when needed. */
  panelWidth: number;
  panelHeight: number;
  scale?: number;
};

function CaptainWarningPanel() {
  return <GlareshieldWarningPanel side="capt" />;
}

function FirstOfficerWarningPanel() {
  return <GlareshieldWarningPanel side="fo" />;
}

// Interactive panels placed over the cockpit artwork. The minimap highlights
// the same slots.
const COCKPIT_PANELS: CockpitPanelSlot[] = [
  // Window & Probe Heat Panel in svg_11 (Left of Voice Recorder / Air Temp)
  { id: "window-heat", Panel: WindowHeatPanel, x: 1760, y: 882, width: 330, height: 339, panelWidth: 330, panelHeight: 339 },
  // Wing & Engine Anti-Ice Panel in svg_14 (Below Window Heat)
  { id: "wing-anti-ice", Panel: WingAntiIcePanel, x: 1760, y: 1225, width: 330, height: 191, panelWidth: 330, panelHeight: 191 },
  // Temperature Panel in svg_13 (Top Right)
  { id: "temperature", Panel: TemperaturePanel, x: 2094, y: 965, width: 330, height: 342, panelWidth: 467, panelHeight: 485, scale: 0.7 },
  // Pneumatic Panel in svg_15 (Middle Right)
  { id: "pneumatic", Panel: PneumaticPanel, x: 2097, y: 1311, width: 324, height: 467, panelWidth: 400, panelHeight: 550, scale: 0.88 },
  // Cabin Altitude Control Panel in svg_24 (Bottom Right)
  { id: "cabin-altitude-control", Panel: CabinAltitudeControlPanel, x: 2094, y: 1782, width: 330, height: 436, panelWidth: 330, panelHeight: 436 },
  // Cabin Altitude Panel in svg_28 (Left of Alt Control)
  { id: "cabin-altitude", Panel: CabinAltitudePanel, x: 1760, y: 1880, width: 330, height: 338, panelWidth: 330, panelHeight: 338 },
  // Equipment Cooling Panel in svg_16 (Small middle square)
  { id: "equipment-cooling", Panel: EquipmentCoolingPanel, x: 1616, y: 1447, width: 140, height: 160, panelWidth: 345, panelHeight: 394, scale: 0.4 },
  // Left Windshield Wiper Panel (Bottom-right corner of adjacent left panel svg_19)
  { id: "left-wiper", Panel: LeftWiperPanel, x: 1472, y: 2066, width: 140, height: 152, panelWidth: 140, panelHeight: 152 },
  // Right Windshield Wiper Panel (Fitted into tall elongated panel svg_22)
  { id: "right-wiper", Panel: RightWiperPanel, x: 1616, y: 2066, width: 140, height: 152, panelWidth: 140, panelHeight: 152 },
  // Master FIRE WARN / MASTER CAUTION and system annunciators on the glareshield wings
  { id: "warning-capt", Panel: CaptainWarningPanel, x: 482, y: 2540, width: 256, height: 77, panelWidth: 512, panelHeight: 154, scale: 0.5 },
  { id: "warning-fo", Panel: FirstOfficerWarningPanel, x: 2626, y: 2540, width: 256, height: 77, panelWidth: 512, panelHeight: 154, scale: 0.5 },
  // Engine start levers below the thrust levers, between the parking brake and the stab trim cutout switches
  { id: "start-levers", Panel: EngineStartLevers, x: 1624, y: 4250, width: 116, height: 164, panelWidth: 145, panelHeight: 205, scale: 0.8 },
  // Overheat/fire protection panel at the top of the aft pedestal
  { id: "fire-protection", Panel: FireProtectionPanel, x: 1375, y: 4417, width: 614, height: 164, panelWidth: 768, panelHeight: 205, scale: 0.8 },
  // Cargo fire panel, center column of the aft pedestal
  { id: "cargo-fire", Panel: CargoFirePanel, x: 1519, y: 4585, width: 326, height: 131, panelWidth: 408, panelHeight: 164, scale: 0.8 },
];

export function CockpitView() {
  const {
    containerRef,
    transform,
    transformRef,
    visibleArea,
    zoomCockpit,
    fitCockpit,
    containerHandlers,
    minimapHandlers,
  } = useCockpitViewport();
  const cockpitSvgRef = useRef<SVGSVGElement>(null);

  return (
    <div
      ref={containerRef}
      className="relative size-full select-none overflow-hidden bg-sim-bg bg-[linear-gradient(var(--color-sim-grid)_1px,transparent_1px),linear-gradient(90deg,var(--color-sim-grid)_1px,transparent_1px)] bg-size-[20px_20px] cursor-grab active:cursor-grabbing touch-none"
      {...containerHandlers}
    >
      <PanelExportButton
        panelRef={containerRef}
        fileName="cockpit-panel.png"
        label="panel COCKPIT"
        className="top-2 right-2.5"
        createPng={() => {
          const svg = cockpitSvgRef.current;
          const container = containerRef.current;
          if (!svg || !container) {
            return Promise.reject(new Error("Cockpit no disponible"));
          }

          const rect = container.getBoundingClientRect();
          const size = { width: rect.width, height: rect.height };
          return renderCockpitSvgToPng(
            svg,
            getVisibleSvgArea(transformRef.current, size),
            size,
          );
        }}
      />
      <div
        className="absolute origin-top-left flex flex-col items-center contain-[layout_paint]"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          width: `${COCKPIT_WORLD_WIDTH}px`,
          height: `${COCKPIT_WORLD_HEIGHT}px`,
        }}
      >
        <svg
          ref={cockpitSvgRef}
          viewBox={`${COCKPIT_SVG_VIEWBOX_X} 0 ${COCKPIT_SVG_VIEWBOX_WIDTH} ${COCKPIT_SVG_VIEWBOX_HEIGHT}`}
          width={COCKPIT_WORLD_WIDTH}
          height={COCKPIT_WORLD_HEIGHT}
          style={{ pointerEvents: "none" }}
        >
          <g id="cockpit-artwork" style={{ pointerEvents: "auto" }}>
            <CockpitArtwork />

            {COCKPIT_PANELS.map(
              ({ id, Panel, x, y, width, height, panelWidth, panelHeight, scale }) => (
                <foreignObject key={id} x={x} y={y} width={width} height={height}>
                  <div className="w-full h-full flex items-center justify-center">
                    <div
                      style={{
                        width: `${panelWidth}px`,
                        height: `${panelHeight}px`,
                        ...(scale && { transform: `scale(${scale})` }),
                      }}
                    >
                      <Panel />
                    </div>
                  </div>
                </foreignObject>
              ),
            )}
          </g>
        </svg>
      </div>

      <div
        data-export-exclude
        className="absolute bottom-2.5 left-2.5 z-30 w-36 border border-sim-border bg-sim-surface shadow-xl max-[560px]:w-28"
      >
        <div className="p-1.5">
          <svg
            className="block aspect-56/95 w-full touch-none cursor-crosshair bg-sim-surface"
            viewBox={`${COCKPIT_SVG_VIEWBOX_X} 0 ${COCKPIT_SVG_VIEWBOX_WIDTH} ${COCKPIT_SVG_VIEWBOX_HEIGHT}`}
            role="img"
            aria-label="Minimapa interactivo del cockpit"
            {...minimapHandlers}
          >
            <use href="#cockpit-artwork" />
            {COCKPIT_PANELS.map(({ id, x, y, width, height }) => (
              <rect
                key={id}
                className="pointer-events-none fill-sim-accent/15 stroke-sim-accent/50"
                x={x}
                y={y}
                width={width}
                height={height}
                strokeWidth="10"
                rx="12"
              />
            ))}
            <rect
              className="fill-sim-accent/10 stroke-sim-accent"
              x={visibleArea.x}
              y={visibleArea.y}
              width={visibleArea.width}
              height={visibleArea.height}
              strokeWidth="12"
            />
          </svg>
        </div>
        <div
          className="flex w-full items-center border-t border-sim-border text-sim-text-muted"
          aria-label="Controles de zoom del cockpit"
        >
          <button
            className="size-7 shrink-0 cursor-pointer border-r border-sim-border bg-transparent text-sm hover:bg-sim-bg hover:text-sim-text-strong disabled:cursor-default disabled:opacity-30"
            type="button"
            onClick={() => zoomCockpit(-COCKPIT_ZOOM_STEP)}
            disabled={transform.scale <= MIN_COCKPIT_ZOOM}
            aria-label="Alejar cockpit"
          >
            −
          </button>
          <output
            className="min-w-0 flex-1 text-center text-[8px] tabular-nums"
            aria-live="polite"
          >
            {Math.round((transform.scale / MIN_COCKPIT_ZOOM) * 100)}%
          </output>
          <button
            className="size-7 shrink-0 cursor-pointer border-l border-sim-border bg-transparent text-sm hover:bg-sim-bg hover:text-sim-text-strong disabled:cursor-default disabled:opacity-30"
            type="button"
            onClick={() => zoomCockpit(COCKPIT_ZOOM_STEP)}
            disabled={transform.scale >= MAX_COCKPIT_ZOOM}
            aria-label="Acercar cockpit"
          >
            +
          </button>
          <button
            className="h-7 shrink-0 cursor-pointer border-l border-sim-border bg-transparent px-1.5 text-[7px] tracking-wider hover:bg-sim-bg hover:text-sim-text-strong"
            type="button"
            onClick={fitCockpit}
            aria-label="Restablecer vista completa del cockpit"
          >
            FIT
          </button>
        </div>
      </div>
    </div>
  );
}

