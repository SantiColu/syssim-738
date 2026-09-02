"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { MAIN_PNEUMATIC_SYSTEM } from "../simulation/pneumatic/main-network";
import { solvePneumaticNetwork } from "../simulation/pneumatic/solve-network";
import { PneumaticNetworkLayer } from "./pneumatic-network-layer";

const ARTBOARD_WIDTH = 760;
const ARTBOARD_HEIGHT = 580;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const BUTTON_ZOOM_STEP = 0.5;
const WHEEL_ZOOM_STEP = 0.25;

type ViewState = {
  scale: number;
  x: number;
  y: number;
};

type DragState = {
  pointerId: number;
  originX: number;
  originY: number;
  viewX: number;
  viewY: number;
};

const INITIAL_VIEW: ViewState = { scale: 1, x: 0, y: 0 };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function constrainView(view: ViewState): ViewState {
  return {
    scale: view.scale,
    x: clamp(view.x, ARTBOARD_WIDTH * (1 - view.scale), 0),
    y: clamp(view.y, ARTBOARD_HEIGHT * (1 - view.scale), 0),
  };
}

function getSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number) {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const matrix = svg.getScreenCTM();

  if (!matrix) return { x: ARTBOARD_WIDTH / 2, y: ARTBOARD_HEIGHT / 2 };

  const transformed = point.matrixTransform(matrix.inverse());
  return { x: transformed.x, y: transformed.y };
}

export function PneumaticSchematic() {
  const [view, setView] = useState<ViewState>(INITIAL_VIEW);
  const [isDragging, setIsDragging] = useState(false);
  const solution = useMemo(
    () =>
      solvePneumaticNetwork(
        MAIN_PNEUMATIC_SYSTEM.network,
        MAIN_PNEUMATIC_SYSTEM.initialState,
      ),
    [],
  );
  const mainSvgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const minimapPointerRef = useRef<number | null>(null);

  const changeZoom = useCallback(
    (amount: number, anchor?: { x: number; y: number }) => {
      setView((current) => {
        const scale = clamp(current.scale + amount, MIN_ZOOM, MAX_ZOOM);
        if (scale === current.scale) return current;

        const zoomAnchor = anchor ?? {
          x: ARTBOARD_WIDTH / 2,
          y: ARTBOARD_HEIGHT / 2,
        };
        const ratio = scale / current.scale;

        return constrainView({
          scale,
          x: zoomAnchor.x - (zoomAnchor.x - current.x) * ratio,
          y: zoomAnchor.y - (zoomAnchor.y - current.y) * ratio,
        });
      });
    },
    [],
  );

  useEffect(() => {
    const svg = mainSvgRef.current;
    if (!svg) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const anchor = getSvgPoint(svg, event.clientX, event.clientY);
      changeZoom(event.deltaY < 0 ? WHEEL_ZOOM_STEP : -WHEEL_ZOOM_STEP, anchor);
    };

    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => svg.removeEventListener("wheel", handleWheel);
  }, [changeZoom]);

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;

    const point = getSvgPoint(
      event.currentTarget,
      event.clientX,
      event.clientY,
    );
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      originX: point.x,
      originY: point.y,
      viewX: view.x,
      viewY: view.y,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const point = getSvgPoint(
      event.currentTarget,
      event.clientX,
      event.clientY,
    );
    setView((current) =>
      constrainView({
        scale: current.scale,
        x: drag.viewX + point.x - drag.originX,
        y: drag.viewY + point.y - drag.originY,
      }),
    );
  };

  const finishDragging = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setIsDragging(false);
  };

  const navigateFromMinimap = (event: ReactPointerEvent<SVGSVGElement>) => {
    const point = getSvgPoint(
      event.currentTarget,
      event.clientX,
      event.clientY,
    );
    setView((current) =>
      constrainView({
        ...current,
        x: ARTBOARD_WIDTH / 2 - point.x * current.scale,
        y: ARTBOARD_HEIGHT / 2 - point.y * current.scale,
      }),
    );
  };

  const handleMinimapPointerDown = (
    event: ReactPointerEvent<SVGSVGElement>,
  ) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    minimapPointerRef.current = event.pointerId;
    navigateFromMinimap(event);
  };

  const handleMinimapPointerMove = (
    event: ReactPointerEvent<SVGSVGElement>,
  ) => {
    if (minimapPointerRef.current !== event.pointerId) return;
    navigateFromMinimap(event);
  };

  const finishMinimapDragging = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (minimapPointerRef.current === event.pointerId) {
      minimapPointerRef.current = null;
    }
  };

  const visibleArea = {
    x: -view.x / view.scale,
    y: -view.y / view.scale,
    width: ARTBOARD_WIDTH / view.scale,
    height: ARTBOARD_HEIGHT / view.scale,
  };

  return (
    <section
      className="relative size-full overflow-hidden"
      aria-label="Vista superior del avión"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex h-6 justify-between px-2.5 py-2 text-[7px] text-sim-text-label">
        <span>TOP VIEW / SCHEMATIC</span>
      </div>
      <svg
        ref={mainSvgRef}
        className={`block h-full w-full touch-none select-none pb-9 max-[560px]:w-180 max-[560px]:-translate-x-26.25 ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        viewBox="0 0 760 580"
        role="img"
        aria-label="Vista técnica del Boeing 737-800 desde arriba"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDragging}
        onPointerCancel={finishDragging}
      >
        <defs>
          <path
            id="boeing-737-800-outline"
            d="M380.7 30 L382.5 30.7 L383.9 32.1 L385.4 34.5 L388 40.7 L391.9 51.9 L395.6 64.4 L398.6 76.3 L401 87.8 L402.8 98.5 L404.1 110.8 L404.9 125.4 L405 221.5 L406.7 224 L409.5 227.6 L413.7 231.6 L431.6 244.6 L431.7 243.4 L429.9 231.9 L429.6 224.6 L430.5 214.3 L431.1 211.8 L432.3 209 L432.9 208.4 L433.9 208.1 L438.4 207.8 L450.6 207.6 L455 207.8 L456.6 208.2 L457.9 210.3 L459.6 217 L460.2 222.8 L460.2 231.3 L458.1 248 L456.1 258.3 L604.9 338.2 L602.9 337.3 L602.5 337.4 L602.5 337.9 L604.3 341.6 L605.8 346.8 L607.4 354.9 L608.3 361.7 L606.8 361.9 L606.7 360.7 L526.2 333.9 L518.4 331.3 L503.1 327.1 L502.3 327.3 L502.2 330.7 L501.2 335.5 L499.7 339.5 L499.1 339.5 L497.4 334 L496.5 326.4 L496.1 325.2 L469.4 317.9 L468.5 318.1 L468.2 321.8 L467.3 325.8 L465.8 330.1 L465.2 330.3 L463.3 323.7 L462.6 316.3 L447.7 311.9 L439 311.9 L438.3 316.4 L437.4 319.4 L436.9 319.8 L434.5 315.1 L433.5 311.9 L405.2 311.8 L405 405.2 L404.1 429.7 L402.8 445.3 L400.6 462.2 L398.3 474.5 L394.6 489.3 L474.8 544.6 L475.4 546.5 L475.2 555 L384.2 531.5 L383.1 531.8 L381.5 535 L381 542.8 L380 550.7 L379 543.7 L378.5 535.2 L376.7 531.6 L375.8 531.5 L284.8 555 L284.5 547.5 L284.8 545.2 L285.4 544.4 L365.2 489.4 L361.4 473.5 L358.8 458.7 L357.1 444.6 L355.6 425.9 L355 409.6 L355 311.9 L326.4 311.9 L325.3 315.2 L322.9 319.8 L322.6 319.7 L321.6 316.1 L320.8 311.9 L312.2 311.9 L297.4 316.1 L296.8 322.5 L295.7 327.6 L294.6 330.3 L293.9 329.5 L292.7 326.1 L291.6 321.3 L291.5 317.9 L291 317.8 L263.6 325.4 L262.9 332.1 L260.8 339.5 L260.2 339.4 L259.1 336.7 L258 332.1 L257.5 327.3 L256.8 327.1 L241 331.5 L153.6 360.4 L153.2 361.9 L151.7 361.7 L151.7 359.9 L154.2 346.5 L155.9 341 L157.5 337.7 L157.1 337.3 L154.8 338.3 L303.7 258.4 L301.2 243.4 L299.7 229.7 L299.8 221.8 L300.6 215.7 L301.8 210.9 L302.7 209 L303.6 208.1 L309.4 207.6 L321.4 207.8 L326.1 208.1 L327.2 208.5 L327.8 209.3 L329.3 213.9 L330.2 221.9 L330.1 231 L328.1 243.8 L328.3 244.6 L328.9 244.4 L345.9 231.9 L349.6 228.5 L353.5 223.7 L355 221.3 L355 128.9 L355.6 113.7 L356.9 100.2 L359 87.4 L361.8 74.1 L365.8 58.9 L370.5 44.6 L374 35.5 L375.8 32.4 L378.2 30.3 Z"
          />
          <clipPath id="boeing-737-800-clip">
            <use href="#boeing-737-800-outline" />
          </clipPath>
        </defs>
        <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
          <use
            className="fill-sim-surface"
            href="#boeing-737-800-outline"
          />
          <image
            className="opacity-[0.68]"
            href="/boeing-737-800-details.svg"
            width="760"
            height="580"
            clipPath="url(#boeing-737-800-clip)"
            aria-hidden="true"
          />
          <PneumaticNetworkLayer
            network={MAIN_PNEUMATIC_SYSTEM.network}
            layout={MAIN_PNEUMATIC_SYSTEM.layout}
            solution={solution}
          />
          <use
            className="fill-none stroke-sim-text-muted [stroke-linecap:round] [stroke-linejoin:round] stroke-1"
            href="#boeing-737-800-outline"
          />
        </g>
      </svg>

      <div className="absolute bottom-11 left-2.5 z-20 w-36 border border-sim-border bg-sim-surface shadow-xl max-[560px]:w-28">
        <div className="p-1.5">
          <svg
            className="block aspect-38/29 w-full touch-none cursor-crosshair bg-sim-surface"
            viewBox="0 0 760 580"
            role="img"
            aria-label="Minimapa interactivo de la vista del avión"
            onPointerDown={handleMinimapPointerDown}
            onPointerMove={handleMinimapPointerMove}
            onPointerUp={finishMinimapDragging}
            onPointerCancel={finishMinimapDragging}
          >
            <use
              className="fill-cockpit-fill-base stroke-cockpit-stroke"
              href="#boeing-737-800-outline"
              strokeWidth="5"
            />
            <rect
              className="fill-sim-accent/10 stroke-sim-accent"
              x={visibleArea.x}
              y={visibleArea.y}
              width={visibleArea.width}
              height={visibleArea.height}
              strokeWidth="5"
            />
          </svg>
        </div>
        <div
          className="flex w-full items-center border-t border-sim-border text-sim-text-muted"
          aria-label="Controles de zoom"
        >
          <button
            className="size-7 shrink-0 cursor-pointer border-r border-sim-border bg-transparent text-sm hover:bg-sim-bg hover:text-sim-text-strong disabled:cursor-default disabled:opacity-30"
            type="button"
            onClick={() => changeZoom(-BUTTON_ZOOM_STEP)}
            disabled={view.scale === MIN_ZOOM}
            aria-label="Alejar"
          >
            −
          </button>
          <output
            className="min-w-0 flex-1 text-center text-[8px] tabular-nums"
            aria-live="polite"
          >
            {Math.round(view.scale * 100)}%
          </output>
          <button
            className="size-7 shrink-0 cursor-pointer border-l border-sim-border bg-transparent text-sm hover:bg-sim-bg hover:text-sim-text-strong disabled:cursor-default disabled:opacity-30"
            type="button"
            onClick={() => changeZoom(BUTTON_ZOOM_STEP)}
            disabled={view.scale === MAX_ZOOM}
            aria-label="Acercar"
          >
            +
          </button>
          <button
            className="h-7 shrink-0 cursor-pointer border-l border-sim-border bg-transparent px-1.5 text-[7px] tracking-wider hover:bg-sim-bg hover:text-sim-text-strong disabled:cursor-default disabled:opacity-30"
            type="button"
            onClick={() => setView(INITIAL_VIEW)}
            disabled={
              view.scale === INITIAL_VIEW.scale &&
              view.x === INITIAL_VIEW.x &&
              view.y === INITIAL_VIEW.y
            }
            aria-label="Restablecer vista completa"
          >
            FIT
          </button>
        </div>
      </div>

      <div className="absolute right-2.5 bottom-1.75 left-2.5 z-30 h-7 border border-sim-border bg-sim-surface px-3 py-2 text-sim-text-muted">
        <span className="mr-2 ml-3.25 inline-block w-5.5 border-t-2 border-sim-cyan align-middle" />{" "}
        ACTIVE FLOW{" "}
        <span className="mr-2 ml-3.25 inline-block w-5.5 border-t border-dashed border-sim-line-isolated align-middle" />{" "}
        ISOLATED{" "}
        <span className="mr-2 ml-3.25 inline-block text-[15px] leading-1 text-sim-green align-middle">
          ⌀
        </span>{" "}
        OPEN{" "}
        <span className="mr-2 ml-3.25 inline-block text-[13px] leading-1 text-sim-text-muted align-middle">
          ◉
        </span>{" "}
        CLOSED
      </div>
    </section>
  );
}
