"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import type { P } from "./plan-view-glyphs";

const POPOVER_SCALE = 0.85;
const POPOVER_GAP = 14;

export type PlanView = { scale: number; x: number; y: number };

/**
 * A cockpit-style panel opened from a hatch in the plan view (APU ground
 * control panel, fueling station, NGS indicator): an HTML overlay kept beside
 * its anchor as the view pans and zooms. Closes with × or Esc.
 */
export function PlanViewPopover({
  svgRef,
  view,
  anchor,
  anchorHalfWidth,
  title,
  location,
  ariaLabel,
  closeLabel,
  size,
  onClose,
  children,
}: {
  svgRef: RefObject<SVGSVGElement | null>;
  view: PlanView;
  /** Hatch centre in artboard units. */
  anchor: P;
  anchorHalfWidth: number;
  title: string;
  location: string;
  ariaLabel: string;
  closeLabel: string;
  /** Intrinsic panel size, shown scaled down. */
  size: { width: number; height: number };
  onClose: () => void;
  children: ReactNode;
}) {
  const boxRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const place = () => {
      const svg = svgRef.current;
      const box = boxRef.current;
      const host = box?.offsetParent;
      const matrix = svg?.getScreenCTM();
      if (!svg || !box || !host || !matrix) return;
      // Hatch in the svg's user space, then on screen
      const ux = view.x + (anchor[0] + anchorHalfWidth) * view.scale;
      const uy = view.y + anchor[1] * view.scale;
      const sx = matrix.a * ux + matrix.c * uy + matrix.e;
      const sy = matrix.b * ux + matrix.d * uy + matrix.f;
      const hostRect = host.getBoundingClientRect();
      const width = box.offsetWidth;
      const height = box.offsetHeight;
      let left = sx - hostRect.left + POPOVER_GAP;
      // Not enough room on the right: open on the left of the hatch
      if (left + width > hostRect.width - 8) {
        left = sx - hostRect.left - POPOVER_GAP - width - anchorHalfWidth * 2 * view.scale;
      }
      const top = sy - hostRect.top - height / 2;
      box.style.left = `${Math.max(8, Math.min(left, hostRect.width - width - 8))}px`;
      box.style.top = `${Math.max(32, Math.min(top, hostRect.height - height - 48))}px`;
      box.style.visibility = "visible";
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [svgRef, view, anchor, anchorHalfWidth]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      ref={boxRef}
      data-export-exclude
      role="dialog"
      aria-label={ariaLabel}
      className="invisible absolute z-40 border border-sim-border bg-sim-surface shadow-2xl"
    >
      <div className="flex h-6 items-center justify-between gap-3 border-b border-sim-border pr-0.5 pl-2 text-[7px] tracking-[0.14em] text-sim-text-muted">
        <span>
          {title} <span className="text-sim-text-label">· {location}</span>
        </span>
        <button
          type="button"
          onClick={onClose}
          className="flex size-5 cursor-pointer items-center justify-center text-sm leading-none hover:bg-sim-bg hover:text-sim-text-strong"
          aria-label={closeLabel}
          title="Cerrar (Esc)"
        >
          ×
        </button>
      </div>
      <div
        className="relative overflow-hidden"
        style={{ width: size.width * POPOVER_SCALE, height: size.height * POPOVER_SCALE }}
      >
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{ width: size.width, height: size.height, transform: `scale(${POPOVER_SCALE})` }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
