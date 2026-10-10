"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const COCKPIT_WORLD_WIDTH = 2400;
export const COCKPIT_WORLD_HEIGHT = 6000;
export const COCKPIT_SVG_VIEWBOX_X = 750;
export const COCKPIT_SVG_VIEWBOX_WIDTH = 1800;
export const COCKPIT_SVG_VIEWBOX_HEIGHT = 4500;
const COCKPIT_RENDERED_SVG_HEIGHT = 6000;
export const MIN_COCKPIT_ZOOM = 0.05;
export const MAX_COCKPIT_ZOOM = 3;
export const COCKPIT_ZOOM_STEP = 0.25;

export type CockpitTransform = { x: number; y: number; scale: number };

function clampCockpitZoom(scale: number) {
  return Math.min(MAX_COCKPIT_ZOOM, Math.max(MIN_COCKPIT_ZOOM, scale));
}

function isCockpitCommand(target: Element) {
  let current: Element | null = target;

  while (current) {
    if (
      current.matches(
        "button, input, select, textarea, [role=button], [data-cockpit-command]",
      ) ||
      window.getComputedStyle(current).cursor === "pointer"
    ) {
      return true;
    }

    if (current.tagName.toLowerCase() === "foreignobject") break;
    current = current.parentElement;
  }

  return false;
}

/** Area of the cockpit SVG (in viewBox units) visible in a viewport of the given size. */
export function getVisibleSvgArea(
  transform: CockpitTransform,
  viewport: { width: number; height: number },
) {
  return {
    x:
      COCKPIT_SVG_VIEWBOX_X +
      (-transform.x / transform.scale) *
        (COCKPIT_SVG_VIEWBOX_WIDTH / COCKPIT_WORLD_WIDTH),
    y:
      (-transform.y / transform.scale) *
      (COCKPIT_SVG_VIEWBOX_HEIGHT / COCKPIT_RENDERED_SVG_HEIGHT),
    width:
      (viewport.width / transform.scale) *
      (COCKPIT_SVG_VIEWBOX_WIDTH / COCKPIT_WORLD_WIDTH),
    height:
      (viewport.height / transform.scale) *
      (COCKPIT_SVG_VIEWBOX_HEIGHT / COCKPIT_RENDERED_SVG_HEIGHT),
  };
}

/**
 * Pan (drag), zoom (wheel, buttons, pinch) and minimap navigation for the
 * cockpit canvas. Gestures that start on a cockpit control are left to it.
 */
export function useCockpitViewport() {
  const containerRef = useRef<HTMLDivElement>(null);

  const [transform, setTransform] = useState<CockpitTransform>({
    x: 0,
    y: 0,
    scale: 0.3,
  });
  const transformRef = useRef(transform);
  const transformFrameRef = useRef<number | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const isDragging = useRef(false);
  const startPan = useRef({ x: 0, y: 0 });
  const activePointers = useRef<Map<number, { clientX: number; clientY: number }>>(
    new Map(),
  );
  const pinchRef = useRef<{
    initialDistance: number;
    initialScale: number;
    pointX: number;
    pointY: number;
  } | null>(null);

  const scheduleTransform = useCallback(
    (update: (current: CockpitTransform) => CockpitTransform) => {
      transformRef.current = update(transformRef.current);

      if (transformFrameRef.current !== null) return;
      transformFrameRef.current = requestAnimationFrame(() => {
        transformFrameRef.current = null;
        setTransform(transformRef.current);
      });
    },
    [],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Center initially based on container size
    const rect = container.getBoundingClientRect();
    setViewport({ width: rect.width, height: rect.height });
    const initialScale = 0.25;
    // Keep the existing initial cockpit framing; FIT uses the complete SVG.
    const initialX = (rect.width - 2400 * initialScale) / 2;
    const initialY = (rect.height - 3600 * initialScale) / 2;
    const initialTransform = {
      x: initialX,
      y: initialY,
      scale: initialScale,
    };
    transformRef.current = initialTransform;
    setTransform(initialTransform);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setViewport({ width, height });
        }
      }
    });
    resizeObserver.observe(container);

    const handleWheel = (e: WheelEvent) => {
      // Controls inside foreignObjects own the wheel gesture (knobs, selectors,
      // etc.). Let their handler consume it without also zooming the cockpit.
      if (
        e.defaultPrevented ||
        (e.target instanceof Element && isCockpitCommand(e.target))
      ) {
        return;
      }
      e.preventDefault();

      const currentRect = container.getBoundingClientRect();
      const scaleAdjustment = e.deltaY * -0.001;
      scheduleTransform((prev) => {
        let newScale = prev.scale + scaleAdjustment;
        newScale = clampCockpitZoom(newScale);

        // Calculate mouse position relative to container
        const mouseX = e.clientX - currentRect.left;
        const mouseY = e.clientY - currentRect.top;

        // Calculate point in unscaled coordinates
        const pointX = (mouseX - prev.x) / prev.scale;
        const pointY = (mouseY - prev.y) / prev.scale;

        // Calculate new position
        const newX = mouseX - pointX * newScale;
        const newY = mouseY - pointY * newScale;

        return { x: newX, y: newY, scale: newScale };
      });
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      resizeObserver.disconnect();
      container.removeEventListener("wheel", handleWheel);
      if (transformFrameRef.current !== null) {
        cancelAnimationFrame(transformFrameRef.current);
      }
    };
  }, [scheduleTransform]);

  const zoomCockpit = (amount: number) => {
    scheduleTransform((prev) => {
      const scale = clampCockpitZoom(prev.scale + amount);
      if (scale === prev.scale) return prev;

      const anchorX = viewport.width / 2;
      const anchorY = viewport.height / 2;
      const ratio = scale / prev.scale;
      return {
        scale,
        x: anchorX - (anchorX - prev.x) * ratio,
        y: anchorY - (anchorY - prev.y) * ratio,
      };
    });
  };

  const fitCockpit = () => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const scale = Math.min(
      rect.width / COCKPIT_WORLD_WIDTH,
      rect.height / COCKPIT_WORLD_HEIGHT,
    );
    setViewport({ width: rect.width, height: rect.height });
    const nextTransform = {
      scale,
      x: (rect.width - COCKPIT_WORLD_WIDTH * scale) / 2,
      y: (rect.height - COCKPIT_WORLD_HEIGHT * scale) / 2,
    };
    transformRef.current = nextTransform;
    setTransform(nextTransform);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as Element;
    const isCommand = isCockpitCommand(target);
    if (
      (e.button !== 0 && e.button !== 1) ||
      (isCommand && activePointers.current.size === 0)
    ) {
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    activePointers.current.set(e.pointerId, {
      clientX: e.clientX,
      clientY: e.clientY,
    });
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if setPointerCapture fails on some browsers
    }

    if (activePointers.current.size === 1) {
      isDragging.current = true;
      startPan.current = {
        x: e.clientX - transformRef.current.x,
        y: e.clientY - transformRef.current.y,
      };
      pinchRef.current = null;
    } else if (activePointers.current.size >= 2) {
      const points = Array.from(activePointers.current.values());
      const p1 = points[0];
      const p2 = points[1];
      const distance = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY);
      const midX = (p1.clientX + p2.clientX) / 2;
      const midY = (p1.clientY + p2.clientY) / 2;

      const rect = container.getBoundingClientRect();
      const current = transformRef.current;
      const mouseX = midX - rect.left;
      const mouseY = midY - rect.top;

      const pointX = (mouseX - current.x) / current.scale;
      const pointY = (mouseY - current.y) / current.scale;

      pinchRef.current = {
        initialDistance: Math.max(10, distance),
        initialScale: current.scale,
        pointX,
        pointY,
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activePointers.current.has(e.pointerId)) return;
    activePointers.current.set(e.pointerId, {
      clientX: e.clientX,
      clientY: e.clientY,
    });

    const container = containerRef.current;
    if (!container) return;

    if (activePointers.current.size >= 2 && pinchRef.current) {
      const points = Array.from(activePointers.current.values());
      const p1 = points[0];
      const p2 = points[1];
      const distance = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY);
      const midX = (p1.clientX + p2.clientX) / 2;
      const midY = (p1.clientY + p2.clientY) / 2;

      const rect = container.getBoundingClientRect();
      const mouseX = midX - rect.left;
      const mouseY = midY - rect.top;

      const pinch = pinchRef.current;
      const ratio = distance / pinch.initialDistance;
      const newScale = clampCockpitZoom(pinch.initialScale * ratio);

      const newX = mouseX - pinch.pointX * newScale;
      const newY = mouseY - pinch.pointY * newScale;

      scheduleTransform(() => ({
        x: newX,
        y: newY,
        scale: newScale,
      }));
    } else if (activePointers.current.size === 1 && isDragging.current) {
      scheduleTransform((prev) => ({
        ...prev,
        x: e.clientX - startPan.current.x,
        y: e.clientY - startPan.current.y,
      }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
    }

    if (activePointers.current.size === 1) {
      const [remaining] = Array.from(activePointers.current.values());
      startPan.current = {
        x: remaining.clientX - transformRef.current.x,
        y: remaining.clientY - transformRef.current.y,
      };
      pinchRef.current = null;
    } else if (activePointers.current.size === 0) {
      isDragging.current = false;
      pinchRef.current = null;
    }
  };

  const navigateFromMinimap = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX =
      COCKPIT_SVG_VIEWBOX_X +
      ((e.clientX - rect.left) / rect.width) * COCKPIT_SVG_VIEWBOX_WIDTH;
    const svgY =
      ((e.clientY - rect.top) / rect.height) * COCKPIT_SVG_VIEWBOX_HEIGHT;
    const point = {
      x:
        (svgX - COCKPIT_SVG_VIEWBOX_X) *
        (COCKPIT_WORLD_WIDTH / COCKPIT_SVG_VIEWBOX_WIDTH),
      y: svgY * (COCKPIT_WORLD_HEIGHT / COCKPIT_SVG_VIEWBOX_HEIGHT),
    };

    scheduleTransform((prev) => ({
      ...prev,
      x: viewport.width / 2 - point.x * prev.scale,
      y: viewport.height / 2 - point.y * prev.scale,
    }));
  };

  const handleMinimapPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    navigateFromMinimap(e);
  };

  const handleMinimapPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    e.stopPropagation();
    navigateFromMinimap(e);
  };

  const finishMinimapPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    e.stopPropagation();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  return {
    containerRef,
    transform,
    transformRef,
    visibleArea: getVisibleSvgArea(transform, viewport),
    zoomCockpit,
    fitCockpit,
    containerHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerLeave: handlePointerUp,
      onPointerCancel: handlePointerUp,
    },
    minimapHandlers: {
      onPointerDown: handleMinimapPointerDown,
      onPointerMove: handleMinimapPointerMove,
      onPointerUp: finishMinimapPointer,
      onPointerCancel: finishMinimapPointer,
    },
  };
}
